'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Descriptions, Image, Segmented, Spin, Tag } from 'antd';
import { Banknote, Clock3, CreditCard, ExternalLink, QrCode, Smartphone } from 'lucide-react';
import { participantApi, participantError } from '@/lib/participant-auth';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import type { ParticipationTicket } from '@/lib/ticket-types';

type Provider = 'MOMO' | 'VNPAY' | 'BANK_QR' | 'VISA';

type CheckoutResponse = {
  orderId: string;
  provider: Provider;
  status: string;
  amount: number;
  currency: string;
  checkoutUrl?: string | null;
  qrCodeUrl?: string | null;
  expiresAt?: string | null;
  transferContent?: string;
  bank?: { bankCode?: string; accountNumber?: string; accountName?: string };
};

const providerLabels: Record<Provider, string> = {
  MOMO: 'Ví MoMo',
  VNPAY: 'VNPAY',
  BANK_QR: 'Chuyển khoản QR',
  VISA: 'Visa / Mastercard',
};

const providerIcons: Record<Provider, React.ReactNode> = {
  MOMO: <Smartphone className="h-4 w-4" />,
  VNPAY: <QrCode className="h-4 w-4" />,
  BANK_QR: <Banknote className="h-4 w-4" />,
  VISA: <CreditCard className="h-4 w-4" />,
};

export function PaymentCheckout({ ticket, onPaid }: { ticket: ParticipationTicket; onPaid?: () => void }) {
  const providers = useMemo(
    () => (ticket.event.paymentProviders || []) as Provider[],
    [ticket.event.paymentProviders],
  );
  const [provider, setProvider] = useState<Provider>(providers.includes('BANK_QR') ? 'BANK_QR' : providers[0] || 'BANK_QR');
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoStartedFor = useRef<string>();
  const toast = useSportDataToast();

  const startCheckout = useCallback(async (selectedProvider: Provider = provider) => {
    setLoading(true);
    try {
      const { data } = await participantApi.post<CheckoutResponse>('/payments/checkout', {
        ticketCode: ticket.ticketCode,
        provider: selectedProvider,
      });
      if (data.status === 'PAID') {
        toast.success('Hồ sơ đã được thanh toán.');
        onPaid?.();
        return;
      }
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      setCheckout(data);
    } catch (error) {
      toast.error(participantError(error, 'Không thể khởi tạo thanh toán.'));
    } finally {
      setLoading(false);
    }
  }, [onPaid, provider, ticket.ticketCode, toast]);

  useEffect(() => {
    if (
      ticket.paymentStatus !== 'PENDING'
      || !ticket.feeAmount
      || !providers.includes('BANK_QR')
      || autoStartedFor.current === ticket.ticketCode
    ) return;
    autoStartedFor.current = ticket.ticketCode;
    setProvider('BANK_QR');
    void startCheckout('BANK_QR');
  }, [providers, startCheckout, ticket.feeAmount, ticket.paymentStatus, ticket.ticketCode]);

  useEffect(() => {
    if (!checkout?.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const update = () => {
      setRemainingSeconds(Math.max(0, Math.ceil((new Date(checkout.expiresAt!).getTime() - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [checkout?.expiresAt]);

  if (ticket.paymentStatus !== 'PENDING' || !ticket.feeAmount || !providers.length) return null;

  const checkoutExpired = remainingSeconds === 0;
  const countdown = remainingSeconds === null
    ? null
    : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  return (
    <Card
      className="ticket-page-controls mb-6 overflow-hidden border-sky-500/25"
      title={<span className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-sky-500" />Thanh toán lệ phí</span>}
      extra={<Tag color="processing">Chờ thanh toán</Tag>}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-slate-500">Số tiền cần thanh toán</div>
            <div className="mt-1 text-2xl font-extrabold text-sky-500">
              {new Intl.NumberFormat('vi-VN').format(ticket.feeAmount)} {ticket.currency || 'VND'}
            </div>
          </div>
          <Segmented
            block
            value={provider}
            onChange={(value) => { setProvider(value as Provider); setCheckout(null); }}
            options={providers.map((value) => ({
              value,
              label: <span className="inline-flex items-center gap-2">{providerIcons[value]}{providerLabels[value]}</span>,
            }))}
          />
          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={() => void startCheckout()}
            icon={provider === 'BANK_QR' ? <QrCode className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          >
            {provider === 'BANK_QR'
              ? checkout?.qrCodeUrl ? 'Tạo lại mã QR chuyển khoản' : 'Tạo mã QR chuyển khoản'
              : `Thanh toán qua ${providerLabels[provider]}`}
          </Button>
          <ToastNotice
            showIcon
            type="warning"
            message="Thời hạn hoàn tất thanh toán: 24 giờ"
            description={ticket.paymentDueAt
              ? `Hồ sơ sẽ tự hủy nếu chưa thanh toán trước ${new Date(ticket.paymentDueAt).toLocaleString('vi-VN')}. Mỗi mã thanh toán có hiệu lực trong 30 phút và có thể tạo lại khi hết hạn.`
              : 'Hồ sơ sẽ tự hủy nếu chưa thanh toán trong 24 giờ. Mỗi mã thanh toán có hiệu lực trong 30 phút và có thể tạo lại khi hết hạn.'}
          />
          <p className="text-xs leading-5 text-slate-500">
            SportData không lưu số thẻ hoặc mã bảo mật. Thanh toán trực tuyến được thực hiện trên trang bảo mật của cổng thanh toán.
          </p>
        </div>

        {loading ? <div className="grid min-h-48 min-w-64 place-items-center"><Spin /></div> : checkout?.qrCodeUrl && !checkoutExpired ? (
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/15 p-4 text-center">
            {countdown && <Tag className="mb-3" color="orange" icon={<Clock3 className="h-3.5 w-3.5" />}>Mã QR còn hiệu lực {countdown}</Tag>}
            <Image src={checkout.qrCodeUrl} width={230} alt="QR chuyển khoản lệ phí" preview={false} />
            <Descriptions className="mt-3 text-left" size="small" column={1} colon={false}>
              <Descriptions.Item label="Ngân hàng">{checkout.bank?.bankCode}</Descriptions.Item>
              <Descriptions.Item label="Số tài khoản"><strong>{checkout.bank?.accountNumber}</strong></Descriptions.Item>
              <Descriptions.Item label="Chủ tài khoản">{checkout.bank?.accountName}</Descriptions.Item>
              <Descriptions.Item label="Nội dung"><Tag color="blue">{checkout.transferContent}</Tag></Descriptions.Item>
            </Descriptions>
            <p className="mt-3 text-xs leading-5 text-amber-600">
              Giữ nguyên nội dung chuyển khoản. Ban tổ chức sẽ đối soát và xác nhận trong CMS.
            </p>
          </div>
        ) : checkout?.qrCodeUrl && checkoutExpired ? (
          <div className="grid min-h-64 w-full max-w-sm place-items-center rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6 text-center">
            <div>
              <Clock3 className="mx-auto h-10 w-10 text-amber-500" />
              <strong className="mt-3 block">Mã QR đã hết hạn</strong>
              <p className="mt-2 text-sm text-slate-500">Bấm “Tạo lại mã QR chuyển khoản” để nhận mã mới có hiệu lực 30 phút.</p>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
