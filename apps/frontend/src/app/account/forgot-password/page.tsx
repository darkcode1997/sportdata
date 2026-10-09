'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Card, Form, Input } from 'antd';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { participantApi, participantError } from '@/lib/participant-auth';

type ForgotPasswordResponse = {
  message: string;
  resetUrl?: string;
};

export default function ParticipantForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const toast = useSportDataToast();

  const submit = async (values: { email: string }) => {
    setSubmitting(true);
    setResult(null);
    try {
      const { data } = await participantApi.post<ForgotPasswordResponse>('/participant-auth/forgot-password', values);
      setResult(data);
    } catch (error) {
      toast.error(participantError(error, 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="account-gateway-page flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md" title={<span className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Khôi phục mật khẩu</span>}>
        <p className="mb-6 text-sm leading-6 text-slate-400">
          Nhập email đã đăng ký cho tài khoản cá nhân hoặc liên đoàn/CLB. Chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </p>

        {result && (
          <ToastNotice
            className="mb-5"
            type="success"
            showIcon
            message={result.message}
            description={result.resetUrl ? 'SMTP chưa được cấu hình. Bạn có thể dùng liên kết thử nghiệm bên dưới.' : undefined}
            action={result.resetUrl ? <Button type="link" href={result.resetUrl}>Mở liên kết</Button> : undefined}
          />
        )}

        <Form layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input size="large" prefix={<Mail className="h-4 w-4" />} autoComplete="email" placeholder="email@example.com" />
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={submitting} icon={<KeyRound className="h-4 w-4" />}>
            Gửi liên kết đặt lại
          </Button>
        </Form>

        <Link href="/account/login" className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" />
          Quay lại đăng nhập
        </Link>
      </Card>
    </main>
  );
}
