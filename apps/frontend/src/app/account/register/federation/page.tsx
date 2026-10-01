'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, Select } from 'antd';
import { Building2, UserPlus } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';

type Federation = {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  country?: { code: string; name: string };
};

export default function FederationAccountRegisterPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [loading, setLoading] = useState(false);
  const { data: federations = [] } = useSWR<Federation[]>('/federations', fetcher);

  const submit = async (values: Record<string, string>) => {
    setLoading(true);
    try {
      const { data } = await participantApi.post('/participant-auth/register/federation', values);
      setParticipantSession(data.accessToken, data.account);
      toast.success('Đã gửi yêu cầu tài khoản đơn vị tới SportData.');
      router.replace('/federation-account');
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể đăng ký tài khoản đơn vị'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="account-gateway-page min-h-[calc(100vh-64px)] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Card title={<span className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Đăng ký tài khoản liên đoàn / CLB</span>}>
          <Alert
            className="mb-6"
            showIcon
            type="info"
            message="SportData sẽ xác minh người đại diện"
            description="Sau khi được duyệt, tài khoản có thể gửi danh sách VĐV cho các sự kiện mà đơn vị được mời tham gia. Không tạo mới liên đoàn tại đây để tránh mạo danh."
          />
          <Form layout="vertical" requiredMark={false} onFinish={submit}>
            <Form.Item name="federationId" label="Liên đoàn / CLB / đơn vị" rules={[{ required: true, message: 'Vui lòng chọn đơn vị' }]}>
              <Select
                showSearch
                optionFilterProp="label"
                size="large"
                placeholder="Tìm đơn vị đã có trên SportData"
                options={federations.map((item) => ({
                  value: item.id,
                  label: `${item.name}${item.country?.name ? ` · ${item.country.name}` : ''}`,
                }))}
              />
            </Form.Item>
            <div className="grid gap-x-4 md:grid-cols-2">
              <Form.Item name="displayName" label="Họ tên người đại diện" rules={[{ required: true, min: 2 }]}><Input size="large" /></Form.Item>
              <Form.Item name="representativePosition" label="Chức vụ tại đơn vị" rules={[{ required: true, min: 2 }]}><Input size="large" placeholder="Ví dụ: Tổng thư ký, quản lý đội" /></Form.Item>
              <Form.Item name="phone" label="Số điện thoại công việc" rules={[{ required: true, min: 8 }]}><Input size="large" autoComplete="tel" /></Form.Item>
              <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true }, { type: 'email' }]}><Input size="large" autoComplete="email" /></Form.Item>
              <Form.Item className="md:col-span-2" name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' }]}><Input.Password size="large" autoComplete="new-password" /></Form.Item>
            </div>
            <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<UserPlus className="h-4 w-4" />}>Gửi yêu cầu đăng ký</Button>
          </Form>
          <p className="mt-6 text-center text-sm text-slate-400">Đã có tài khoản? <Link className="font-semibold text-sky-400" href="/account/login">Đăng nhập</Link></p>
        </Card>
      </div>
    </main>
  );
}
