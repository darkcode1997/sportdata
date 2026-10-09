'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Result, Spin } from 'antd';

function UnsubscribeForm() {
  const token = useSearchParams().get('token');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    if (!token) return;
    setLoading(true);
    setFailed(false);
    try {
      const base = process.env.NEXT_PUBLIC_BROWSER_API_URL || '/api';
      const response = await fetch(`${base.replace(/\/$/, '')}/marketing/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' });
      if (!response.ok) throw new Error('Unsubscribe failed');
      setDone(true);
    } catch { setFailed(true); }
    finally { setLoading(false); }
  };
  return <Card>{done ? <Result status="success" title="Đã xử lý yêu cầu hủy nhận tin" subTitle="Bạn có thể bật lại email giới thiệu trong tài khoản SportData. Email giao dịch và vé tham dự vẫn hoạt động." extra={<Link href="/account/email-preferences">Quản lý nhận tin</Link>} /> : <Result status="info" title="Hủy nhận email giới thiệu SportData" subTitle={token ? 'Xác nhận để dừng nhận email giới thiệu sự kiện và bài viết mới. Bạn không cần đăng nhập.' : 'Liên kết thiếu mã hủy đăng ký. Hãy mở liên kết trong email hoặc quản lý nhận tin trong tài khoản.'} extra={<Button type="primary" loading={loading} disabled={!token} onClick={confirm}>Xác nhận hủy nhận tin</Button>} />}{failed && <Alert type="error" showIcon message="Chưa thể hủy nhận tin. Vui lòng thử lại." />}</Card>;
}

export default function UnsubscribePage() {
  return <main className="mx-auto min-h-[65vh] max-w-2xl px-4 py-12"><Suspense fallback={<Spin />}><UnsubscribeForm /></Suspense></main>;
}
