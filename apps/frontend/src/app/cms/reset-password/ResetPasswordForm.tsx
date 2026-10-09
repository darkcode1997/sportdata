'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Button, Card, Form, Input } from 'antd';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Trophy } from 'lucide-react';
import { useSportDataToast } from '@/hooks/useSportDataToast';

export function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const toast = useSportDataToast();

  const submit = async () => {
    if (password.length < 8) {
      toast.error('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmation) {
      toast.error('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    if (!token) {
      toast.error('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post<{ message: string }>('/api/auth/reset-password', {
        token,
        password,
      });
      setSuccess(response.data.message);
      setPassword('');
      setConfirmation('');
    } catch (requestError: any) {
      toast.error(
        requestError.response?.data?.message ||
          'Không thể đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const passwordSuffix = (
    <Button
      type="text"
      size="small"
      htmlType="button"
      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      icon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      onClick={() => setShowPassword((value) => !value)}
    />
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-sdark-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sblue-500 to-sblue-700 shadow-lg shadow-sblue-500/30">
            <Trophy className="h-9 w-9 text-white" />
          </div>
          <h1 className="mb-1 text-2xl font-bold text-slate-100">Đặt mật khẩu mới</h1>
          <p className="text-center text-sm text-slate-500">
            Liên kết chỉ dùng được một lần và hết hạn sau 30 phút
          </p>
        </div>

        <Card className="border-sdark-700 bg-sdark-900 shadow-2xl shadow-black/20">
          {!token && (
            <ToastNotice
              className="mb-5"
              type="error"
              showIcon
              message="Liên kết không hợp lệ"
              description="Vui lòng quay lại trang quên mật khẩu để yêu cầu liên kết mới."
            />
          )}
          {!success && (
            <Form layout="vertical" requiredMark={false} onFinish={submit}>
              <Form.Item label="Mật khẩu mới" required extra="Tối thiểu 8 ký tự.">
                <Input
                  id="password"
                  size="large"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={password}
                  prefix={<Lock className="h-4 w-4 text-slate-500" />}
                  suffix={passwordSuffix}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Form.Item>

              <Form.Item label="Xác nhận mật khẩu" required>
                <Input
                  id="confirmation"
                  size="large"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  value={confirmation}
                  prefix={<KeyRound className="h-4 w-4 text-slate-500" />}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                disabled={!token}
                loading={submitting}
              >
                Cập nhật mật khẩu
              </Button>
            </Form>
          )}

          <Link
            href={success ? '/cms/login' : '/cms/forgot-password'}
            className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {success ? 'Đăng nhập ngay' : 'Yêu cầu liên kết mới'}
          </Link>
        </Card>
      </div>
    </div>
  );
}
