'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Alert, Button, Card, Form, Input } from 'antd';
import { ArrowLeft, KeyRound, Trophy, UserRound } from 'lucide-react';

type ForgotPasswordResponse = {
  message: string;
  resetUrl?: string;
};

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotPasswordResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await axios.post<ForgotPasswordResponse>('/api/auth/forgot-password', {
        identifier: identifier.trim(),
      });
      setResult(response.data);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          'Không thể gửi yêu cầu lúc này. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sdark-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sblue-500 to-sblue-700 shadow-lg shadow-sblue-500/30">
            <Trophy className="h-9 w-9 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-slate-100">Khôi phục mật khẩu</h1>
          <p className="text-center text-sm text-slate-500">
            Nhập email hoặc username của tài khoản CMS
          </p>
        </div>

        <Card className="border-sdark-700 bg-sdark-900 shadow-2xl shadow-black/20">
          {error && (
            <Alert className="mb-5" type="error" showIcon message={error} />
          )}

          {result && (
            <Alert
              className="mb-5"
              type="success"
              showIcon
              message="Đã tiếp nhận yêu cầu"
              description={result.message}
            />
          )}

          {result?.resetUrl && (
            <Alert
              className="mb-5"
              type="info"
              showIcon
              message="Liên kết dành cho môi trường local"
              description="SMTP chưa được cấu hình nên bạn có thể mở trực tiếp liên kết đặt lại mật khẩu."
              action={
                <Button type="link" href={result.resetUrl}>
                  Mở liên kết
                </Button>
              }
            />
          )}

          <Form layout="vertical" requiredMark={false} onFinish={submit}>
            <Form.Item label="Email hoặc username" required>
              <Input
                id="identifier"
                size="large"
                required
                minLength={3}
                autoComplete="username"
                value={identifier}
                placeholder="admin hoặc admin@sportdata.vn"
                prefix={<UserRound className="h-4 w-4 text-slate-500" />}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
              icon={<KeyRound className="h-4 w-4" />}
            >
              Gửi yêu cầu đặt lại
            </Button>
          </Form>

          <Link
            href="/cms/login"
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại đăng nhập
          </Link>
        </Card>
      </div>
    </div>
  );
}
