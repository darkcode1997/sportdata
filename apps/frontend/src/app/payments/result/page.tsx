'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Result, Spin } from 'antd';
import { fetcher } from '@/lib/api';

type PaymentResult = {
  orderId: string;
  provider: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  ticketCode: string;
  failureReason?: string | null;
};

export default function PaymentResultPage() {
  const [orderId, setOrderId] = useState('');
  useEffect(() => setOrderId(new URLSearchParams(window.location.search).get('orderId') || ''), []);
  const { data, error } = useSWR<PaymentResult>(
    orderId ? `/payments/transactions/${encodeURIComponent(orderId)}` : null,
    fetcher,
    { refreshInterval: (result) => result?.status === 'PENDING' ? 2500 : 0 },
  );

  if (!orderId || (!data && !error)) {
    return <main className="grid min-h-[70vh] place-items-center"><Spin size="large" /></main>;
  }
  if (error) {
    return <main className="grid min-h-[70vh] place-items-center"><Result status="error" title="Không thể kiểm tra giao dịch" subTitle="Vui lòng mở lại vé để kiểm tra trạng thái thanh toán." extra={<Link href="/events"><Button>Sự kiện</Button></Link>} /></main>;
  }
  if (data?.status === 'PAID') {
    return <main className="grid min-h-[70vh] place-items-center"><Result status="success" title="Thanh toán thành công" subTitle={`Mã giao dịch ${data.orderId}. Hồ sơ đang chờ ban tổ chức duyệt giấy tờ.`} extra={<Link href={`/tickets/${encodeURIComponent(data.ticketCode)}`}><Button type="primary">Xem vé tham dự</Button></Link>} /></main>;
  }
  if (data?.status === 'PENDING') {
    return <main className="grid min-h-[70vh] place-items-center"><Result icon={<Spin size="large" />} title="Đang xác nhận thanh toán" subTitle="Hệ thống đang chờ callback bảo mật từ cổng thanh toán. Trang sẽ tự cập nhật." /></main>;
  }
  return <main className="grid min-h-[70vh] place-items-center"><Result status="warning" title="Thanh toán chưa hoàn tất" subTitle={data?.failureReason || 'Giao dịch đã hủy, thất bại hoặc hết hạn.'} extra={<Link href={`/tickets/${encodeURIComponent(data?.ticketCode || '')}`}><Button type="primary">Thử phương thức khác</Button></Link>} /></main>;
}
