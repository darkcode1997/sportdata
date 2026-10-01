'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  BadgeDollarSign,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Images,
  List,
  LayoutTemplate,
  Network,
  Palette,
  Pencil,
  RefreshCw,
  Settings2,
  TicketCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { EventParticipationCard } from '@/components/EventParticipationCard';
import { SportdataBracket, type BracketDraw } from '@/components/brackets/SportdataBracket';
import type { ParticipationTicket } from '@/lib/ticket-types';

type EventWorkspaceProps = {
  event: any;
  onRefresh: () => Promise<any>;
};

type Registration = {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: string;
  event: { id: string; name: string };
  category: { name: string; sport?: { name: string } };
  athlete: {
    id: string;
    fullName: string;
    weight?: number;
    country?: { code: string };
    federation?: { name: string };
    media: Array<{ type: string; verificationStatus?: string | null }>;
  };
  submission?: { type: string; organizationName?: string; contactName: string; referenceCode: string } | null;
};

const paymentModeOptions = [
  { value: 'FREE', label: 'Miễn phí' },
  { value: 'CASH', label: 'Thu tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
  { value: 'ONLINE', label: 'Thanh toán trực tuyến' },
];

const ticketThemePresets = [
  { value: 'OCEAN', label: 'Ocean', description: 'Xanh thể thao, bố cục cổ điển', layout: 'CLASSIC', primary: '#0284C7', secondary: '#075985', accent: '#059669' },
  { value: 'CRIMSON', label: 'Crimson', description: 'Đỏ mạnh, đầu vé dạng dải', layout: 'STRIPE', primary: '#DC2626', secondary: '#7F1D1D', accent: '#F59E0B' },
  { value: 'EMERALD', label: 'Emerald', description: 'Xanh lá, bố cục tối giản', layout: 'MINIMAL', primary: '#059669', secondary: '#064E3B', accent: '#0EA5E9' },
  { value: 'ROYAL', label: 'Royal', description: 'Tím hoàng gia và vàng', layout: 'STRIPE', primary: '#4F46E5', secondary: '#1E1B4B', accent: '#D97706' },
] as const;

function dateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventWorkspace({ event, onRefresh }: EventWorkspaceProps) {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canEditEvent = ['ADMIN', 'CONTENT', 'GAMES_ADMIN'].includes(currentUser?.role);
  const canOperate = ['ADMIN', 'GAMES_ADMIN', 'SPORT_MANAGER'].includes(currentUser?.role);

  return (
    <Tabs
      defaultActiveKey="overview"
      size="large"
      destroyInactiveTabPane={false}
      items={[
        {
          key: 'overview',
          label: <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Tổng quan</span>,
          children: <EventOverview event={event} canEdit={canEditEvent} />,
        },
        {
          key: 'registrations',
          label: <span className="flex items-center gap-2"><TicketCheck className="h-4 w-4" />Đăng ký thi đấu</span>,
          children: <RegistrationsTab eventId={event.id} canOperate={canOperate} />,
        },
        {
          key: 'matches',
          label: <span className="flex items-center gap-2"><List className="h-4 w-4" />Trận đấu</span>,
          children: <MatchesTab event={event} />,
        },
        {
          key: 'payment',
          label: <span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment</span>,
          children: <PaymentTab event={event} canEdit={canEditEvent} onRefresh={onRefresh} />,
        },
        {
          key: 'ticket',
          label: <span className="flex items-center gap-2"><Images className="h-4 w-4" />Vé A6</span>,
          children: <TicketDesignTab event={event} canEdit={canEditEvent} onRefresh={onRefresh} />,
        },
        {
          key: 'bracket',
          label: <span className="flex items-center gap-2"><Network className="h-4 w-4" />Thể thức & nhánh đấu</span>,
          children: <BracketTab event={event} canOperate={canOperate} />,
        },
      ]}
    />
  );
}

function EventOverview({ event, canEdit }: { event: any; canEdit: boolean }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card title="Thông tin sự kiện" extra={canEdit ? <Button href={`/cms/events/${event.id}/edit`} icon={<Pencil className="h-4 w-4" />}>Chỉnh sửa</Button> : null}>
        <Descriptions column={{ xs: 1, md: 2 }} colon={false}>
          <Descriptions.Item label="Tên sự kiện">{event.name}</Descriptions.Item>
          <Descriptions.Item label="Địa điểm">{event.location || 'Chưa cập nhật'}</Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">{new Date(event.startDate).toLocaleString('vi-VN')}</Descriptions.Item>
          <Descriptions.Item label="Kết thúc">{new Date(event.endDate).toLocaleString('vi-VN')}</Descriptions.Item>
          <Descriptions.Item label="Bộ môn" span={2}>
            <Space wrap>{(event.sports?.length ? event.sports : [event.sport]).filter(Boolean).map((sport: any) => <Tag color="blue" key={sport.id}>{sport.name}</Tag>)}</Space>
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="Dữ liệu vận hành">
        <div className="grid grid-cols-2 gap-3 text-center">
          {[
            ['Đăng ký', event._count?.registrations || 0],
            ['Trận đấu', event._count?.matches || 0],
            ['Hạng đấu', event.categories?.length || 0],
            ['Sân / FOP', event.fops?.length || 0],
          ].map(([label, value]) => (
            <div className="rounded-xl border border-slate-200/15 p-4" key={String(label)}>
              <strong className="block text-2xl text-sky-500">{value}</strong>
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RegistrationsTab({ eventId, canOperate }: { eventId: string; canOperate: boolean }) {
  const toast = useSportDataToast();
  const { data: registrations = [], isLoading, mutate } = useSWR<Registration[]>(`/participant-auth/admin/registrations?eventId=${eventId}`, fetcher);

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/participant-auth/admin/registrations/${id}/status`, { status });
      await mutate();
      toast.success(status === 'CONFIRMED' ? 'Đã xác nhận hồ sơ và gửi lại vé A6 qua email.' : 'Đã cập nhật trạng thái đăng ký.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái đăng ký.');
    }
  };

  const viewDocument = async (athleteId: string, type: string) => {
    try {
      const response = await api.get(`/participant-auth/admin/athletes/${athleteId}/media/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('Không thể mở giấy tờ xác minh.');
    }
  };

  const verifyDocument = async (athleteId: string, type: string, status: 'VERIFIED' | 'REJECTED') => {
    try {
      await api.patch(`/participant-auth/admin/athletes/${athleteId}/media/${type}/verification`, {
        status,
        note: status === 'REJECTED' ? 'Giấy tờ không hợp lệ hoặc không đọc được.' : undefined,
      });
      await mutate();
      toast.success(status === 'VERIFIED' ? 'Đã xác thực giấy tờ.' : 'Đã từ chối giấy tờ.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật giấy tờ.');
    }
  };

  return (
    <Card
      title={`${registrations.length} lượt đăng ký`}
      extra={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => mutate()}>Làm mới</Button>}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={registrations}
        scroll={{ x: 1050 }}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        locale={{ emptyText: 'Chưa có vận động viên đăng ký.' }}
        columns={[
          {
            title: 'Vận động viên',
            key: 'athlete',
            width: 250,
            render: (_, item) => <div><strong>{item.athlete.fullName}</strong><div className="text-xs text-slate-500">{item.athlete.country?.code || '—'} · {item.athlete.federation?.name || 'VĐV tự do'} · {item.athlete.weight ? `${item.athlete.weight} kg` : 'chưa cân'}</div></div>,
          },
          { title: 'Hạng đấu', key: 'category', width: 240, render: (_, item) => `${item.category.sport?.name || ''} · ${item.category.name}` },
          {
            title: 'Giấy tờ xác minh',
            key: 'documents',
            width: 330,
            render: (_, item) => (
              <div className="space-y-1.5">
                {(item.athlete.media || []).filter((media) => ['CCCD_FRONT', 'CCCD_BACK', 'PASSPORT'].includes(media.type)).map((media) => (
                  <div className="flex flex-wrap items-center gap-1" key={media.type}>
                    <Button size="small" icon={<Eye className="h-3 w-3" />} onClick={() => viewDocument(item.athlete.id, media.type)}>{media.type === 'CCCD_FRONT' ? 'CCCD trước' : media.type === 'CCCD_BACK' ? 'CCCD sau' : 'Hộ chiếu'}</Button>
                    <Tag color={media.verificationStatus === 'VERIFIED' ? 'success' : media.verificationStatus === 'REJECTED' ? 'error' : 'processing'}>{media.verificationStatus === 'VERIFIED' ? 'Đã xác thực' : media.verificationStatus === 'REJECTED' ? 'Từ chối' : 'Chờ xác thực'}</Tag>
                    {canOperate && media.verificationStatus !== 'VERIFIED' && <Button size="small" type="text" title="Xác thực" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} onClick={() => verifyDocument(item.athlete.id, media.type, 'VERIFIED')} />}
                    {canOperate && media.verificationStatus !== 'REJECTED' && <Button size="small" type="text" title="Từ chối" icon={<XCircle className="h-4 w-4 text-red-500" />} onClick={() => verifyDocument(item.athlete.id, media.type, 'REJECTED')} />}
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: 'Nguồn hồ sơ',
            key: 'source',
            width: 210,
            render: (_, item) => item.submission
              ? <div><Tag color={item.submission.type === 'GROUP' ? 'purple' : 'blue'}>{item.submission.type === 'GROUP' ? 'Danh sách đội / CLB' : 'Khách'}</Tag><div className="mt-1 text-xs">{item.submission.organizationName || item.submission.contactName}</div><code className="text-xs text-slate-500">{item.submission.referenceCode}</code></div>
              : <Tag>Tài khoản SportData</Tag>,
          },
          { title: 'Thanh toán', dataIndex: 'paymentStatus', width: 140, render: (value) => <Tag color={value === 'PAID' || value === 'NOT_REQUIRED' ? 'success' : 'processing'}>{value}</Tag> },
          {
            title: 'Vé A6',
            dataIndex: 'ticketCode',
            width: 210,
            render: (value) => <Space><code>{value}</code><Button type="text" size="small" href={`/api/participant-auth/tickets/${encodeURIComponent(value)}/pdf`} target="_blank" icon={<Download className="h-4 w-4" />} /></Space>,
          },
          {
            title: 'Trạng thái',
            key: 'status',
            fixed: 'right' as const,
            width: 180,
            render: (_, item) => {
              const states = new Map((item.athlete.media || []).map((media) => [media.type, media.verificationStatus]));
              const identityVerified = (states.get('CCCD_FRONT') === 'VERIFIED' && states.get('CCCD_BACK') === 'VERIFIED') || states.get('PASSPORT') === 'VERIFIED';
              return canOperate ? (
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
              ) : <Tag>{item.status}</Tag>;
            },
          },
        ]}
      />
    </Card>
  );
}

function MatchesTab({ event }: { event: any }) {
  const [categoryId, setCategoryId] = useState<string>(event.categories?.[0]?.id || '');
  const [view, setView] = useState<'tree' | 'list'>('tree');
  const query = new URLSearchParams({ eventId: event.id, limit: '200' });
  if (categoryId) query.set('categoryId', categoryId);
  const { data, isLoading, mutate } = useSWR<any>(`/matches?${query}`, fetcher);
  const { data: drawData, isLoading: drawsLoading } = useSWR<{ draws: BracketDraw[] }>(categoryId ? `/matches/event/${event.id}/category/${categoryId}/draws` : null, fetcher);
  const draws = [...(drawData?.draws || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-5">
      <Card styles={{ body: { padding: 16 } }}>
        <div className="flex flex-wrap items-center gap-3">
          <Select className="min-w-72 flex-1" value={categoryId || undefined} placeholder="Chọn hạng đấu" onChange={setCategoryId} options={(event.categories || []).map((category: any) => ({ value: category.id, label: `${category.sport?.name || ''} · ${category.name}` }))} />
          <Segmented value={view} onChange={(value) => setView(value as 'tree' | 'list')} options={[{ value: 'tree', label: 'Sơ đồ cây', icon: <Network className="h-4 w-4" /> }, { value: 'list', label: 'Danh sách', icon: <List className="h-4 w-4" /> }]} />
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => mutate()}>Làm mới</Button>
        </div>
      </Card>
      {view === 'tree' ? (
        <div className="space-y-5">
          {drawsLoading ? <Card loading /> : draws.length ? draws.map((draw) => <SportdataBracket key={draw.id} draw={draw} matchHref={(match) => `/cms/matches/${match.id}/edit`} />) : <Card><Empty description="Chưa sinh sơ đồ cây cho hạng đấu này." /></Card>}
        </div>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table<any>
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items || []}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: '#', dataIndex: 'matchNumber', width: 70 },
              { title: 'Vòng', dataIndex: 'round', width: 90 },
              { title: 'VĐV 1', dataIndex: ['athlete1', 'fullName'] },
              { title: 'VĐV 2', dataIndex: ['athlete2', 'fullName'] },
              { title: 'Sân', dataIndex: 'fop', width: 120 },
              { title: 'Trạng thái', dataIndex: 'status', width: 130, render: (value) => <Tag>{value}</Tag> },
              { title: '', width: 60, render: (_: unknown, match: any) => <Button type="text" href={`/cms/matches/${match.id}/edit`} icon={<Eye className="h-4 w-4" />} /> },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

function PaymentTab({ event, canEdit, onRefresh }: EventWorkspaceProps & { canEdit: boolean }) {
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const paymentMode = Form.useWatch('paymentMode', form);

  useEffect(() => {
    form.setFieldsValue({
      registrationEnabled: event.registrationEnabled,
      registrationOpenAt: dateTimeInput(event.registrationOpenAt),
      registrationCloseAt: dateTimeInput(event.registrationCloseAt),
      paymentMode: event.paymentMode || 'FREE',
      registrationFee: event.registrationFee || 0,
      registrationCurrency: event.registrationCurrency || 'VND',
    });
  }, [event, form]);

  const save = async (values: any) => {
    setSaving(true);
    try {
      await api.patch(`/events/${event.id}`, {
        ...values,
        registrationOpenAt: values.registrationOpenAt ? new Date(values.registrationOpenAt).toISOString() : null,
        registrationCloseAt: values.registrationCloseAt ? new Date(values.registrationCloseAt).toISOString() : null,
        registrationFee: values.paymentMode === 'FREE' ? 0 : values.registrationFee || 0,
      });
      await onRefresh();
      toast.success('Đã lưu cấu hình đăng ký và thanh toán.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu cấu hình payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={<span className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5 text-emerald-500" />Đăng ký & thanh toán</span>}>
      <Form form={form} layout="vertical" onFinish={save} disabled={!canEdit} className="max-w-4xl">
        <Form.Item name="registrationEnabled" label="Mở cổng đăng ký" valuePropName="checked"><Switch /></Form.Item>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item name="registrationOpenAt" label="Thời gian mở đăng ký"><Input type="datetime-local" /></Form.Item>
          <Form.Item name="registrationCloseAt" label="Thời gian đóng đăng ký"><Input type="datetime-local" /></Form.Item>
          <Form.Item name="paymentMode" label="Phương thức thanh toán"><Select options={paymentModeOptions} /></Form.Item>
          <Form.Item name="registrationFee" label="Lệ phí"><InputNumber className="w-full" min={0} disabled={!canEdit || paymentMode === 'FREE'} addonAfter={Form.useWatch('registrationCurrency', form) || 'VND'} /></Form.Item>
          <Form.Item name="registrationCurrency" label="Đơn vị tiền tệ"><Select options={[{ value: 'VND', label: 'VND' }, { value: 'USD', label: 'USD' }]} /></Form.Item>
        </div>
        {canEdit && <Button htmlType="submit" type="primary" loading={saving}>Lưu cấu hình payment</Button>}
      </Form>
    </Card>
  );
}

function TicketDesignTab({ event, canEdit, onRefresh }: EventWorkspaceProps & { canEdit: boolean }) {
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const selectedPreset = Form.useWatch('ticketThemePreset', form) || event.ticketThemePreset || 'OCEAN';
  const selectedLayout = Form.useWatch('ticketLayout', form) || event.ticketLayout || 'CLASSIC';
  const primaryColor = Form.useWatch('ticketPrimaryColor', form) || event.ticketPrimaryColor || '#0284C7';
  const secondaryColor = Form.useWatch('ticketSecondaryColor', form) || event.ticketSecondaryColor || '#075985';
  const accentColor = Form.useWatch('ticketAccentColor', form) || event.ticketAccentColor || '#059669';

  useEffect(() => {
    form.setFieldsValue({
      ticketThemePreset: event.ticketThemePreset || 'OCEAN',
      ticketLayout: event.ticketLayout || 'CLASSIC',
      ticketPrimaryColor: event.ticketPrimaryColor || '#0284C7',
      ticketSecondaryColor: event.ticketSecondaryColor || '#075985',
      ticketAccentColor: event.ticketAccentColor || '#059669',
    });
  }, [event, form]);

  const sampleTicket: ParticipationTicket = {
    ticketCode: 'SD-A6-PREVIEW',
    status: 'CONFIRMED',
    event: {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
      ticketBackgroundUrl: event.ticketBackgroundUrl,
      ticketThemePreset: selectedPreset,
      ticketLayout: selectedLayout,
      ticketPrimaryColor: primaryColor,
      ticketSecondaryColor: secondaryColor,
      ticketAccentColor: accentColor,
    },
    sport: event.sports?.[0] || event.sport,
    category: { name: event.categories?.[0]?.name || 'Hạng đấu / nội dung' },
    athlete: { fullName: 'NGUYỄN VĂN ĐỘNG VIÊN', country: { name: 'Việt Nam' }, federation: { name: 'Đơn vị / CLB' } },
  };

  const applyPreset = (preset: (typeof ticketThemePresets)[number]) => {
    form.setFieldsValue({
      ticketThemePreset: preset.value,
      ticketLayout: preset.layout,
      ticketPrimaryColor: preset.primary,
      ticketSecondaryColor: preset.secondary,
      ticketAccentColor: preset.accent,
    });
  };

  const saveTheme = async (values: any) => {
    setSavingTheme(true);
    try {
      await api.patch(`/events/${event.id}`, values);
      await onRefresh();
      toast.success('Đã lưu theme vé A6 cho sự kiện. Vé PDF mới sẽ dùng cấu hình này.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu theme vé.');
    } finally {
      setSavingTheme(false);
    }
  };

  const uploadProps: UploadProps = {
    accept: 'image/jpeg,image/png',
    showUploadList: false,
    disabled: !canEdit || uploading,
    beforeUpload: (file) => {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Ảnh nền vé chỉ hỗ trợ JPG hoặc PNG.');
        return Upload.LIST_IGNORE;
      }
      if (file.size > 6 * 1024 * 1024) {
        toast.error('Ảnh nền vé không được vượt quá 6 MB.');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      setUploading(true);
      try {
        const data = new FormData();
        data.append('file', file as File);
        await api.patch(`/events/${event.id}/ticket-background`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
        await onRefresh();
        toast.success('Đã cập nhật ảnh nền vé A6 cho sự kiện.');
        onSuccess?.({});
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Không thể tải ảnh nền vé.');
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  };

  const remove = async () => {
    try {
      await api.delete(`/events/${event.id}/ticket-background`);
      await onRefresh();
      toast.success('Đã xóa ảnh nền vé.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa ảnh nền vé.');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
      <Card title={<span className="flex items-center gap-2"><Palette className="h-5 w-5 text-sky-500" />Theme & nền vé</span>}>
        <Form
          form={form}
          layout="vertical"
          disabled={!canEdit}
          onFinish={saveTheme}
          onValuesChange={(changed) => {
            if ('ticketLayout' in changed || 'ticketPrimaryColor' in changed || 'ticketSecondaryColor' in changed || 'ticketAccentColor' in changed) {
              form.setFieldValue('ticketThemePreset', 'CUSTOM');
            }
          }}
        >
          <Form.Item name="ticketThemePreset" hidden><Input /></Form.Item>
          <Form.Item label="Bộ theme dựng sẵn">
            <div className="grid grid-cols-2 gap-3">
              {ticketThemePresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={`rounded-xl border p-3 text-left transition ${selectedPreset === preset.value ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500' : 'border-slate-200/15 hover:border-sky-500/60'}`}
                >
                  <span className="mb-2 flex gap-1.5">
                    {[preset.primary, preset.secondary, preset.accent].map((item) => <i key={item} className="h-4 w-4 rounded-full border border-white/30" style={{ backgroundColor: item }} />)}
                  </span>
                  <strong className="block">{preset.label}</strong>
                  <span className="mt-1 block text-xs text-slate-500">{preset.description}</span>
                </button>
              ))}
            </div>
          </Form.Item>

          <Form.Item name="ticketLayout" label={<span className="flex items-center gap-2"><LayoutTemplate className="h-4 w-4" />Bố cục vé</span>}>
            <Segmented block options={[{ value: 'CLASSIC', label: 'Cổ điển' }, { value: 'STRIPE', label: 'Dải màu' }, { value: 'MINIMAL', label: 'Tối giản' }]} />
          </Form.Item>

          <div className="grid grid-cols-3 gap-3">
            <Form.Item name="ticketPrimaryColor" label="Màu chính"><Input type="color" className="h-10 p-1" /></Form.Item>
            <Form.Item name="ticketSecondaryColor" label="Màu đậm"><Input type="color" className="h-10 p-1" /></Form.Item>
            <Form.Item name="ticketAccentColor" label="Điểm nhấn"><Input type="color" className="h-10 p-1" /></Form.Item>
          </div>

          {canEdit && <Button htmlType="submit" type="primary" block loading={savingTheme}>Lưu theme vé</Button>}
        </Form>

        <div className="mt-6 border-t border-slate-200/10 pt-6">
          <h3 className="font-bold">Ảnh nền riêng của sự kiện</h3>
          <p className="mb-4 mt-2 text-sm text-slate-500">Ảnh dọc đúng tỉ lệ A6 (105 × 148 mm), JPG/PNG tối đa 6 MB. Mỗi sự kiện có thể dùng nền riêng kết hợp với theme đã chọn.</p>
          <Space wrap>
            <Upload {...uploadProps}><Button loading={uploading} icon={<UploadCloud className="h-4 w-4" />}>{event.ticketBackgroundUrl ? 'Thay ảnh nền' : 'Tải ảnh nền'}</Button></Upload>
            {event.ticketBackgroundUrl && canEdit && <Popconfirm title="Xóa ảnh nền vé?" onConfirm={remove} okText="Xóa" cancelText="Hủy"><Button danger icon={<Trash2 className="h-4 w-4" />}>Xóa nền</Button></Popconfirm>}
          </Space>
        </div>
        <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-500">PDF xuất đúng A6. Bản xem trước, PDF tải xuống và vé gửi email đều dùng cùng theme của sự kiện.</div>
      </Card>
      <Card title="Xem trước vùng in A6" extra={<Tag color="blue">105 × 148 mm</Tag>}>
        <EventParticipationCard ticket={sampleTicket} />
      </Card>
    </div>
  );
}

function BracketTab({ event, canOperate }: { event: any; canOperate: boolean }) {
  const toast = useSportDataToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [categoryId, setCategoryId] = useState<string>(event.categories?.[0]?.id || '');
  const [format, setFormat] = useState<'SINGLE' | 'DOUBLE' | 'ROUND_ROBIN' | 'ABSOLUTE'>('SINGLE');
  const [seedingMode, setSeedingMode] = useState('STANDARD');
  const [groupCount, setGroupCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const category = event.categories?.find((item: any) => item.id === categoryId);
  const { data: entries = [], isLoading } = useSWR<any[]>(categoryId ? `/competitions/events/${event.id}/categories/${categoryId}/entries` : null, fetcher);
  const activeEntries = entries.filter((entry) => entry.status !== 'WITHDRAWN' && entry.athlete?.id);

  const generate = async () => {
    if (!categoryId || activeEntries.length < 2) {
      toast.error('Cần ít nhất 2 lượt đăng ký hợp lệ để sinh nhánh đấu.');
      return;
    }
    if (format === 'DOUBLE' && activeEntries.length < 4) {
      toast.error('Thể thức hai nhánh cần ít nhất 4 vận động viên.');
      return;
    }
    if (format === 'ABSOLUTE' && (category?.minWeight != null || category?.maxWeight != null)) {
      toast.error('Hạng Tuyệt đối phải là hạng mở, không cấu hình giới hạn cân nặng.');
      return;
    }
    setGenerating(true);
    try {
      if (format === 'ROUND_ROBIN') {
        await api.post(`/competitions/events/${event.id}/categories/${categoryId}/round-robin/generate`, {
          entryIds: activeEntries.map((entry) => entry.id),
          groupCount,
          namePrefix: 'Bảng',
        });
      } else {
        await api.post(`/matches/event/${event.id}/category/${categoryId}/generate-draw`, {
          athleteIds: activeEntries.map((entry) => entry.athlete.id),
          type: format === 'DOUBLE' ? 'DOUBLE_ELIMINATION' : 'MAIN_TREE',
          seedingMode,
          name: format === 'ABSOLUTE' ? 'Hạng Tuyệt đối' : undefined,
          fops: event.fops?.length ? event.fops.map((fop: any) => fop.name) : undefined,
        });
      }
      await Promise.all([
        mutateGlobal((key) => typeof key === 'string' && key.startsWith(`/matches/event/${event.id}/`)),
        mutateGlobal((key) => typeof key === 'string' && key.startsWith('/matches?')),
      ]);
      toast.success('Đã sinh thể thức và danh sách trận đấu tự động. Mở tab Trận đấu để xem sơ đồ cây.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể sinh nhánh đấu.');
    } finally {
      setGenerating(false);
    }
  };

  const formatCards = [
    { value: 'SINGLE', title: 'Loại trực tiếp', description: 'Thua một trận bị loại. Phù hợp phần lớn giải đấu.' },
    { value: 'DOUBLE', title: 'Hai nhánh / Repechage', description: 'Có nhánh thắng và nhánh thua, cho cơ hội tranh hạng.' },
    { value: 'ROUND_ROBIN', title: 'Đấu vòng tròn', description: 'Mọi VĐV trong bảng thi đấu với nhau, phù hợp bảng nhỏ.' },
    { value: 'ABSOLUTE', title: 'Tuyệt đối / Open Weight', description: 'Không giới hạn hạng cân; dùng cây loại trực tiếp.' },
  ] as const;

  return (
    <div className="space-y-5">
      <Card title="1. Chọn hạng đấu và thể thức">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {formatCards.map((item) => (
            <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`rounded-2xl border p-4 text-left transition ${format === item.value ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500' : 'border-slate-300/20 hover:border-sky-500/50'}`}>
              <strong className="block">{item.title}</strong>
              <span className="mt-2 block text-sm text-slate-500">{item.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Select value={categoryId || undefined} placeholder="Chọn hạng đấu" onChange={setCategoryId} options={(event.categories || []).map((item: any) => ({ value: item.id, label: `${item.sport?.name || ''} · ${item.name}` }))} />
          {format === 'ROUND_ROBIN' ? <InputNumber className="w-full" min={1} max={16} value={groupCount} onChange={(value) => setGroupCount(value || 1)} addonBefore="Số bảng" /> : <Select value={seedingMode} onChange={setSeedingMode} options={[{ value: 'STANDARD', label: 'Xếp hạt giống chuẩn' }, { value: 'RANDOM', label: 'Ngẫu nhiên' }, { value: 'COUNTRY_SEPARATED', label: 'Tách quốc gia' }, { value: 'FEDERATION_SEPARATED', label: 'Tách đơn vị / CLB' }]} />}
          <Button type="primary" disabled={!canOperate || activeEntries.length < 2} loading={generating} onClick={generate} icon={<Network className="h-4 w-4" />}>Sinh nhánh đấu tự động</Button>
        </div>
      </Card>
      <Card title={`2. Danh sách đầu vào (${activeEntries.length} VĐV)`} loading={isLoading}>
        {activeEntries.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{activeEntries.map((entry) => <div key={entry.id} className="rounded-xl border border-slate-300/15 px-3 py-2"><strong>{entry.athlete.fullName}</strong><div className="text-xs text-slate-500">Seed {entry.seed || '—'} · {entry.athlete.federation?.name || 'VĐV tự do'}</div></div>)}</div> : <Empty description="Chưa có lượt đăng ký đã xác nhận cho hạng đấu này." />}
      </Card>
    </div>
  );
}
