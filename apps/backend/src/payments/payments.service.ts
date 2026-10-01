import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PaymentProvider,
  PaymentMode,
  PaymentStatus,
  PaymentTransactionStatus,
  Prisma,
} from '@prisma/client';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

type RegistrationForPayment = Prisma.EventRegistrationGetPayload<{
  include: { event: true; athlete: { select: { fullName: true } } };
}>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SystemSettingsService,
  ) {}

  async createCheckout(dto: CreateCheckoutDto, request: Request) {
    if (!await this.settings.enabled('paymentsEnabled')) {
      throw new ServiceUnavailableException('Thanh toán trực tuyến đang tạm tắt');
    }
    let registration = await this.prisma.eventRegistration.findUnique({
      where: { ticketCode: dto.ticketCode.trim().toUpperCase() },
      include: { event: true, athlete: { select: { fullName: true } } },
    });
    if (!registration) throw new NotFoundException('Không tìm thấy lượt đăng ký');
    if (
      registration.paymentStatus === PaymentStatus.PENDING
      && registration.feeAmount === 0
      && registration.event.paymentMode !== PaymentMode.FREE
      && registration.event.registrationFee > 0
    ) {
      await this.prisma.eventRegistration.update({
        where: { id: registration.id },
        data: { feeAmount: registration.event.registrationFee, currency: registration.event.registrationCurrency },
      });
      registration = {
        ...registration,
        feeAmount: registration.event.registrationFee,
        currency: registration.event.registrationCurrency,
      };
    }
    if (registration.paymentStatus === PaymentStatus.PAID) {
      return {
        status: PaymentTransactionStatus.PAID,
        paymentStatus: PaymentStatus.PAID,
        ticketCode: registration.ticketCode,
      };
    }
    if (registration.paymentStatus === PaymentStatus.NOT_REQUIRED || registration.feeAmount <= 0) {
      throw new BadRequestException('Hồ sơ này không cần thanh toán');
    }
    if (registration.currency !== 'VND') {
      throw new BadRequestException('Các cổng thanh toán hiện chỉ hỗ trợ giao dịch VND');
    }
    if (dto.provider === PaymentProvider.MOMO && registration.feeAmount < 1_000) {
      throw new BadRequestException('MoMo yêu cầu số tiền thanh toán tối thiểu 1.000 VND');
    }
    const allowedProviders = registration.event.paymentProviders.length
      ? registration.event.paymentProviders
      : registration.event.paymentMode === PaymentMode.MANUAL
        ? [PaymentProvider.BANK_QR]
        : [];
    if (!allowedProviders.includes(dto.provider)) {
      throw new BadRequestException('Phương thức thanh toán chưa được bật cho sự kiện này');
    }

    const reusable = await this.prisma.paymentTransaction.findFirst({
      where: {
        registrationId: registration.id,
        provider: dto.provider,
        status: PaymentTransactionStatus.PENDING,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (reusable && (reusable.checkoutUrl || reusable.qrCodeUrl)) {
      return {
        ...this.publicTransaction(reusable, registration.ticketCode),
        ...(reusable.provider === PaymentProvider.BANK_QR ? {
          bank: {
            bankCode: registration.event.bankCode,
            accountNumber: registration.event.bankAccountNumber,
            accountName: registration.event.bankAccountName,
          },
          transferContent: reusable.orderId,
        } : {}),
      };
    }

    if (dto.provider === PaymentProvider.BANK_QR) {
      await this.requireFeature('bankQrEnabled', 'Chuyển khoản VietQR');
      return this.createBankQr(registration);
    }
    if (dto.provider === PaymentProvider.MOMO) {
      await this.requireFeature('momoEnabled', 'MoMo');
      return this.createMomo(registration);
    }
    await this.requireFeature('vnpayEnabled', dto.provider === PaymentProvider.VISA ? 'Visa/Mastercard' : 'VNPAY');
    return this.createVnpay(registration, dto.provider, request);
  }

  async configuration() {
    const settings = await this.settings.get();
    return {
      enabled: {
        MOMO: settings.effective.momoEnabled,
        VNPAY: settings.effective.vnpayEnabled,
        VISA: settings.effective.vnpayEnabled,
        BANK_QR: settings.effective.bankQrEnabled,
      },
      configured: {
        MOMO: settings.configured.momoEnabled,
        VNPAY: settings.configured.vnpayEnabled,
        VISA: settings.configured.vnpayEnabled,
        BANK_QR: settings.configured.bankQrEnabled,
      },
      paymentsEnabled: settings.effective.paymentsEnabled,
      environment: settings.environment,
    };
  }

  async getTransaction(orderId: string) {
    let transaction = await this.prisma.paymentTransaction.findUnique({
      where: { orderId },
      include: { registration: { select: { ticketCode: true, paymentStatus: true } } },
    });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');
    if (
      transaction.status === PaymentTransactionStatus.PENDING
      && transaction.expiresAt
      && transaction.expiresAt <= new Date()
    ) {
      transaction = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: PaymentTransactionStatus.EXPIRED },
        include: { registration: { select: { ticketCode: true, paymentStatus: true } } },
      });
    }
    return this.publicTransaction(transaction, transaction.registration.ticketCode);
  }

  async handleVnpayIpn(query: Record<string, string>) {
    if (!this.verifyVnpay(query)) return { RspCode: '97', Message: 'Invalid signature' };
    const orderId = String(query.vnp_TxnRef || '');
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { orderId } });
    if (!transaction) return { RspCode: '01', Message: 'Order not found' };
    if (![PaymentProvider.VNPAY, PaymentProvider.VISA].includes(transaction.provider as 'VNPAY' | 'VISA')) {
      return { RspCode: '01', Message: 'Order provider mismatch' };
    }
    if (Number(query.vnp_Amount) !== transaction.amount * 100) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }
    if (transaction.status === PaymentTransactionStatus.PAID) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const successful = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
    if (successful) {
      await this.markPaid(transaction.id, String(query.vnp_TransactionNo || ''), query);
    } else {
      await this.markFailed(transaction.id, `VNPAY ${query.vnp_ResponseCode || 'unknown'}`, query);
    }
    return { RspCode: '00', Message: 'Confirm success' };
  }

  async handleVnpayReturn(query: Record<string, string>) {
    const frontend = this.frontendUrl();
    const orderId = String(query.vnp_TxnRef || '');
    const verified = this.verifyVnpay(query);
    const params = new URLSearchParams({
      provider: 'VNPAY',
      orderId,
      code: String(query.vnp_ResponseCode || ''),
      verified: String(verified),
    });
    return `${frontend}/payments/result?${params.toString()}`;
  }

  async handleMomoIpn(payload: Record<string, unknown>) {
    if (!this.verifyMomo(payload)) throw new BadRequestException('Chữ ký MoMo không hợp lệ');
    const orderId = String(payload.orderId || '');
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { orderId } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch MoMo');
    if (transaction.provider !== PaymentProvider.MOMO) {
      throw new BadRequestException('Giao dịch không thuộc cổng MoMo');
    }
    if (Number(payload.amount) !== transaction.amount) throw new BadRequestException('Số tiền MoMo không hợp lệ');
    if (transaction.status === PaymentTransactionStatus.PAID) return;
    if (Number(payload.resultCode) === 0) {
      await this.markPaid(transaction.id, String(payload.transId || ''), payload);
    } else {
      await this.markFailed(transaction.id, String(payload.message || 'MoMo payment failed'), payload);
    }
  }

  async manualConfirm(orderId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({ where: { orderId } });
    if (!transaction) throw new NotFoundException('Không tìm thấy giao dịch');
    if (transaction.provider !== PaymentProvider.BANK_QR) {
      throw new BadRequestException('Chỉ chuyển khoản QR mới được xác nhận thủ công');
    }
    if (transaction.status !== PaymentTransactionStatus.PAID) {
      await this.markPaid(transaction.id, `MANUAL-${Date.now()}`, { confirmedByCms: true });
    }
    return this.getTransaction(orderId);
  }

  private async createBankQr(registration: RegistrationForPayment) {
    const { bankCode, bankAccountNumber, bankAccountName } = registration.event;
    if (!bankCode || !bankAccountNumber || !bankAccountName) {
      throw new BadRequestException('Sự kiện chưa cấu hình đủ tài khoản nhận chuyển khoản');
    }
    const orderId = this.orderId();
    const params = new URLSearchParams({
      amount: String(registration.feeAmount),
      addInfo: orderId,
      accountName: bankAccountName,
    });
    const qrCodeUrl = `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(bankAccountNumber)}-compact2.png?${params.toString()}`;
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        registrationId: registration.id,
        provider: PaymentProvider.BANK_QR,
        orderId,
        amount: registration.feeAmount,
        currency: registration.currency,
        qrCodeUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return {
      ...this.publicTransaction(transaction, registration.ticketCode),
      bank: { bankCode, accountNumber: bankAccountNumber, accountName: bankAccountName },
      transferContent: orderId,
    };
  }

  private async createVnpay(
    registration: RegistrationForPayment,
    provider: Extract<PaymentProvider, 'VNPAY' | 'VISA'>,
    request: Request,
  ) {
    const tmnCode = this.requireEnv('VNPAY_TMN_CODE');
    const secret = this.requireEnv('VNPAY_HASH_SECRET');
    const orderId = this.orderId();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 15 * 60 * 1000);
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(registration.feeAmount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan ve ${registration.ticketCode}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: `${this.backendUrl()}/api/payments/vnpay/return`,
      vnp_IpAddr: this.clientIp(request),
      vnp_CreateDate: this.vietnameseTimestamp(createdAt),
      vnp_ExpireDate: this.vietnameseTimestamp(expiresAt),
      ...(provider === PaymentProvider.VISA ? { vnp_BankCode: 'INTCARD' } : {}),
    };
    const signed = this.vnpayQuery(params);
    const signature = createHmac('sha512', secret).update(signed, 'utf8').digest('hex');
    const paymentUrl = `${this.gatewayUrl('VNPAY_PAYMENT_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')}?${signed}&vnp_SecureHash=${signature}`;
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        registrationId: registration.id,
        provider,
        orderId,
        amount: registration.feeAmount,
        currency: registration.currency,
        checkoutUrl: paymentUrl,
        requestPayload: params,
        expiresAt,
      },
    });
    return this.publicTransaction(transaction, registration.ticketCode);
  }

  private async createMomo(registration: RegistrationForPayment) {
    const partnerCode = this.requireEnv('MOMO_PARTNER_CODE');
    const accessKey = this.requireEnv('MOMO_ACCESS_KEY');
    const secretKey = this.requireEnv('MOMO_SECRET_KEY');
    const orderId = this.orderId();
    const requestId = orderId;
    const redirectUrl = `${this.frontendUrl()}/payments/result?provider=MOMO&orderId=${encodeURIComponent(orderId)}`;
    const ipnUrl = `${this.backendUrl()}/api/payments/momo/ipn`;
    const orderInfo = `Thanh toan ve ${registration.ticketCode}`;
    const extraData = Buffer.from(JSON.stringify({ ticketCode: registration.ticketCode })).toString('base64');
    const requestType = 'captureWallet';
    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${registration.feeAmount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');
    const signature = createHmac('sha256', secretKey).update(rawSignature, 'utf8').digest('hex');
    const payload = {
      partnerCode,
      partnerName: process.env.MOMO_PARTNER_NAME || 'SportData',
      storeId: process.env.MOMO_STORE_ID || 'SportData',
      requestId,
      amount: registration.feeAmount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        registrationId: registration.id,
        provider: PaymentProvider.MOMO,
        orderId,
        amount: registration.feeAmount,
        currency: registration.currency,
        requestPayload: payload,
        expiresAt,
      },
    });

    try {
      const response = await fetch(`${this.gatewayUrl('MOMO_API_URL', 'https://test-payment.momo.vn')}/v2/gateway/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json() as Record<string, unknown>;
      const checkoutUrl = String(result.payUrl || result.shortLink || '');
      if (!response.ok || Number(result.resultCode) !== 0 || !checkoutUrl) {
        await this.markFailed(transaction.id, String(result.message || 'MoMo không tạo được liên kết thanh toán'), result);
        throw new ServiceUnavailableException(String(result.message || 'Không thể kết nối MoMo'));
      }
      const updated = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { checkoutUrl, responsePayload: result as Prisma.InputJsonValue },
      });
      return this.publicTransaction(updated, registration.ticketCode);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      await this.markFailed(transaction.id, 'Không thể kết nối MoMo', { error: String(error) });
      this.logger.error('MoMo create payment failed', error instanceof Error ? error.stack : String(error));
      throw new ServiceUnavailableException('Không thể kết nối MoMo. Vui lòng thử lại sau.');
    }
  }

  private async markPaid(id: string, providerTransactionId: string, response: unknown) {
    await this.prisma.$transaction(async (database) => {
      const transaction = await database.paymentTransaction.findUnique({ where: { id } });
      if (!transaction || transaction.status === PaymentTransactionStatus.PAID) return;
      await database.paymentTransaction.update({
        where: { id },
        data: {
          status: PaymentTransactionStatus.PAID,
          providerTransactionId: providerTransactionId || null,
          responsePayload: response as Prisma.InputJsonValue,
          failureReason: null,
          paidAt: new Date(),
        },
      });
      await database.eventRegistration.update({
        where: { id: transaction.registrationId },
        data: { paymentStatus: PaymentStatus.PAID },
      });
      await database.paymentTransaction.updateMany({
        where: {
          registrationId: transaction.registrationId,
          id: { not: id },
          status: PaymentTransactionStatus.PENDING,
        },
        data: { status: PaymentTransactionStatus.CANCELLED },
      });
    });
  }

  private async markFailed(id: string, reason: string, response: unknown) {
    await this.prisma.paymentTransaction.updateMany({
      where: { id, status: PaymentTransactionStatus.PENDING },
      data: {
        status: PaymentTransactionStatus.FAILED,
        failureReason: reason.slice(0, 500),
        responsePayload: response as Prisma.InputJsonValue,
      },
    });
  }

  private verifyVnpay(input: Record<string, string>) {
    const received = String(input.vnp_SecureHash || '').toLowerCase();
    const secret = process.env.VNPAY_HASH_SECRET?.trim();
    if (!received || !secret || String(input.vnp_TmnCode || '') !== process.env.VNPAY_TMN_CODE?.trim()) return false;
    const params = Object.fromEntries(
      Object.entries(input).filter(([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType'),
    );
    const expected = createHmac('sha512', secret).update(this.vnpayQuery(params), 'utf8').digest('hex');
    return this.safeEqual(received, expected);
  }

  private verifyMomo(payload: Record<string, unknown>) {
    const accessKey = process.env.MOMO_ACCESS_KEY?.trim();
    const secretKey = process.env.MOMO_SECRET_KEY?.trim();
    const received = String(payload.signature || '').toLowerCase();
    if (
      !accessKey
      || !secretKey
      || !received
      || String(payload.partnerCode || '') !== process.env.MOMO_PARTNER_CODE?.trim()
    ) return false;
    const raw = [
      `accessKey=${accessKey}`,
      `amount=${payload.amount ?? ''}`,
      `extraData=${payload.extraData ?? ''}`,
      `message=${payload.message ?? ''}`,
      `orderId=${payload.orderId ?? ''}`,
      `orderInfo=${payload.orderInfo ?? ''}`,
      `orderType=${payload.orderType ?? ''}`,
      `partnerCode=${payload.partnerCode ?? ''}`,
      `payType=${payload.payType ?? ''}`,
      `requestId=${payload.requestId ?? ''}`,
      `responseTime=${payload.responseTime ?? ''}`,
      `resultCode=${payload.resultCode ?? ''}`,
      `transId=${payload.transId ?? ''}`,
    ].join('&');
    const expected = createHmac('sha256', secretKey).update(raw, 'utf8').digest('hex');
    return this.safeEqual(received, expected);
  }

  private publicTransaction(transaction: any, ticketCode: string) {
    return {
      orderId: transaction.orderId,
      provider: transaction.provider,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      checkoutUrl: transaction.checkoutUrl,
      qrCodeUrl: transaction.qrCodeUrl,
      failureReason: transaction.failureReason,
      paidAt: transaction.paidAt,
      expiresAt: transaction.expiresAt,
      ticketCode,
    };
  }

  private orderId() {
    return `SD${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private vnpayQuery(params: Record<string, string>) {
    return Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key])).replace(/%20/g, '+')}`)
      .join('&');
  }

  private vietnameseTimestamp(date: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
  }

  private clientIp(request: Request) {
    const forwarded = request.headers['x-forwarded-for'];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
    return (value || request.ip || request.socket.remoteAddress || '127.0.0.1').trim().replace(/^::ffff:/, '');
  }

  private frontendUrl() {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }

  private backendUrl() {
    return (process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000').replace(/\/$/, '');
  }

  private async requireFeature(
    key: 'momoEnabled' | 'vnpayEnabled' | 'bankQrEnabled',
    provider: string,
  ) {
    if (!await this.settings.enabled(key)) {
      throw new ServiceUnavailableException(`${provider} đang tạm tắt hoặc chưa được cấu hình`);
    }
  }

  private requireEnv(name: string) {
    const value = process.env[name]?.trim();
    if (!value) throw new ServiceUnavailableException(`Thiếu cấu hình ${name}`);
    return value;
  }

  private gatewayUrl(name: string, sandboxUrl: string) {
    const configured = process.env[name]?.trim().replace(/\/$/, '');
    if (configured) return configured;
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(`Thiếu cấu hình production ${name}`);
    }
    return sandboxUrl;
  }

  private safeEqual(left: string, right: string) {
    const a = Buffer.from(left, 'utf8');
    const b = Buffer.from(right, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
