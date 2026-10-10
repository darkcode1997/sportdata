'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, Form, Input, Tag } from 'antd';
import { LockKeyhole, LogIn, Mail, UserRound } from 'lucide-react';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';

export default function SportDataLoginPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [loading, setLoading] = useState(false);

  const submit = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const { data } = await participantApi.post('/participant-auth/login', values);
      setParticipantSession(data.accessToken, data.account);
      toast.success(`Đăng nhập thành công. Xin chào ${data.account.displayName}.`);
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next?.startsWith('/') && !next.startsWith('//') ? next : '/account');
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể đăng nhập'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <main className="account-gateway-page min-h-[calc(100vh-64px)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section>
          <Tag color="blue">SPORTDATA ACCOUNT</Tag>
          <h1 className="mt-4 text-3xl font-bold">Tài khoản SportData</h1>
          <p className="mt-3 max-w-xl text-slate-400">Tài khoản SportData gồm các loại VĐV, Trọng tài, Huấn luyện viên, Trưởng đoàn và Nhân viên y tế. Mỗi tài khoản chỉ được chọn một loại.</p>
        </section>

        <Card className="h-fit" title={<span className="flex items-center gap-2"><UserRound className="h-5 w-5" /> Đăng nhập SportData</span>}>
          <p className="mb-6 text-sm text-slate-400">Sử dụng email và mật khẩu Tài khoản SportData của bạn.</p>
          <Form layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
              <Input size="large" prefix={<Mail className="h-4 w-4" />} autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
              <Input.Password size="large" prefix={<LockKeyhole className="h-4 w-4" />} autoComplete="current-password" />
            </Form.Item>
            <div className="-mt-3 mb-5 text-right">
              <Link className="text-sm font-semibold text-sky-400 hover:text-sky-300" href="/account/forgot-password">
                Quên mật khẩu?
              </Link>
            </div>
            <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<LogIn className="h-4 w-4" />}>Đăng nhập</Button>
          </Form>
          <p className="mt-6 text-center text-sm text-slate-400">
            Chưa có tài khoản?{' '}
            <Link className="font-semibold text-sky-400" href="/account/register">
              Tạo tài khoản SportData
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
