'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { CheckCircle2, Eye, RefreshCw, TicketCheck, XCircle } from 'lucide-react';
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
    media: {
      type: 'AVATAR' | 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT';
      verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
      verificationNote?: string | null;
    }[];
  };
  submission?: {
    type: 'INDIVIDUAL' | 'GROUP';
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    organizationName?: string;
    referenceCode: string;
  } | null;
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

  const verifyDocument = async (athleteId: string, type: string, status: 'VERIFIED' | 'REJECTED') => {
    setError('');
    try {
      await api.patch(`/participant-auth/admin/athletes/${athleteId}/media/${type}/verification`, {
        status,
        note: status === 'REJECTED' ? 'Giấy tờ không hợp lệ hoặc không đọc được. Vui lòng tải lại đúng giấy tờ.' : undefined,
      });
      await mutate();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'Không thể cập nhật trạng thái xác thực');
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
          scroll={{ x: 1500 }}
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
              width: 360,
              render: (_, item) => {
                const mediaMap = new Map(item.athlete.media.map((media) => [media.type, media]));
                const documents = [
                  { type: 'CCCD_FRONT', label: 'CCCD trước' },
                  { type: 'CCCD_BACK', label: 'CCCD sau' },
                  { type: 'PASSPORT', label: 'Hộ chiếu' },
                ] as const;
                return (
                  <div className="space-y-2">
                    {documents.map(({ type, label }) => {
                      const media = mediaMap.get(type);
                      if (!media) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1" key={type}>
                          <Button size="small" icon={<Eye className="h-3 w-3" />} onClick={() => viewDocument(item.athlete.id, type)}>{label}</Button>
                          {media.verificationStatus === 'VERIFIED'
                            ? <Tag color="success">Đã xác thực</Tag>
                            : media.verificationStatus === 'REJECTED'
                              ? <Tag color="error">Từ chối</Tag>
                              : <Tag color="processing">Chờ xác thực</Tag>}
                          {media.verificationStatus !== 'VERIFIED' && (
                            <Button size="small" type="text" title="Xác thực" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} onClick={() => verifyDocument(item.athlete.id, type, 'VERIFIED')} />
                          )}
                          {media.verificationStatus !== 'REJECTED' && (
                            <Button size="small" type="text" title="Từ chối" icon={<XCircle className="h-4 w-4 text-red-500" />} onClick={() => verifyDocument(item.athlete.id, type, 'REJECTED')} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              },
            },
            {
              title: 'Nguồn đăng ký',
              key: 'source',
              width: 230,
              render: (_, item) => item.submission ? (
                <div>
                  <Tag color={item.submission.type === 'GROUP' ? 'purple' : 'blue'}>{item.submission.type === 'GROUP' ? 'Danh sách' : 'Không tài khoản'}</Tag>
                  <div className="mt-1 text-xs">{item.submission.organizationName || item.submission.contactName}</div>
                  <div className="text-xs text-slate-500">{item.submission.referenceCode}</div>
                </div>
              ) : <Tag>Tài khoản SportData</Tag>,
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
              render: (_, item) => {
                const mediaMap = new Map(item.athlete.media.map((media) => [media.type, media.verificationStatus]));
                const identityVerified = (
                  mediaMap.get('CCCD_FRONT') === 'VERIFIED'
                  && mediaMap.get('CCCD_BACK') === 'VERIFIED'
                ) || mediaMap.get('PASSPORT') === 'VERIFIED';
                return (
                  <Select
                    value={item.status}
                    className="w-full"
                    onChange={(status) => changeStatus(item.id, status)}
                    options={[
                      { value: 'SUBMITTED', label: 'Chờ duyệt' },
                      { value: 'CONFIRMED', label: identityVerified ? 'Đã xác nhận' : 'Cần xác thực giấy tờ', disabled: !identityVerified },
                      { value: 'REJECTED', label: 'Từ chối' },
                      { value: 'CANCELLED', label: 'Đã hủy' },
                    ]}
                  />
                );
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
