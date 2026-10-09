'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Alert, Button, Card, Checkbox, Form, Spin, Switch } from 'antd';
import { Mail } from 'lucide-react';
import { getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type Preferences = { marketingEnabled: boolean; marketingEvents: boolean; marketingArticles: boolean };
export default function EmailPreferencesPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<Preferences>();
  const enabled = Form.useWatch('marketingEnabled', form);
  const { data, error, isLoading, mutate } = useSWR<Preferences>(authenticated ? '/marketing/preferences' : null, url => participantApi.get(url).then(response => response.data));
  useEffect(() => {
    if (!getParticipantToken()) router.replace('/account/login');
    else setAuthenticated(true);
  }, [router]);
  useEffect(() => { if (data) form.setFieldsValue(data); }, [data, form]);

  const save = async (values: Preferences) => {
    setSaving(true);
    try {
      await participantApi.patch('/marketing/preferences', values);
      await mutate();
      toast.success('Đã lưu lựa chọn nhận email của bạn.');
    } catch (requestError) { toast.error(participantError(requestError, 'Không thể lưu lựa chọn nhận tin.')); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto min-h-[65vh] max-w-2xl px-4 py-12">
    <Link href="/account" className="mb-6 inline-block text-sky-400">← Tài khoản SportData</Link>
    <Card title={<span className="flex items-center gap-2"><Mail className="h-5 w-5" /> Email từ SportData</span>}>
      <p className="mb-6 text-slate-400">Cập nhật sự kiện và câu chuyện thể thao theo lựa chọn của bạn. Mỗi email đều có liên kết hủy đăng ký.</p>
      {error ? <Alert type="error" showIcon message="Không thể tải lựa chọn nhận tin. Vui lòng đăng nhập lại hoặc thử lại." /> : !authenticated || isLoading || !data ? <Spin /> : <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="marketingEnabled" label="Nhận email giới thiệu từ SportData" valuePropName="checked"><Switch checkedChildren="Đăng ký" unCheckedChildren="Tắt" /></Form.Item>
        <Form.Item name="marketingEvents" valuePropName="checked"><Checkbox disabled={!enabled}>Sự kiện mới và thông tin tham dự</Checkbox></Form.Item>
        <Form.Item name="marketingArticles" valuePropName="checked"><Checkbox disabled={!enabled}>Bài viết mới và tin tức cộng đồng</Checkbox></Form.Item>
        <p className="mb-6 text-xs text-slate-400">Bật nhận tin nghĩa là bạn đồng ý nhận email theo các chủ đề đã chọn. Email xác nhận đăng ký, vé và khôi phục mật khẩu vẫn được gửi khi cần.</p>
        <Button type="primary" htmlType="submit" loading={saving}>Lưu lựa chọn</Button>
      </Form>}
    </Card>
  </main>;
}
