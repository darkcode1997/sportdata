'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Input, Popconfirm, Skeleton, Tag, Typography } from 'antd';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type Field = {
  name: string;
  label: string;
  group: string;
  secret: boolean;
  configured: boolean;
  source: 'database' | 'environment' | 'unset';
  value: string;
};

export function IntegrationSettings({ onSaved }: { onSaved: () => void }) {
  const { data, error, mutate } = useSWR<Field[]>('/system-settings/integrations', fetcher);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const toast = useSportDataToast();

  async function save(field: Field, value: string | null) {
    setSaving(field.name);
    try {
      const response = await api.patch<Field[]>('/system-settings/integrations', {
        values: { [field.name]: value },
      });
      await mutate(response.data, false);
      setDrafts((previous) => {
        const next = { ...previous };
        delete next[field.name];
        return next;
      });
      onSaved();
      toast.success(value === null ? 'Đã xóa cấu hình CMS; sử dụng ENV nếu có.' : 'Đã lưu cấu hình.');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể lưu cấu hình.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="space-y-4">
      <Typography.Title level={4}>Cấu hình dịch vụ tích hợp</Typography.Title>
      <Alert type="info" showIcon message="Cấu hình CMS được ưu tiên hơn ENV"
        description="Thay đổi áp dụng cho các yêu cầu tiếp theo. Khóa bí mật được mã hóa và không hiển thị lại. Xóa giá trị CMS để sử dụng ENV. Database, JWT và cấu hình triển khai được quản lý trên máy chủ." />
      {error ? <Alert type="error" showIcon message="Không thể tải cấu hình" action={<Button onClick={() => void mutate()}>Thử lại</Button>} /> : !data ? <Skeleton active /> :
        ['SMTP', 'FPT.AI', 'MoMo', 'VNPAY'].map((group) => (
          <Card key={group} title={group}>
            <div className="space-y-5">
              {data.filter((field) => field.group === group).map((field) => {
                const draft = drafts[field.name];
                const value = draft ?? field.value;
                const props = {
                  id: `integration-${field.name}`, value,
                  placeholder: field.secret && field.configured ? 'Đã cấu hình — nhập để thay thế' : 'Chưa cấu hình',
                  autoComplete: 'new-password', maxLength: 4096,
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDrafts((previous) => ({ ...previous, [field.name]: event.target.value })),
                };
                return (
                  <div key={field.name} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={props.id}>{field.label}</label>
                      <Typography.Text code>{field.name}</Typography.Text>
                      <Tag color={field.configured ? 'green' : 'default'}>
                        {field.source === 'database' ? 'Đã lưu trong CMS' : field.source === 'environment' ? 'Đang dùng ENV' : 'Chưa cấu hình'}
                      </Tag>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="min-w-0 flex-1 basis-60">
                        {field.secret ? <Input.Password {...props} /> : <Input {...props} />}
                      </div>
                      <Button type="primary" loading={saving === field.name}
                        disabled={saving !== null || draft === undefined || !value.trim()}
                        onClick={() => void save(field, value)}>Lưu</Button>
                      <Popconfirm title="Xóa giá trị CMS?" description="Hệ thống sẽ dùng ENV nếu có."
                        onConfirm={() => save(field, null)} okText="Xóa" cancelText="Hủy">
                        <Button danger disabled={saving !== null || field.source !== 'database'}>Xóa</Button>
                      </Popconfirm>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
    </section>
  );
}
