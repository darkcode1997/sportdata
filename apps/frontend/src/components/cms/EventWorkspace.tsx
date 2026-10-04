'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import useSWR, { useSWRConfig } from 'swr';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
  Tooltip,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  BadgeDollarSign,
  CalendarRange,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Images,
  List,
  MapPin,
  Network,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  Search,
  Settings2,
  TicketCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { ticketDesign, validateTicketDesign, type TicketDesign } from '@/lib/ticket-design';
import type { BracketDraw } from '@/components/brackets/SportdataBracket';
import type { ParticipationTicket } from '@/lib/ticket-types';
import { DrawPreconfiguration } from '@/components/cms/DrawPreconfiguration';
import { AthleteQuickViewModal } from '@/components/cms/AthleteQuickViewModal';
import { openCmsScoreboard, withCmsReturnTo } from '@/lib/cms-navigation';
import { MATCH_STATUS_META } from '@/lib/vi-labels';

const TicketDesignEditor = dynamic(() => import('@/components/cms/TicketDesignEditor').then((module) => module.TicketDesignEditor), { ssr: false });
const SportdataBracket = dynamic(() => import('@/components/brackets/SportdataBracket').then((module) => module.SportdataBracket), { ssr: false });

type EventWorkspaceProps = {
  event: any;
  onRefresh: () => Promise<any>;
};

type Registration = {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: string;
  feeAmount: number;
  currency: string;
  statusReason?: string | null;
  paymentStatusReason?: string | null;
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
  paymentTransactions?: Array<{
    orderId: string;
    provider: 'MOMO' | 'VNPAY' | 'BANK_QR' | 'VISA';
    status: string;
    amount: number;
    currency: string;
    createdAt: string;
  }>;
  competitionEntry?: { id: string; seed?: number | null; status: string } | null;
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  NOT_REQUIRED: { label: 'Miễn thanh toán', color: 'success' },
  PENDING: { label: 'Chờ thanh toán', color: 'processing' },
  PAID: { label: 'Đã duyệt', color: 'success' },
  FAILED: { label: 'Thanh toán thất bại', color: 'error' },
};

const paymentModeOptions = [
  { value: 'FREE', label: 'Miễn phí' },
  { value: 'MANUAL', label: 'Chuyển khoản QR · đối soát thủ công' },
  { value: 'ONLINE', label: 'Cổng thanh toán trực tuyến' },
];

const paymentProviderOptions = [
  { value: 'MOMO', label: 'Ví MoMo' },
  { value: 'VNPAY', label: 'VNPAY QR / ngân hàng' },
  { value: 'VISA', label: 'Visa / Mastercard qua VNPAY' },
  { value: 'BANK_QR', label: 'Chuyển khoản VietQR' },
];

const eventTabKeys = ['overview', 'registrations', 'fops', 'matches', 'payment', 'ticket', 'bracket'] as const;
type EventTabKey = typeof eventTabKeys[number];

function SeedInput({ value, disabled, onSave }: { value?: number | null; disabled?: boolean; onSave: (value: number | null) => void }) {
  const [draft, setDraft] = useState<number | null>(value ?? null);
  useEffect(() => setDraft(value ?? null), [value]);
  return (
    <InputNumber
      min={1}
      precision={0}
      value={draft}
      disabled={disabled}
      placeholder="Seed"
      className="w-full"
      onChange={(nextValue) => setDraft(nextValue == null ? null : Number(nextValue))}
      onBlur={() => {
        if ((draft ?? null) !== (value ?? null)) onSave(draft);
      }}
      onPressEnter={(event) => event.currentTarget.blur()}
    />
  );
}

function dateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function EventWorkspace({ event, onRefresh }: EventWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canEditEvent = ['ADMIN', 'CONTENT', 'GAMES_ADMIN'].includes(currentUser?.role);
  const canScore = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const canOperate = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const canConfirmPayment = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const requestedTab = searchParams.get('tab');
  const activeTab: EventTabKey = eventTabKeys.includes(requestedTab as EventTabKey)
    ? requestedTab as EventTabKey
    : 'overview';
  const workspaceHref = (tab: EventTabKey) => `/cms/events/${event.id}?tab=${tab}`;

  const selectTab = (tab: string) => {
    if (!eventTabKeys.includes(tab as EventTabKey)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs
      activeKey={activeTab}
      onChange={selectTab}
      size="large"
      destroyInactiveTabPane={false}
      items={[
        {
          key: 'overview',
          label: <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" />Tổng quan</span>,
          children: <EventOverview event={event} canEdit={canEditEvent} returnTo={workspaceHref('overview')} />,
        },
        {
          key: 'registrations',
          label: <span className="flex items-center gap-2"><TicketCheck className="h-4 w-4" />Đăng ký thi đấu</span>,
          children: <RegistrationsTab eventId={event.id} canOperate={canOperate} canConfirmPayment={canConfirmPayment} />,
        },
        {
          key: 'fops',
          label: <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />Sàn / FOP</span>,
          children: <FopsTab event={event} canOperate={canOperate} onRefresh={onRefresh} />,
        },
        {
          key: 'matches',
          label: <span className="flex items-center gap-2"><List className="h-4 w-4" />Trận đấu</span>,
          children: <MatchesTab event={event} returnTo={workspaceHref('matches')} canOperate={canOperate} canScore={canScore} canEditMatch={canEditEvent || canOperate} canEditBracket={canOperate} />,
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
          children: <BracketTab event={event} canOperate={canOperate} preconfigureActorId={canOperate ? currentUser?.id : undefined} />,
        },
      ]}
    />
  );
}

function EventOverview({ event, canEdit, returnTo }: { event: any; canEdit: boolean; returnTo: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card title="Thông tin sự kiện" extra={canEdit ? <Button href={withCmsReturnTo(`/cms/events/${event.id}/edit`, returnTo)} icon={<Pencil className="h-4 w-4" />}>Chỉnh sửa</Button> : null}>
        <Descriptions column={{ xs: 1, md: 2 }} colon={false}>
          <Descriptions.Item label="Tên sự kiện">{event.name}</Descriptions.Item>
          <Descriptions.Item label="Địa điểm">{event.location || 'Chưa cập nhật'}</Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">{new Date(event.startDate).toLocaleString('vi-VN')}</Descriptions.Item>
          <Descriptions.Item label="Kết thúc">{new Date(event.endDate).toLocaleString('vi-VN')}</Descriptions.Item>
          <Descriptions.Item label="Giới hạn tuổi" span={2}>
            {event.ageLimitMode === 'UNRESTRICTED'
              ? 'Không giới hạn tuổi'
              : event.ageLimitMode === 'CUSTOM'
                ? [event.minAge != null ? `Từ ${event.minAge} tuổi` : null, event.maxAge != null ? `Tối đa ${event.maxAge} tuổi` : null].filter(Boolean).join(' · ')
                : 'Theo độ tuổi của từng hạng đấu'}
          </Descriptions.Item>
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

function FopsTab({ event, canOperate, onRefresh }: EventWorkspaceProps & { canOperate: boolean }) {
  const toast = useSportDataToast();
  const { data: venues = [], isLoading: venuesLoading } = useSWR<any[]>(
    canOperate ? `/scheduling/venues?eventId=${event.id}` : null,
    fetcher,
  );
  const [form] = Form.useForm();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFop, setEditingFop] = useState<any>();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();
  const fops = useMemo(
    () => [...(event.fops || [])].sort((left: any, right: any) => left.name.localeCompare(right.name, 'vi')),
    [event.fops],
  );

  const openEditor = (fop?: any) => {
    setEditingFop(fop);
    form.setFieldsValue({ name: fop?.name || '', venueId: fop?.venueId || undefined });
    setEditorOpen(true);
  };

  const save = async (values: { name: string; venueId?: string }) => {
    setSaving(true);
    try {
      const payload = { name: values.name.trim(), venueId: values.venueId || null };
      if (editingFop) await api.patch(`/events/${event.id}/fops/${editingFop.id}`, payload);
      else await api.post(`/events/${event.id}/fops`, payload);
      await onRefresh();
      toast.success(editingFop ? 'Đã cập nhật sân/FOP.' : 'Đã thêm sân/FOP vào sự kiện.');
      setEditorOpen(false);
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join('. ') : message || 'Không thể lưu sân/FOP.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (fop: any) => {
    setDeletingId(fop.id);
    try {
      await api.delete(`/events/${event.id}/fops/${fop.id}`);
      await onRefresh();
      toast.success(`Đã xóa ${fop.name}.`);
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join('. ') : message || 'Không thể xóa sân/FOP.');
    } finally {
      setDeletingId(undefined);
    }
  };

  return (
    <>
      <Card
        title={`Danh sách Sàn / FOP (${fops.length})`}
        extra={canOperate ? <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openEditor()}>Thêm Sàn / FOP</Button> : null}
        styles={{ body: { padding: 0 } }}
      >
        <Table<any>
          rowKey="id"
          dataSource={fops}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty description="Sự kiện chưa có Sàn / FOP." /> }}
          columns={[
            {
              title: 'Tên Sàn / FOP',
              dataIndex: 'name',
              width: 260,
              render: (name: string) => <strong>{name}</strong>,
            },
            {
              title: 'Địa điểm',
              key: 'venue',
              render: (_: unknown, fop: any) => fop.venue?.name || <Tag>Chưa gán địa điểm</Tag>,
            },
            {
              title: 'Đang sử dụng',
              key: 'usage',
              width: 240,
              render: (_: unknown, fop: any) => (
                <Space wrap size={[4, 4]}>
                  <Tag color={fop._count?.matches ? 'blue' : 'default'}>{fop._count?.matches || 0} trận</Tag>
                  <Tag color={fop._count?.timeSlots ? 'cyan' : 'default'}>{fop._count?.timeSlots || 0} khung giờ</Tag>
                  {fop._count?.draws ? <Tag color="purple">{fop._count.draws} nhánh đấu</Tag> : null}
                </Space>
              ),
            },
            {
              title: '',
              key: 'actions',
              width: 120,
              fixed: 'right' as const,
              render: (_: unknown, fop: any) => {
                const isInUse = Boolean(fop._count?.matches || fop._count?.timeSlots || fop._count?.draws);
                return canOperate ? (
                  <Space>
                    <Button type="text" aria-label={`Chỉnh sửa ${fop.name}`} icon={<Pencil className="h-4 w-4" />} onClick={() => openEditor(fop)} />
                    <Popconfirm
                      title={`Xóa ${fop.name}?`}
                      description="Sân/FOP sẽ bị xóa khỏi sự kiện."
                      okText="Xóa"
                      cancelText="Hủy"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => remove(fop)}
                    >
                      <Button
                        danger
                        type="text"
                        disabled={isInUse}
                        loading={deletingId === fop.id}
                        title={isInUse ? 'Không thể xóa Sàn/FOP đang được sử dụng' : `Xóa ${fop.name}`}
                        aria-label={`Xóa ${fop.name}`}
                        icon={<Trash2 className="h-4 w-4" />}
                      />
                    </Popconfirm>
                  </Space>
                ) : null;
              },
            },
          ]}
        />
      </Card>

      <Modal
        open={editorOpen}
        title={editingFop ? 'Chỉnh sửa Sàn / FOP' : 'Thêm Sàn / FOP'}
        okText={editingFop ? 'Lưu thay đổi' : 'Thêm Sàn / FOP'}
        cancelText="Hủy"
        confirmLoading={saving}
        destroyOnHidden
        onOk={() => form.submit()}
        onCancel={() => !saving && setEditorOpen(false)}
        afterClose={() => {
          form.resetFields();
          setEditingFop(undefined);
        }}
      >
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item
            name="name"
            label="Tên Sàn / FOP"
            rules={[
              { required: true, whitespace: true, message: 'Nhập tên Sàn / FOP' },
              { max: 100, message: 'Tên không được vượt quá 100 ký tự' },
            ]}
          >
            <Input autoFocus placeholder="Ví dụ: FOP 1, Sân trung tâm" maxLength={100} />
          </Form.Item>
          <Form.Item name="venueId" label="Địa điểm" extra="Có thể để trống và gán địa điểm sau.">
            <Select
              allowClear
              showSearch
              loading={venuesLoading}
              optionFilterProp="label"
              placeholder="Chọn địa điểm"
              options={venues.map((venue: any) => ({ value: venue.id, label: venue.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

function RegistrationsTab({ eventId, canOperate, canConfirmPayment }: { eventId: string; canOperate: boolean; canConfirmPayment: boolean }) {
  const toast = useSportDataToast();
  const { data: registrations = [], isLoading, mutate } = useSWR<Registration[]>(`/participant-auth/admin/registrations?eventId=${eventId}`, fetcher);
  const [reviewChange, setReviewChange] = useState<{ kind: 'registration' | 'payment'; item: Registration; nextStatus: string }>();
  const [reviewReason, setReviewReason] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>();

  const submitStatusChange = async () => {
    if (!reviewChange || reviewReason.trim().length < 3) return;
    setReviewSaving(true);
    try {
      const endpoint = reviewChange.kind === 'payment'
        ? `/participant-auth/admin/registrations/${reviewChange.item.id}/payment-status`
        : `/participant-auth/admin/registrations/${reviewChange.item.id}/status`;
      await api.patch(endpoint, { status: reviewChange.nextStatus, reason: reviewReason.trim() });
      await mutate();
      toast.success(reviewChange.kind === 'payment'
        ? 'Đã cập nhật trạng thái thanh toán.'
        : reviewChange.nextStatus === 'CONFIRMED'
          ? 'Đã xác nhận hồ sơ và gửi lại vé A6 qua email.'
          : 'Đã cập nhật trạng thái đăng ký.');
      setReviewChange(undefined);
      setReviewReason('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setReviewSaving(false);
    }
  };

  const updateSeed = async (item: Registration, seed: number | null) => {
    if (!item.competitionEntry) return;
    try {
      await api.patch(`/competitions/entries/${item.competitionEntry.id}/seed`, { seed });
      await mutate();
      toast.success(seed ? `Đã đặt ${item.athlete.fullName} là hạt giống số ${seed}.` : 'Đã xóa hạt giống.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật hạt giống.');
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
    <>
    <Card
      title={`${registrations.length} lượt đăng ký`}
      extra={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => mutate()}>Làm mới</Button>}
      styles={{ body: { padding: 0 } }}
    >
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={registrations}
        scroll={{ x: 1700 }}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        locale={{ emptyText: 'Chưa có vận động viên đăng ký.' }}
        columns={[
          {
            title: 'Vận động viên',
            key: 'athlete',
            width: 250,
            render: (_, item) => <div><Button type="link" className="h-auto !p-0 font-semibold" onClick={() => setSelectedAthleteId(item.athlete.id)}>{item.athlete.fullName}</Button><div className="text-xs text-slate-500">{item.athlete.country?.code || '—'} · {item.athlete.federation?.name || 'VĐV tự do'} · {item.athlete.weight ? `${item.athlete.weight} kg` : 'chưa cân'}</div></div>,
          },
          { title: 'Hạng đấu', key: 'category', width: 240, render: (_, item) => `${item.category.sport?.name || ''} · ${item.category.name}` },
          {
            title: 'Hạt giống',
            key: 'seed',
            width: 130,
            render: (_, item) => (
              <SeedInput
                value={item.competitionEntry?.seed}
                disabled={!canOperate || !item.competitionEntry || item.status !== 'CONFIRMED'}
                onSave={(value) => void updateSeed(item, value)}
              />
            ),
          },
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
          {
            title: 'Thanh toán',
            key: 'payment',
            width: 210,
            render: (_, item) => {
              const badge = paymentStatusLabels[item.paymentStatus] || { label: item.paymentStatus, color: 'default' };
              return (
                <Space direction="vertical" size={4}>
                  {canConfirmPayment && item.paymentStatus !== 'NOT_REQUIRED' ? (
                    <Select
                      size="small"
                      value={item.paymentStatus}
                      className="min-w-40"
                      onChange={(nextStatus) => nextStatus !== item.paymentStatus && setReviewChange({ kind: 'payment', item, nextStatus })}
                      options={[
                        { value: 'PENDING', label: 'Chờ thanh toán' },
                        { value: 'PAID', label: 'Duyệt thanh toán' },
                        { value: 'FAILED', label: 'Thanh toán thất bại' },
                      ]}
                    />
                  ) : <Tag color={badge.color}>{badge.label}</Tag>}
                  {item.feeAmount > 0 ? <span className="text-xs tabular-nums text-slate-500">{new Intl.NumberFormat('vi-VN').format(item.feeAmount)} {item.currency}</span> : null}
                  {item.paymentStatusReason ? <span className="max-w-44 text-xs text-slate-500">Lý do: {item.paymentStatusReason}</span> : null}
                </Space>
              );
            },
          },
          {
            title: 'Vé A6 / mã hồ sơ',
            dataIndex: 'ticketCode',
            width: 240,
            render: (value, item) => {
              const ticketIssued = item.status === 'CONFIRMED'
                && (item.paymentStatus === 'PAID' || item.paymentStatus === 'NOT_REQUIRED');
              return (
                <Space>
                  <code>{value}</code>
                  {ticketIssued ? (
                    <Button type="text" size="small" href={`/api/participant-auth/tickets/${encodeURIComponent(value)}/pdf`} target="_blank" icon={<Download className="h-4 w-4" />} />
                  ) : (
                    <Tag>Chưa phát hành</Tag>
                  )}
                </Space>
              );
            },
          },
          {
            title: 'Trạng thái',
            key: 'status',
            fixed: 'right' as const,
            width: 180,
            render: (_, item) => {
              const states = new Map((item.athlete.media || []).map((media) => [media.type, media.verificationStatus]));
              const identityVerified = (states.get('CCCD_FRONT') === 'VERIFIED' && states.get('CCCD_BACK') === 'VERIFIED') || states.get('PASSPORT') === 'VERIFIED';
              return (
                <Space direction="vertical" size={4} className="w-full">
                  {canOperate ? (
                    <Select
                      value={item.status}
                      className="w-full"
                      onChange={(nextStatus) => nextStatus !== item.status && setReviewChange({ kind: 'registration', item, nextStatus })}
                      options={[
                        { value: 'SUBMITTED', label: 'Chờ duyệt' },
                        { value: 'CONFIRMED', label: identityVerified ? 'Đã xác nhận' : 'Cần xác thực giấy tờ', disabled: !identityVerified },
                        { value: 'REJECTED', label: 'Từ chối' },
                        { value: 'CANCELLED', label: 'Đã hủy' },
                      ]}
                    />
                  ) : <Tag>{item.status}</Tag>}
                  {item.statusReason ? <span className="max-w-44 text-xs text-slate-500">Lý do: {item.statusReason}</span> : null}
                </Space>
              );
            },
          },
        ]}
      />
    </Card>
    <Modal
      className="registration-review-modal"
      open={Boolean(reviewChange)}
      title={reviewChange?.kind === 'payment' ? 'Cập nhật trạng thái thanh toán' : 'Cập nhật trạng thái đăng ký'}
      width={560}
      centered
      destroyOnHidden
      okText="Xác nhận thay đổi"
      cancelText="Hủy"
      confirmLoading={reviewSaving}
      okButtonProps={{ disabled: reviewReason.trim().length < 3 }}
      onOk={() => void submitStatusChange()}
      onCancel={() => {
        if (!reviewSaving) {
          setReviewChange(undefined);
          setReviewReason('');
        }
      }}
    >
      <p className="registration-review-description text-sm text-slate-500">
        {reviewChange?.item.athlete.fullName} · Mọi thay đổi đều được lưu lịch sử để đối soát.
      </p>
      <div className="registration-review-reason">
        <Input.TextArea
          autoFocus
          rows={3}
          maxLength={1000}
          showCount
          value={reviewReason}
          onChange={(event) => setReviewReason(event.target.value)}
          placeholder="Nhập lý do thay đổi (bắt buộc, tối thiểu 3 ký tự)"
        />
      </div>
    </Modal>
    <AthleteQuickViewModal
      athleteId={selectedAthleteId}
      open={Boolean(selectedAthleteId)}
      onClose={() => setSelectedAthleteId(undefined)}
    />
    </>
  );
}

type MatchFilters = {
  athleteName?: string;
  opponentName?: string;
  matchNumber?: number;
  round?: number;
  status?: string;
  date?: string;
  venue?: string;
};

function MatchesTab({ event, returnTo, canOperate, canScore, canEditMatch, canEditBracket }: { event: any; returnTo: string; canOperate: boolean; canScore: boolean; canEditMatch: boolean; canEditBracket: boolean }) {
  const toast = useSportDataToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [categoryId, setCategoryId] = useState<string>(event.categories?.[0]?.id || '');
  const [view, setView] = useState<'tree' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<MatchFilters>({});
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>();
  const [distributingDates, setDistributingDates] = useState(false);
  const pageSize = 50;
  const query = new URLSearchParams({ eventId: event.id, limit: String(pageSize), page: String(page) });
  if (categoryId) query.set('categoryId', categoryId);
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value).trim());
  });
  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== null && String(value).trim());
  const columnFilter = (key: keyof MatchFilters, label: string, kind: 'text' | 'number' | 'date' = 'text'): ColumnType<any> => ({
    key,
    filteredValue: filters[key] !== undefined ? [String(filters[key])] : null,
    filterIcon: (filtered) => <Search className={`h-4 w-4 ${filtered ? 'text-blue-600' : ''}`} />,
    filterDropdown: ({ selectedKeys, setSelectedKeys, confirm, clearFilters }) => (
      <div className="space-y-3 p-3" style={{ width: 270 }} onKeyDown={(event) => event.stopPropagation()}>
        <div className="text-sm font-medium">{label}</div>
        {kind === 'number' ? (
          <InputNumber
            className="!w-full"
            min={1}
            max={2147483647}
            precision={0}
            aria-label={label}
            value={selectedKeys[0] ? Number(selectedKeys[0]) : null}
            onChange={(value) => setSelectedKeys(value === null ? [] : [String(value)])}
            onPressEnter={() => confirm()}
          />
        ) : (
          <Input
            autoFocus
            allowClear
            type={kind === 'date' ? 'date' : 'text'}
            aria-label={label}
            placeholder={label}
            value={String(selectedKeys[0] || '')}
            onChange={(event) => setSelectedKeys(event.target.value ? [event.target.value] : [])}
            onPressEnter={() => confirm()}
          />
        )}
        <Space>
          <Button type="primary" size="small" onClick={() => confirm()}>Áp dụng</Button>
          <Button size="small" onClick={() => clearFilters?.({ confirm: true, closeDropdown: true })}>Xóa</Button>
        </Space>
      </div>
    ),
  });
  const { data, error, isLoading, mutate } = useSWR<any>(`/matches?${query}`, fetcher, { refreshInterval: 5000 });
  const { data: drawData, isLoading: drawsLoading, mutate: mutateDraws } = useSWR<{ draws: BracketDraw[] }>(categoryId ? `/matches/event/${event.id}/category/${categoryId}/draws` : null, fetcher, { refreshInterval: 5000 });
  const draws = [...(drawData?.draws || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const loadError = Array.isArray(error?.response?.data?.message)
    ? error.response.data.message.join(', ')
    : error?.response?.data?.message || error?.message;
  const eventDayCount = Math.max(
    1,
    Math.floor((new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) / 86_400_000) + 1,
  );

  const distributeDates = async () => {
    setDistributingDates(true);
    try {
      const response = await api.post(`/matches/event/${event.id}/distribute-dates`);
      await Promise.all([
        mutate(),
        mutateDraws(),
        mutateGlobal((key) => typeof key === 'string' && (
          key.startsWith(`/matches?`) && key.includes(`eventId=${event.id}`)
          || key.startsWith(`/matches/event/${event.id}/`)
        )),
      ]);
      const result = response.data;
      toast.success(
        `Đã chia ${result.eligible} trận chưa xếp giờ vào ${result.usedDayCount}/${result.eventDayCount} ngày.${result.skippedScheduledOrLocked ? ` Giữ nguyên ${result.skippedScheduledOrLocked} trận đã xếp hoặc khóa.` : ''}`,
      );
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join('. ') : message || 'Không thể chia lịch theo ngày.');
    } finally {
      setDistributingDates(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card styles={{ body: { padding: 16 } }}>
        <div className="flex flex-wrap items-center gap-3">
          <Select className="min-w-72 flex-1" value={categoryId || undefined} placeholder="Chọn hạng đấu" onChange={(value) => { setCategoryId(value); setPage(1); }} options={(event.categories || []).map((category: any) => ({ value: category.id, label: `${category.sport?.name || ''} · ${category.name}` }))} />
          <Segmented value={view} onChange={(value) => setView(value as 'tree' | 'list')} options={[{ value: 'tree', label: 'Sơ đồ cây', icon: <Network className="h-4 w-4" /> }, { value: 'list', label: 'Danh sách', icon: <List className="h-4 w-4" /> }]} />
          <Popconfirm
            title="Chia đều trận đấu theo các ngày của sự kiện?"
            description="Chỉ đổi ngày của trận chưa có giờ thi đấu chính thức. Trận đã xếp giờ hoặc đã khóa sẽ được giữ nguyên."
            okText="Chia đều"
            cancelText="Hủy"
            onConfirm={distributeDates}
          >
            <Button
              icon={<CalendarRange className="h-4 w-4" />}
              loading={distributingDates}
              disabled={!canOperate || eventDayCount < 2 || !event._count?.matches}
            >
              Chia đều theo ngày
            </Button>
          </Popconfirm>
          <Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => Promise.all([mutate(), mutateDraws()])}>Làm mới</Button>
        </div>
      </Card>
      {view === 'tree' ? (
        <div className="space-y-5">
          {drawsLoading ? <Card loading /> : draws.length ? draws.map((draw) => <SportdataBracket key={draw.id} draw={draw} sourceMatches={draws.flatMap((item) => item.matches)} readOnly={!canEditBracket} matchHref={(match) => withCmsReturnTo(`/cms/matches/${match.id}/edit`, returnTo)} />) : <Card><Empty description="Chưa sinh sơ đồ cây cho hạng đấu này." /></Card>}
        </div>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <span className="text-sm text-slate-500">Bấm biểu tượng lọc trên tiêu đề cột để tìm trận. Lọc cả hai cột VĐV để tìm cặp đấu theo bất kỳ thứ tự nào.</span>
            {hasFilters && <Button onClick={() => { setFilters({}); setPage(1); }}>Xóa bộ lọc</Button>}
          </div>
          {error ? (
            <Alert
              className="m-4"
              type="error"
              showIcon
              message="Không thể tải danh sách trận đấu"
              description={loadError || 'Vui lòng thử làm mới danh sách.'}
            />
          ) : null}
          <Table<any>
            rowKey="id"
            loading={isLoading}
            dataSource={data?.items || []}
            locale={{ emptyText: <Empty description={hasFilters ? 'Không tìm thấy trận đấu phù hợp. Thử đổi hoặc xóa bộ lọc.' : 'Chưa có trận đấu trong hạng đấu này.'} /> }}
            scroll={{ x: 1100 }}
            onChange={(pagination, tableFilters, _sorter, extra) => {
              if (extra.action === 'filter') {
                const nextFilters: MatchFilters = {};
                Object.entries(tableFilters).forEach(([key, values]) => {
                  if (values?.[0] !== undefined && String(values[0]).trim()) {
                    Object.assign(nextFilters, { [key]: key === 'matchNumber' || key === 'round' ? Number(values[0]) : String(values[0]).trim() });
                  }
                });
                setFilters(nextFilters);
                setPage(1);
              } else if (extra.action === 'paginate') {
                setPage(pagination.current || 1);
              }
            }}
            pagination={{
              current: data?.meta?.page || page,
              pageSize,
              total: data?.meta?.total || 0,
              showSizeChanger: false,
              hideOnSinglePage: true,
              showTotal: (total) => `${total} trận đấu`,
            }}
            columns={[
              { title: '#', dataIndex: 'matchNumber', width: 90, ...columnFilter('matchNumber', 'Số trận', 'number') },
              { title: 'Vòng', dataIndex: 'round', width: 90, ...columnFilter('round', 'Vòng đấu', 'number') },
              {
                title: 'Ngày / giờ',
                ...columnFilter('date', 'Ngày thi đấu', 'date'),
                width: 185,
                render: (_: unknown, match: any) => match.startTime
                  ? new Date(match.startTime).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : `${new Date(match.matchDate).toLocaleDateString('vi-VN')} · Chưa xếp giờ`,
              },
              { title: 'VĐV 1', ...columnFilter('athleteName', 'Tên VĐV (ở bất kỳ bên nào)'), render: (_: unknown, match: any) => match.athlete1 ? <Button type="link" className="h-auto !p-0" onClick={() => setSelectedAthleteId(match.athlete1.id)}>{match.athlete1.fullName}</Button> : 'Chờ xác định' },
              { title: 'VĐV 2', ...columnFilter('opponentName', 'Tên đối thủ (ở bất kỳ bên nào)'), render: (_: unknown, match: any) => match.athlete2 ? <Button type="link" className="h-auto !p-0" onClick={() => setSelectedAthleteId(match.athlete2.id)}>{match.athlete2.fullName}</Button> : 'Chờ xác định' },
              { title: 'Sân', dataIndex: 'fop', width: 120, ...columnFilter('venue', 'Tên sân / sàn') },
              { title: 'Trạng thái', key: 'status', dataIndex: 'status', width: 150, filters: Object.entries(MATCH_STATUS_META).map(([value, meta]) => ({ value, text: meta.label })), filterMultiple: false, filteredValue: filters.status ? [filters.status] : null, render: (value: string) => <Tag color={MATCH_STATUS_META[value]?.color}>{MATCH_STATUS_META[value]?.label || value}</Tag> },
              { title: 'Điều hành', width: 190, render: (_: unknown, match: any) => {
                const ready = match.athlete1Id && match.athlete2Id && match.fopId && match.startTime && match.endTime;
                const playable = ['SCHEDULED', 'RUNNING'].includes(match.status);
                const reason = !canScore ? 'Bạn không có quyền chấm điểm' : !playable ? 'Trận đã kết thúc hoặc bị hủy' : !ready ? 'Cần đủ hai VĐV, sân và giờ thi đấu' : 'Mở bảng điểm; kiểm tra điều kiện trước khi bắt đầu';
                return <Space><Tooltip title={reason}><span><Button aria-label={`Mở bảng điểm trận ${match.matchNumber || match.id}`} type="primary" target="sportdata-scoreboard" onClick={(event) => openCmsScoreboard(event, match.id)} disabled={!canScore || !playable || !ready} href={canScore && playable && ready ? `/cms/matches/${match.id}/scoreboard` : undefined} icon={<Play className="h-4 w-4" />}>Bảng điểm</Button></span></Tooltip>{canEditMatch && <Button aria-label="Chỉnh sửa trận" type="text" href={withCmsReturnTo(`/cms/matches/${match.id}/edit`, returnTo)} icon={<Eye className="h-4 w-4" />} />}</Space>;
              } },
            ]}
          />
        </Card>
      )}
      <AthleteQuickViewModal athleteId={selectedAthleteId} open={Boolean(selectedAthleteId)} onClose={() => setSelectedAthleteId(undefined)} />
    </div>
  );
}

function PaymentTab({ event, canEdit, onRefresh }: EventWorkspaceProps & { canEdit: boolean }) {
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const paymentMode = Form.useWatch('paymentMode', form);
  const paymentProviders = Form.useWatch('paymentProviders', form) || [];
  const needsBank = paymentMode === 'MANUAL' || paymentProviders.includes('BANK_QR');
  const { data: gatewayConfig } = useSWR<{
    enabled: Record<string, boolean>;
    configured: Record<string, boolean>;
    paymentsEnabled: boolean;
    environment: string;
  }>('/payments/configuration', fetcher);

  useEffect(() => {
    form.setFieldsValue({
      registrationEnabled: event.registrationEnabled,
      registrationOpenAt: dateTimeInput(event.registrationOpenAt),
      registrationCloseAt: dateTimeInput(event.registrationCloseAt),
      paymentMode: event.paymentMode || 'FREE',
      registrationFee: event.registrationFee || 0,
      registrationCurrency: event.registrationCurrency || 'VND',
      paymentProviders: event.paymentProviders || [],
      bankCode: event.bankCode || '',
      bankAccountNumber: event.bankAccountNumber || '',
      bankAccountName: event.bankAccountName || '',
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
        registrationCurrency: 'VND',
        paymentProviders: values.paymentMode === 'FREE'
          ? []
          : values.paymentMode === 'MANUAL'
            ? ['BANK_QR']
            : values.paymentProviders,
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
        <Alert
          className="mb-5"
          showIcon
          type="info"
          message="SportData không lưu dữ liệu thẻ"
          description="MoMo, VNPAY và Visa/Mastercard chuyển người dùng sang trang bảo mật của nhà cung cấp. Chuyển khoản VietQR được CMS đối soát và xác nhận thủ công."
        />
        <Form.Item name="registrationEnabled" label="Mở cổng đăng ký" valuePropName="checked"><Switch /></Form.Item>
        <div className="grid gap-4 md:grid-cols-2">
          <Form.Item name="registrationOpenAt" label="Thời gian mở đăng ký"><Input type="datetime-local" /></Form.Item>
          <Form.Item name="registrationCloseAt" label="Thời gian đóng đăng ký"><Input type="datetime-local" /></Form.Item>
          <Form.Item name="paymentMode" label="Phương thức thanh toán"><Select options={paymentModeOptions} /></Form.Item>
          <Form.Item name="registrationFee" label="Lệ phí mỗi hạng đấu" rules={[{ validator: (_, value) => paymentMode === 'FREE' || Number(value) > 0 ? Promise.resolve() : Promise.reject(new Error('Lệ phí phải lớn hơn 0')) }]}><InputNumber<number> className="w-full" style={{ width: '100%', minWidth: 260 }} min={0} step={10000} precision={0} formatter={(value) => value == null ? '' : new Intl.NumberFormat('vi-VN').format(value)} parser={(value) => Number(String(value || '').replace(/[^0-9]/g, ''))} disabled={!canEdit || paymentMode === 'FREE'} addonAfter={Form.useWatch('registrationCurrency', form) || 'VND'} /></Form.Item>
          <Form.Item name="registrationCurrency" label="Đơn vị tiền tệ"><Select options={[{ value: 'VND', label: 'VND' }]} /></Form.Item>
        </div>

        {paymentMode === 'ONLINE' ? (
          <Form.Item
            name="paymentProviders"
            label="Cổng thanh toán hiển thị cho vận động viên"
            rules={[{ required: true, message: 'Chọn ít nhất một cổng thanh toán' }]}
          >
            <Checkbox.Group className="grid gap-3 sm:grid-cols-2" options={paymentProviderOptions.map((option) => ({
              ...option,
              label: (
                <span>
                  {option.label}{' '}
                  {gatewayConfig ? (
                    <Tag color={gatewayConfig.enabled[option.value] ? 'success' : gatewayConfig.configured[option.value] ? 'default' : 'warning'}>
                      {gatewayConfig.enabled[option.value]
                        ? 'Sẵn sàng'
                        : gatewayConfig.configured[option.value]
                          ? 'Đang tắt trong hệ thống'
                          : 'Thiếu cấu hình ENV'}
                    </Tag>
                  ) : null}
                </span>
              ),
            }))} />
          </Form.Item>
        ) : null}

        {needsBank ? (
          <Card size="small" className="mb-5" title="Tài khoản nhận chuyển khoản VietQR">
            <div className="grid gap-4 md:grid-cols-3">
              <Form.Item name="bankCode" label="Mã ngân hàng" rules={[{ required: true, message: 'Nhập mã ngân hàng' }]}>
                <Input placeholder="VD: VCB, BIDV, MB" />
              </Form.Item>
              <Form.Item name="bankAccountNumber" label="Số tài khoản" rules={[{ required: true, message: 'Nhập số tài khoản' }]}>
                <Input autoComplete="off" />
              </Form.Item>
              <Form.Item name="bankAccountName" label="Tên chủ tài khoản" rules={[{ required: true, message: 'Nhập tên chủ tài khoản' }]}>
                <Input placeholder="SPORTDATA VIET NAM" />
              </Form.Item>
            </div>
          </Card>
        ) : null}
        {canEdit && <Button htmlType="submit" type="primary" loading={saving}>Lưu cấu hình payment</Button>}
      </Form>
    </Card>
  );
}

function TicketDesignTab({ event, canEdit, onRefresh }: EventWorkspaceProps & { canEdit: boolean }) {
  const toast = useSportDataToast();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedDesign = JSON.stringify(event.ticketDesign || null);
  const [design, setDesign] = useState<TicketDesign>(() => ticketDesign(event.ticketDesign));
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(ticketDesign(event.ticketDesign)));
  useEffect(() => {
    const next = ticketDesign(JSON.parse(savedDesign));
    setDesign(next);
    setSavedSnapshot(JSON.stringify(next));
  }, [event.id, savedDesign]);
  const dirty = JSON.stringify(design) !== savedSnapshot;
  const sampleTicket: ParticipationTicket = {
    ticketCode: 'SD-A6-PREVIEW', status: 'CONFIRMED',
    event: { id: event.id, name: event.name, startDate: event.startDate, endDate: event.endDate, location: event.location, ticketBackgroundUrl: event.ticketBackgroundUrl },
    sport: event.sports?.[0] || event.sport,
    category: { name: event.categories?.[0]?.name || 'Hạng đấu / nội dung' },
    athlete: { fullName: 'NGUYỄN VĂN ĐỘNG VIÊN', country: { name: 'Việt Nam' }, federation: { name: 'Đơn vị / CLB' } },
  };
  const save = async () => {
    setSaving(true);
    try {
      const layout = validateTicketDesign(design);
      await api.patch(`/events/${event.id}`, { ticketDesign: layout });
      setDesign(layout); setSavedSnapshot(JSON.stringify(layout));
      await onRefresh();
      toast.success('Đã lưu bố cục. Vé tải xuống và gửi email sẽ dùng vị trí này.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Không thể lưu bố cục vé.');
    } finally { setSaving(false); }
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
    <Card title="Xem trước vùng in A6" extra={<Tag color="blue">105 × 148 mm</Tag>}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {canEdit && <>
          <Upload {...uploadProps}><Button loading={uploading} disabled={saving} icon={<UploadCloud className="h-4 w-4" />}>{event.ticketBackgroundUrl ? 'Thay ảnh nền' : 'Tải ảnh nền'}</Button></Upload>
          {event.ticketBackgroundUrl && <Popconfirm title="Xóa ảnh nền vé?" onConfirm={remove} okText="Xóa" cancelText="Hủy"><Button danger disabled={uploading || saving} icon={<Trash2 className="h-4 w-4" />}>Xóa nền</Button></Popconfirm>}
          <Button type="primary" loading={saving} disabled={uploading || !dirty} onClick={save}>Lưu bố cục vé</Button>
          {dirty && <Tag color="orange">Chưa lưu bố cục</Tag>}
        </>}
        <span className="text-sm text-slate-500">Nền JPG/PNG tối đa 6 MB, giữ nguyên màu. Nên dùng ảnh đúng tỉ lệ A6.</span>
      </div>
      <TicketDesignEditor key={event.id} ticket={sampleTicket} design={design} onChange={setDesign} disabled={!canEdit || saving} />
    </Card>
  );
}

function BracketTab({ event, canOperate, preconfigureActorId }: { event: any; canOperate: boolean; preconfigureActorId?: string }) {
  const toast = useSportDataToast();
  const { mutate: mutateGlobal } = useSWRConfig();
  const [categoryId, setCategoryId] = useState<string>(event.categories?.[0]?.id || '');
  const [format, setFormat] = useState<'SINGLE' | 'DOUBLE' | 'REPECHAGE' | 'ROUND_ROBIN' | 'ABSOLUTE'>('SINGLE');
  const [seedingMode, setSeedingMode] = useState('STANDARD');
  const [groupCount, setGroupCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [preconfigurationBusy, setPreconfigurationBusy] = useState(false);
  const category = event.categories?.find((item: any) => item.id === categoryId);
  const { data: entries = [], isLoading, mutate: mutateEntries } = useSWR<any[]>(categoryId ? `/competitions/events/${event.id}/categories/${categoryId}/entries` : null, fetcher);
  const { data: drawState, error: drawStateError, isLoading: drawStateLoading } = useSWR<{
    version: string; canRevert: boolean; drawCount: number; groupCount: number; matchCount: number; reason?: string;
  }>(canOperate && categoryId ? `/matches/event/${event.id}/category/${categoryId}/draw-state` : null, fetcher, { refreshInterval: 5000 });
  const hasDraws = !!drawState && (drawState.drawCount > 0 || drawState.groupCount > 0);
  const activeEntries = entries.filter((entry) => entry.status === 'VERIFIED' && entry.type === 'INDIVIDUAL' && entry.athlete?.id);
  const usesRoundRobin = format === 'ROUND_ROBIN' || (format === 'REPECHAGE' && activeEntries.length < 6);
  const drawType = format === 'ROUND_ROBIN' ? 'ROUND_ROBIN_POOL' : format === 'DOUBLE' ? 'DOUBLE_ELIMINATION' : format === 'REPECHAGE' ? 'REPECHAGE' : 'MAIN_TREE';
  const minimumEntries = format === 'DOUBLE' ? 4 : 2;

  const updateSeed = async (entry: any, seed: number | null) => {
    try {
      await api.patch(`/competitions/entries/${entry.id}/seed`, { seed });
      await mutateEntries();
      toast.success(seed ? `Đã đặt hạt giống số ${seed}.` : 'Đã xóa hạt giống.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật hạt giống.');
    }
  };

  const refreshDraws = async () => {
    await Promise.all([
      mutateGlobal((key) => {
        const url = typeof key === 'string' ? key : Array.isArray(key) ? key[0] : null;
        return typeof url === 'string' && (url.startsWith(`/matches/event/${event.id}/`) || url.startsWith('/matches?'));
      }),
      mutateEntries(),
    ]);
  };

  const revert = async () => {
    if (!drawState?.canRevert || reverting || generating) return;
    setReverting(true);
    try {
      await api.post(`/matches/event/${event.id}/category/${categoryId}/revert-draw`, { version: drawState.version });
      await refreshDraws();
      toast.success('Đã thu hồi nhánh đấu. Bạn có thể chỉnh seed và chia lại các cặp trận.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể thu hồi nhánh đấu.');
      await refreshDraws();
    } finally { setReverting(false); }
  };

  const generate = async () => {
    if (!categoryId || activeEntries.length < minimumEntries) {
      toast.error(`Cần ít nhất ${minimumEntries} lượt đăng ký hợp lệ để sinh nhánh đấu.`);
      return;
    }
    if (format === 'ABSOLUTE' && (category?.minWeight != null || category?.maxWeight != null)) {
      toast.error('Hạng Tuyệt đối phải là hạng mở, không cấu hình giới hạn cân nặng.');
      return;
    }
    setGenerating(true);
    try {
      await api.post(`/matches/event/${event.id}/category/${categoryId}/generate-draw`, {
        athleteIds: activeEntries.map((entry) => entry.athlete.id),
        type: drawType,
        seedingMode,
        groupCount: format === 'REPECHAGE' ? 1 : usesRoundRobin ? groupCount : undefined,
        name: format === 'ABSOLUTE' ? 'Hạng Tuyệt đối' : undefined,
        fops: event.fops?.length ? event.fops.map((fop: any) => fop.name) : undefined,
      });
      await refreshDraws();
      toast.success('Đã sinh thể thức và danh sách trận đấu tự động. Mở tab Trận đấu để xem sơ đồ cây.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể sinh nhánh đấu.');
    } finally {
      setGenerating(false);
    }
  };

  const formatCards = [
    { value: 'SINGLE', title: 'Loại trực tiếp', description: 'Thua một trận bị loại. Phù hợp phần lớn giải đấu.' },
    { value: 'DOUBLE', title: 'Loại kép', description: 'Thi đấu theo nhánh thắng, nhánh thua và trận chung kết.' },
    { value: 'REPECHAGE', title: 'Đấu vớt / Repechage', description: 'Nhánh chính tranh vàng/bạc, hai nhánh vớt tranh HCĐ. Dưới 6 VĐV tự động đấu vòng tròn.' },
    { value: 'ROUND_ROBIN', title: 'Đấu vòng tròn', description: 'Mọi VĐV trong bảng thi đấu với nhau, phù hợp bảng nhỏ.' },
    { value: 'ABSOLUTE', title: 'Tuyệt đối / Open Weight', description: 'Không giới hạn hạng cân; dùng cây loại trực tiếp.' },
  ] as const;

  return (
    <div className="space-y-5">
      <Card title="1. Chọn hạng đấu">
        <Select className="w-full" aria-label="Hạng đấu" value={categoryId || undefined} placeholder="Chọn hạng đấu" onChange={setCategoryId} options={(event.categories || []).map((item: any) => ({ value: item.id, label: `${item.sport?.name || ''} · ${item.name}` }))} />
      </Card>
      {preconfigureActorId && categoryId && !isLoading && <DrawPreconfiguration
        key={`${event.id}:${categoryId}:${drawType}:${format}:${preconfigureActorId}`}
        event={event} categoryId={categoryId} drawType={drawType} actorId={preconfigureActorId}
        entries={activeEntries} name={format === 'ABSOLUTE' ? 'Hạng Tuyệt đối' : undefined}
        onSeedingMode={setSeedingMode} onGroupCount={setGroupCount} onBusy={setPreconfigurationBusy}
      />}
      <Card title="2. Chọn thể thức">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {formatCards.map((item) => (
            <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`rounded-2xl border p-4 text-left transition ${format === item.value ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500' : 'border-slate-300/20 hover:border-sky-500/50'}`}>
              <strong className="block">{item.title}</strong>
              <span className="mt-2 block text-sm text-slate-500">{item.description}</span>
            </button>
          ))}
        </div>
        {format === 'REPECHAGE' && usesRoundRobin && <Alert className="!mt-4" type="info" showIcon message="Dưới 6 VĐV: tự động dùng vòng tròn. Cặp đặt trước áp dụng ở lượt đấu đầu." />}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {preconfigureActorId ? <span className="self-center text-sm text-slate-500">Cấu hình cặp và cách xếp trong Pre-matches phía trên.</span> : format === 'ROUND_ROBIN' ? <InputNumber className="w-full" min={1} max={Math.max(1, Math.min(16, Math.floor(activeEntries.length / 2)))} value={groupCount} onChange={(value) => setGroupCount(value || 1)} addonBefore="Số bảng" /> : usesRoundRobin ? <span className="self-center text-sm text-slate-500">Thi đấu vòng tròn trong một bảng.</span> : <Select value={seedingMode} onChange={setSeedingMode} options={[{ value: 'STANDARD', label: 'Xếp hạt giống chuẩn' }, { value: 'RANDOM', label: 'Ngẫu nhiên' }, { value: 'COUNTRY_SEPARATED', label: 'Tách quốc gia' }, { value: 'FEDERATION_SEPARATED', label: 'Tách đơn vị / CLB' }]} />}
          <Space wrap>
            <Button type="primary" disabled={!canOperate || isLoading || drawStateLoading || !!drawStateError || hasDraws || reverting || activeEntries.length < minimumEntries || (!!preconfigureActorId && preconfigurationBusy)} loading={generating} onClick={generate} icon={<Network className="h-4 w-4" />}>Sinh nhánh đấu tự động</Button>
            {canOperate && hasDraws && <Popconfirm
              title="Thu hồi nhánh đấu của hạng này?"
              description="Xóa nhánh và các trận đã sinh, gồm lịch đã xếp. Danh sách VĐV và seed được giữ để chia lại."
              okText="Thu hồi nhánh" cancelText="Hủy" okButtonProps={{ danger: true }}
              disabled={!drawState.canRevert || reverting || generating} onConfirm={revert}
            >
              <Button danger disabled={!drawState.canRevert || reverting || generating} loading={reverting}>Thu hồi nhánh đấu</Button>
            </Popconfirm>}
          </Space>
        </div>
        {!usesRoundRobin && <p className="mt-3 text-sm text-slate-500">Seed 1 và 2 ở hai nửa cây; các seed tiếp theo được phân đều để gặp nhau muộn. Ngẫu nhiên và tách quốc gia/CLB vẫn giữ vị trí seed.</p>}
        {hasDraws && <Alert className="!mt-4" showIcon type={drawState.canRevert ? 'info' : 'warning'}
          message={drawState.canRevert ? `Đã sinh ${drawState.matchCount} trận. Có thể thu hồi nhánh để chỉnh seed và chia lại trước khi bắt đầu thi đấu.` : drawState.reason} />}
        {drawStateError && <Alert className="!mt-4" showIcon type="error" message="Không thể kiểm tra trạng thái nhánh đấu. Hãy tải lại trang." />}
      </Card>
      <Card title={`3. Danh sách đầu vào (${activeEntries.length} VĐV)`} loading={isLoading}>
        {activeEntries.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{activeEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-300/15 px-3 py-2"><div className="min-w-0"><strong className="block truncate">{entry.athlete.fullName}</strong><div className="truncate text-xs text-slate-500">{entry.athlete.federation?.name || 'VĐV tự do'}</div></div><div className="w-24"><SeedInput value={entry.seed} disabled={!canOperate} onSave={(value) => void updateSeed(entry, value)} /></div></div>)}</div> : <Empty description="Chưa có lượt đăng ký đã xác nhận cho hạng đấu này." />}
      </Card>
    </div>
  );
}
