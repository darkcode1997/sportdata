'use client';

import { useState } from 'react';
import { Button, Card, Descriptions, Image, Segmented, Spin, Tag } from 'antd';
import { Banknote, CreditCard, ExternalLink, QrCode, Smartphone } from 'lucide-react';
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
  const providers = (ticket.event.paymentProviders || []) as Provider[];
  const [provider, setProvider] = useState<Provider>(providers[0] || 'BANK_QR');
  const [loading, setLoading] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutResponse | null>(null);
  const toast = useSportDataToast();

  if (ticket.paymentStatus !== 'PENDING' || !ticket.feeAmount || !providers.length) return null;

  const startCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await participantApi.post<CheckoutResponse>('/payments/checkout', {
        ticketCode: ticket.ticketCode,
        provider,
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
  };

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
            onClick={startCheckout}
            icon={provider === 'BANK_QR' ? <QrCode className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
          >
            {provider === 'BANK_QR' ? 'Tạo mã QR chuyển khoản' : `Thanh toán qua ${providerLabels[provider]}`}
          </Button>
          <p className="text-xs leading-5 text-slate-500">
            SportData không lưu số thẻ hoặc mã bảo mật. Thanh toán trực tuyến được thực hiện trên trang bảo mật của cổng thanh toán.
          </p>
        </div>

        {loading ? <div className="grid min-h-48 min-w-64 place-items-center"><Spin /></div> : checkout?.qrCodeUrl ? (
          <div className="w-full max-w-sm rounded-2xl border border-slate-200/15 p-4 text-center">
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
        ) : null}
      </div>
    </Card>
  );
}
