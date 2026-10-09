'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input } from 'antd';
import { KeyRound } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { api, clearAuthToken } from '@/lib/api';

function requestMessage(error: any, fallback: string) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('. ') : value || fallback;
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (values: { currentPassword: string; newPassword: string }) => {
    setSubmitting(true);
    try {
      const response = await api.patch<{ message: string }>('/auth/change-password', values);
      toast.success(response.data.message || 'Đã đổi mật khẩu');
      form.resetFields();
      clearAuthToken();
      window.setTimeout(() => router.replace('/cms/login'), 700);
    } catch (error: any) {
      toast.error(requestMessage(error, 'Không thể đổi mật khẩu.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu đăng nhập CMS của bạn."
        icon={<KeyRound className="h-6 w-6" />}
      />

      <Card className="max-w-2xl">
        <ToastNotice
          type="info"
          showIcon
          className="mb-6"
          message="Sau khi đổi mật khẩu, bạn sẽ được đăng xuất khỏi các phiên đăng nhập cũ."
        />
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
          </Form.Item>
          <Form.Item
            name="confirmation"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Nhập lại mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || value === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} icon={<KeyRound className="h-4 w-4" />}>
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );
}
