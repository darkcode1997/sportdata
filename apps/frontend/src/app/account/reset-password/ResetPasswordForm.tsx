'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, Button, Card, Form, Input } from 'antd';
import { ArrowLeft, KeyRound, Lock } from 'lucide-react';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { participantApi, participantError } from '@/lib/participant-auth';

export function ParticipantResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const toast = useSportDataToast();

  const submit = async (values: { password: string; confirmation: string }) => {
    if (values.password !== values.confirmation) {
      toast.error('Mật khẩu xác nhận chưa khớp.');
      return;
    }
    if (!token) {
      toast.error('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await participantApi.post<{ message: string }>('/participant-auth/reset-password', {
        token,
        password: values.password,
      });
      setSuccess(data.message);
      toast.success(data.message);
    } catch (error) {
      toast.error(participantError(error, 'Không thể đặt lại mật khẩu. Vui lòng yêu cầu liên kết mới.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="account-gateway-page flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md" title={<span className="flex items-center gap-2"><Lock className="h-5 w-5" /> Đặt mật khẩu mới</span>}>
        {!token && (
          <Alert className="mb-5" type="error" showIcon message="Liên kết không hợp lệ" description="Vui lòng yêu cầu một liên kết đặt lại mật khẩu mới." />
        )}
        {success ? (
          <Alert className="mb-5" type="success" showIcon message={success} />
        ) : (
          <Form layout="vertical" requiredMark={false} onFinish={submit}>
            <Form.Item
              name="password"
              label="Mật khẩu mới"
              extra="Tối thiểu 8 ký tự."
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }]}
            >
              <Input.Password size="large" prefix={<Lock className="h-4 w-4" />} autoComplete="new-password" maxLength={128} />
            </Form.Item>
            <Form.Item
              name="confirmation"
              label="Xác nhận mật khẩu"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    return !value || getFieldValue('password') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error('Mật khẩu xác nhận chưa khớp'));
                  },
                }),
              ]}
            >
              <Input.Password size="large" prefix={<KeyRound className="h-4 w-4" />} autoComplete="new-password" maxLength={128} />
            </Form.Item>
            <Button block size="large" type="primary" htmlType="submit" disabled={!token} loading={submitting}>
              Cập nhật mật khẩu
            </Button>
          </Form>
        )}

        <Link
          href={success ? '/account/login' : '/account/forgot-password'}
          className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {success ? 'Đăng nhập ngay' : 'Yêu cầu liên kết mới'}
        </Link>
      </Card>
    </main>
  );
}
