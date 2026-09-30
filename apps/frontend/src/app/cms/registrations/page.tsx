'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { Eye, FileCheck2, RefreshCw, TicketCheck } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

type Registration = {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  event: { id: string; name: string };
  category: { name: string; sport?: { name: string } };
  athlete: {
    id: string;
    fullName: string;
    birthDate?: string;
    weight?: number;
    country: { code: string; name: string };
    federation?: { name: string };
  };
};
type EventItem = { id: string; name: string };

export default function CmsRegistrationsPage() {
  const [eventId, setEventId] = useState('');
  const [error, setError] = useState('');
  const { data: registrations = [], isLoading, mutate } = useSWR<Registration[]>(
    `/participant-auth/admin/registrations${eventId ? `?eventId=${eventId}` : ''}`,
    fetcher,
  );
  const { data: eventResponse } = useSWR<{ items: EventItem[] }>('/events?limit=200', fetcher);
  const events = useMemo(() => eventResponse?.items || [], [eventResponse]);

  const changeStatus = async (id: string, status: string) => {
    setError('');
    try {
      await api.patch(`/participant-auth/admin/registrations/${id}/status`, { status });
      await mutate();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const viewDocument = async (athleteId: string, type: string) => {
    setError('');
    try {
      const response = await api.get(`/participant-auth/admin/athletes/${athleteId}/media/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (requestError: any) {
      setError(requestError.response?.status === 404 ? 'Vận động viên chưa tải giấy tờ này' : 'Không thể mở giấy tờ');
    }
  };

  return (
    <div>
      <CmsPageHeader
        title="Đăng ký thi đấu"
        description="Duyệt hồ sơ, đối chiếu giấy tờ và quản lý vé tham dự của vận động viên."
        icon={<TicketCheck className="h-6 w-6" />}
      />
      {error && <Alert className="mb-5" showIcon closable type="error" message={error} />}
      <Card className="cms-surface mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            className="min-w-72"
            size="large"
            placeholder="Tất cả sự kiện"
            value={eventId || undefined}
            onChange={(value) => setEventId(value || '')}
            options={events.map((event) => ({ value: event.id, label: event.name }))}
          />
          <Button size="large" icon={<RefreshCw className="h-4 w-4" />} onClick={() => mutate()}>Làm mới</Button>
          <Typography.Text type="secondary">{registrations.length} lượt đăng ký</Typography.Text>
        </div>
      </Card>
      <Card className="cms-surface" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={registrations}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={[
            {
              title: 'Vận động viên',
              key: 'athlete',
              width: 240,
              render: (_, item) => (
                <div><strong>{item.athlete.fullName}</strong><div className="text-xs text-slate-500">{item.athlete.country.code} · {item.athlete.federation?.name || 'VĐV tự do'} · {item.athlete.weight ? `${item.athlete.weight} kg` : 'chưa cân'}</div></div>
              ),
            },
            { title: 'Sự kiện', dataIndex: ['event', 'name'], width: 260 },
            {
              title: 'Hạng đấu',
              key: 'category',
              width: 220,
              render: (_, item) => <span>{item.category.sport?.name} · {item.category.name}</span>,
            },
            {
              title: 'Giấy tờ',
              key: 'documents',
              width: 230,
              render: (_, item) => (
                <Space wrap>
                  <Button size="small" icon={<Eye className="h-3 w-3" />} onClick={() => viewDocument(item.athlete.id, 'CCCD_FRONT')}>CCCD trước</Button>
                  <Button size="small" icon={<Eye className="h-3 w-3" />} onClick={() => viewDocument(item.athlete.id, 'CCCD_BACK')}>CCCD sau</Button>
                  <Button size="small" icon={<FileCheck2 className="h-3 w-3" />} onClick={() => viewDocument(item.athlete.id, 'PASSPORT')}>Hộ chiếu</Button>
                </Space>
              ),
            },
            {
              title: 'Vé',
              dataIndex: 'ticketCode',
              width: 190,
              render: (value) => <code>{value}</code>,
            },
            {
              title: 'Trạng thái',
              key: 'status',
              fixed: 'right',
              width: 180,
              render: (_, item) => (
                <Select
                  value={item.status}
                  className="w-full"
                  onChange={(status) => changeStatus(item.id, status)}
                  options={[
                    { value: 'SUBMITTED', label: 'Chờ duyệt' },
                    { value: 'CONFIRMED', label: 'Đã xác nhận' },
                    { value: 'REJECTED', label: 'Từ chối' },
                    { value: 'CANCELLED', label: 'Đã hủy' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
