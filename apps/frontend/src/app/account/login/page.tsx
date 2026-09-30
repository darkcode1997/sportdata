'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Form, Input } from 'antd';
import { LockKeyhole, LogIn, Mail } from 'lucide-react';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';

export default function ParticipantLoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await participantApi.post('/participant-auth/login', values);
      setParticipantSession(data.accessToken, data.account);
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next || '/account');
    } catch (requestError) {
      setError(participantError(requestError, 'Không thể đăng nhập'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-14">
      <Card className="mx-auto max-w-md" title="Đăng nhập tài khoản vận động viên">
        <p className="mb-6 text-sm text-slate-400">Quản lý hồ sơ, giấy tờ đăng ký và vé tham dự sự kiện.</p>
        {error && <Alert className="mb-5" type="error" showIcon message={error} />}
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input size="large" prefix={<Mail className="h-4 w-4" />} autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
            <Input.Password size="large" prefix={<LockKeyhole className="h-4 w-4" />} autoComplete="current-password" />
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<LogIn className="h-4 w-4" />}>
            Đăng nhập
          </Button>
        </Form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Chưa có tài khoản? <Link className="font-semibold text-sky-400" href="/account/register">Đăng ký ngay</Link>
        </p>
      </Card>
    </main>
  );
}
