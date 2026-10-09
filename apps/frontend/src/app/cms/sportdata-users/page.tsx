'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Avatar, Button, Card, Input, Modal, Popconfirm, Select, Space, Statistic, Switch, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Eye, Mail, RefreshCw, Users } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { PERSONAL_ACCOUNT_OPTIONS, accountRoleLabel } from '@/lib/account-roles';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type SportDataUser = {
  id: string; email: string; displayName: string; phone?: string;
  accountType: string; isActive: boolean; verificationStatus: string;
  marketingEnabled: boolean; marketingEvents: boolean; marketingArticles: boolean;
  marketingConsentAt?: string; marketingUnsubscribedAt?: string; createdAt: string;
  federation?: { name: string };
  professionalSummary?: string;
  country?: { name: string };
  updatedAt: string;
  verificationNote?: string;
};
type Campaign = {
  id: string; kind: string; title: string; summary: string; enabled: boolean; createdAt: string;
  counts: Record<string, number>;
};
type Delivery = {
  id: string; status: string; attempts: number; sentAt?: string; lastError?: string;
  account: { displayName: string; email: string };
};
type Config = { enabled: boolean; smtpConfigured: boolean; frontendConfigured: boolean; production: boolean };
const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Chờ gửi', color: 'gold' }, RUNNING: { label: 'Đang gửi', color: 'processing' },
  SENT: { label: 'Đã gửi', color: 'success' }, FAILED: { label: 'Thất bại', color: 'error' },
  SKIPPED: { label: 'Bỏ qua', color: 'default' },
};
const date = (value?: string) => value ? new Date(value).toLocaleString('vi-VN') : '—';

export default function SportDataUsersPage() {
  const toast = useSportDataToast();
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState<string>();
  const [subscription, setSubscription] = useState<string>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Campaign>();
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [preview, setPreview] = useState<{ subject: string; html: string }>();
  const [processing, setProcessing] = useState(false);
  const [reviewingUser, setReviewingUser] = useState<SportDataUser>();
  const [professionalReviewNote, setProfessionalReviewNote] = useState('');
  const [busy, setBusy] = useState<string>();
  const params = new URLSearchParams({ page: String(page), limit: '20', search });
  if (accountType) params.set('accountType', accountType);
  if (subscription) params.set('subscription', subscription);
  const users = useSWR<{ items: SportDataUser[]; total: number; subscribed: number; active: number }>(`/marketing/users?${params}`, fetcher);
  const campaigns = useSWR<Campaign[]>('/marketing/campaigns', fetcher, { refreshInterval: 15000 });
  const config = useSWR<Config>('/marketing/config', fetcher);
  const deliveries = useSWR<{ items: Delivery[]; total: number }>(selected ? `/marketing/campaigns/${selected.id}/deliveries?page=${deliveryPage}&limit=20` : null, fetcher, { refreshInterval: 15000 });

  const action = async (key: string, operation: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await operation();
      await Promise.all([users.mutate(), campaigns.mutate(), config.mutate(), deliveries.mutate()]);
      toast.success('Đã cập nhật');
    } catch { toast.error('Không thể cập nhật. Vui lòng thử lại.'); }
    finally { setBusy(undefined); }
  };

  const processQueue = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post<{ processed: number; ready: boolean }>('/marketing/process');
      if (!data.ready) toast.warning('Chưa thể gửi. Kiểm tra trạng thái tự động gửi và cấu hình email.');
      else toast.success(`Đã xử lý ${data.processed} email trong hàng đợi.`);
      await campaigns.mutate();
      await deliveries.mutate();
    } catch { toast.error('Không thể xử lý hàng đợi.'); }
    finally { setProcessing(false); }
  };

  const columns: ColumnsType<SportDataUser> = [
    { title: 'Người dùng', key: 'user', render: (_, user) => <Space><Avatar style={{ background: '#075985' }}>{user.displayName.slice(0, 1).toUpperCase()}</Avatar><div><div className="font-semibold">{user.displayName}</div><div className="text-xs text-slate-400">{user.email}</div></div></Space> },
    { title: 'Loại tài khoản', key: 'type', render: (_, user) => <><Tag color={user.accountType === 'FEDERATION' ? 'purple' : 'cyan'}>{accountRoleLabel(user.accountType)}</Tag>{user.federation && <div className="mt-1 text-xs text-slate-400">{user.federation.name}</div>}{user.accountType !== 'FEDERATION' && <Select className="mt-2" style={{ width: 175 }} value={user.accountType} options={[...PERSONAL_ACCOUNT_OPTIONS]} disabled={busy === user.id} onChange={accountType => action(user.id, () => api.patch(`/participant-roles/accounts/${user.id}/type`, { accountType }))} />}</> },
    { title: 'Hồ sơ chuyên môn', key: 'review', render: (_, user) => !['GENERAL', 'ATHLETE', 'FEDERATION'].includes(user.accountType) ? <><Tag color={user.verificationStatus === 'VERIFIED' ? 'success' : user.verificationStatus === 'REJECTED' ? 'error' : 'gold'}>{user.verificationStatus === 'VERIFIED' ? 'Đã xác minh' : user.verificationStatus === 'REJECTED' ? 'Từ chối' : 'Chờ xác minh'}</Tag><Button className="mt-2" onClick={() => { setReviewingUser(user); setProfessionalReviewNote(''); }}>Xem và xác minh</Button></> : '—' },
    { title: 'Số điện thoại', dataIndex: 'phone', render: value => value || '—' },
    { title: 'Nhận email giới thiệu', key: 'marketing', render: (_, user) => <div><Tag color={user.marketingEnabled ? 'success' : 'default'}>{user.marketingEnabled ? 'Đã đăng ký' : 'Không nhận tin'}</Tag>{user.marketingEnabled && <div className="mt-1 text-xs text-slate-400">{[user.marketingEvents && 'Sự kiện', user.marketingArticles && 'Bài viết'].filter(Boolean).join(' · ') || 'Chưa chọn chủ đề'}<br />Đồng ý: {date(user.marketingConsentAt)}</div>}{user.marketingUnsubscribedAt && <div className="text-xs text-slate-400">Hủy nhận: {date(user.marketingUnsubscribedAt)}</div>}</div> },
    { title: 'Tài khoản', key: 'active', render: (_, user) => <Popconfirm title={user.isActive ? 'Vô hiệu hóa tài khoản này?' : 'Kích hoạt tài khoản này?'} description={user.isActive ? 'Người dùng sẽ không thể đăng nhập và nhận email giới thiệu.' : undefined} onConfirm={() => action(user.id, () => api.patch(`/marketing/users/${user.id}/status`, { isActive: !user.isActive }))}><Switch checked={user.isActive} loading={busy === user.id} checkedChildren="Hoạt động" unCheckedChildren="Đã khóa" /></Popconfirm> },
    { title: 'Ngày tham gia', dataIndex: 'createdAt', render: date },
  ];
  const campaignColumns: ColumnsType<Campaign> = [
    { title: 'Chiến dịch', key: 'title', render: (_, item) => <div><Tag color={item.kind === 'EVENT' ? 'cyan' : 'purple'}>{item.kind === 'EVENT' ? 'Sự kiện mới' : 'Bài viết mới'}</Tag><div className="mt-2 font-semibold">{item.title}</div><div className="mt-1 text-xs text-slate-400">{date(item.createdAt)}</div></div> },
    { title: 'Người nhận', key: 'total', render: (_, item) => Object.values(item.counts).reduce((sum, count) => sum + count, 0) },
    ...['SENT', 'PENDING', 'FAILED', 'SKIPPED'].map(status => ({ title: statusLabels[status].label, key: status, render: (_: unknown, item: Campaign) => <Tag color={statusLabels[status].color}>{(item.counts[status] || 0) + (status === 'PENDING' ? item.counts.RUNNING || 0 : 0)}</Tag> })),
    { title: 'Gửi tự động', key: 'enabled', render: (_, item) => <Switch checked={item.enabled} loading={busy === item.id} onChange={enabled => action(item.id, () => api.patch(`/marketing/campaigns/${item.id}`, { enabled }))} /> },
    { title: 'Thao tác', key: 'actions', render: (_, item) => <Space wrap><Button icon={<Eye className="h-4 w-4" />} onClick={async () => { try { setPreview((await api.get(`/marketing/campaigns/${item.id}/preview`)).data); } catch { toast.error('Không thể tải bản xem trước.'); } }}>Xem email</Button><Button onClick={() => { setSelected(item); setDeliveryPage(1); }}>Chi tiết</Button>{Boolean(item.counts.FAILED) && <Popconfirm title="Thử lại các email thất bại?" onConfirm={() => action(item.id, () => api.post(`/marketing/campaigns/${item.id}/retry`))}><Button>Thử lại</Button></Popconfirm>}</Space> },
  ];

  return <div className="space-y-6">
    <CmsPageHeader title="Người dùng SportData" description="Quản lý cộng đồng và kết nối người dùng với các sự kiện, bài viết mới." icon={<Users className="h-7 w-7" />} action={<Button icon={<RefreshCw className="h-4 w-4" />} onClick={() => { void users.mutate(); void campaigns.mutate(); void config.mutate(); }}>Làm mới</Button>} />
    {(users.error || campaigns.error || config.error) && <Alert showIcon type="error" message="Không thể tải dữ liệu" description="Vui lòng kiểm tra kết nối và chạy migration database của phiên bản này." />}
    <div className="grid gap-4 sm:grid-cols-3">
      <Card><Statistic title="Tài khoản đang hoạt động" value={users.data?.active ?? 0} prefix={<Users className="h-5 w-5" />} /></Card>
      <Card><Statistic title="Đăng ký nhận email" value={users.data?.subscribed ?? 0} prefix={<Mail className="h-5 w-5" />} /></Card>
      <Card><Statistic title="Chiến dịch gần đây" value={campaigns.data?.length ?? 0} suffix="/ 50" /></Card>
    </div>
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-lg font-semibold">Email giới thiệu tự động</h2><p className="mt-1 text-sm text-slate-400">Gửi khi xuất bản lần đầu, theo chủ đề người dùng đã chọn. Tạm dừng sẽ giữ email trong hàng đợi.</p></div>
        <Switch checked={config.data?.enabled ?? false} disabled={!config.data} loading={busy === 'config'} checkedChildren="Đang bật" unCheckedChildren="Tạm dừng" onChange={enabled => action('config', () => api.patch('/marketing/config', { enabled }))} />
      </div>
      {config.data && (!config.data.smtpConfigured || !config.data.frontendConfigured || !config.data.production) && <Alert className="mt-4" showIcon type="warning" message="Email chưa sẵn sàng gửi" description={[!config.data.smtpConfigured && 'Cấu hình SMTP và địa chỉ gửi tại Cài đặt hệ thống.', !config.data.frontendConfigured && 'Thiết lập FRONTEND_URL cho đường dẫn trong email.', !config.data.production && 'Môi trường preview không gửi email marketing.'].filter(Boolean).join(' ')} />}
    </Card>
    <Tabs items={[
      { key: 'users', label: 'Danh sách người dùng', children: <Card><Space wrap className="mb-5"><Input.Search placeholder="Tìm tên, email, số điện thoại" allowClear onSearch={value => { setSearch(value); setPage(1); }} style={{ width: 300 }} /><Select placeholder="Loại tài khoản" allowClear style={{ width: 160 }} value={accountType} onChange={value => { setAccountType(value); setPage(1); }} options={[...PERSONAL_ACCOUNT_OPTIONS, { value: 'FEDERATION', label: accountRoleLabel('FEDERATION') }]} /><Select placeholder="Trạng thái nhận tin" allowClear style={{ width: 190 }} value={subscription} onChange={value => { setSubscription(value); setPage(1); }} options={[{ value: 'subscribed', label: 'Đã đăng ký' }, { value: 'unsubscribed', label: 'Không nhận tin' }]} /></Space><Table rowKey="id" columns={columns} dataSource={users.data?.items || []} loading={users.isLoading} scroll={{ x: 1100 }} pagination={{ current: page, pageSize: 20, total: users.data?.total, showSizeChanger: false, onChange: setPage }} /><p className="mt-4 text-xs text-slate-400">Người dùng tự quản lý quyền nhận tin trong trang tài khoản. Email giao dịch và vé tham dự hoạt động độc lập với email giới thiệu.</p></Card> },
      { key: 'campaigns', label: 'Chiến dịch email', children: <Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-400">Hiển thị 50 chiến dịch mới nhất. Sửa hoặc xuất bản lại không gửi chiến dịch trùng.</p><Button type="primary" loading={processing} onClick={processQueue} icon={<Mail className="h-4 w-4" />}>Xử lý email đang chờ</Button></div><Table rowKey="id" columns={campaignColumns} dataSource={campaigns.data || []} loading={campaigns.isLoading} scroll={{ x: 1200 }} pagination={{ pageSize: 10 }} /></Card> },
    ]} />
    <Modal title={preview?.subject || 'Xem trước email'} open={Boolean(preview)} onCancel={() => setPreview(undefined)} footer={null} width={720}><iframe title="Bản xem trước email SportData" srcDoc={preview?.html} sandbox="" style={{ width: '100%', height: 650, border: 0 }} /></Modal>
    <Modal title="Xác minh hồ sơ chuyên môn" open={Boolean(reviewingUser)} onCancel={() => setReviewingUser(undefined)} footer={null}>
      <p className="font-semibold">{reviewingUser?.displayName} · {accountRoleLabel(reviewingUser?.accountType || '')}</p>
      <p className="mt-2">{reviewingUser?.email} · {reviewingUser?.phone || 'Chưa có điện thoại'}</p>
      <p className="mt-2">{reviewingUser?.country?.name} · {reviewingUser?.federation?.name || 'Chưa có đơn vị'}</p>
      <p className="my-5 whitespace-pre-wrap">{reviewingUser?.professionalSummary || 'Chưa có thông tin chuyên môn'}</p>
      {reviewingUser?.verificationNote && <p className="mb-4">Ý kiến trước: {reviewingUser.verificationNote}</p>}
      <Input.TextArea className="mb-4" rows={3} value={professionalReviewNote} onChange={event => setProfessionalReviewNote(event.target.value)} placeholder="Kết quả kiểm tra, hướng dẫn bổ sung hoặc lý do từ chối" />
      <Alert showIcon type="info" message="Kiểm tra chứng chỉ, chuyên môn hoặc quyền đại diện đơn vị trước khi xác minh. Xác minh hồ sơ không cấp quyền CMS và không thay thế duyệt nhiệm vụ sự kiện." />
      <Space className="mt-5"><Button type="primary" loading={busy === reviewingUser?.id} onClick={() => { if (reviewingUser) void action(reviewingUser.id, async () => { await api.patch(`/participant-roles/accounts/${reviewingUser.id}/review`, { status: 'VERIFIED', expectedUpdatedAt: reviewingUser.updatedAt, reviewNote: professionalReviewNote }); setReviewingUser(undefined); }); }}>Đã xác minh</Button><Button danger onClick={() => { if (reviewingUser) void action(reviewingUser.id, async () => { await api.patch(`/participant-roles/accounts/${reviewingUser.id}/review`, { status: 'REJECTED', expectedUpdatedAt: reviewingUser.updatedAt, reviewNote: professionalReviewNote }); setReviewingUser(undefined); }); }}>Từ chối</Button></Space>
    </Modal>
    <Modal title={`Người nhận · ${selected?.title || ''}`} open={Boolean(selected)} onCancel={() => setSelected(undefined)} footer={null} width={950}>
      {deliveries.error && <Alert showIcon type="error" message="Không thể tải chi tiết chiến dịch." />}
      <Table<Delivery> rowKey="id" loading={deliveries.isLoading} dataSource={deliveries.data?.items || []} scroll={{ x: 700 }} pagination={{ current: deliveryPage, pageSize: 20, total: deliveries.data?.total, showSizeChanger: false, onChange: setDeliveryPage }} columns={[
        { title: 'Người nhận', key: 'recipient', render: (_, item) => <div>{item.account.displayName}<div className="text-xs text-slate-400">{item.account.email}</div></div> },
        { title: 'Trạng thái', dataIndex: 'status', render: value => <Tag color={statusLabels[value]?.color}>{statusLabels[value]?.label || value}</Tag> },
        { title: 'Số lần thử', dataIndex: 'attempts' }, { title: 'Gửi lúc', dataIndex: 'sentAt', render: date },
        { title: 'Lỗi gần nhất', dataIndex: 'lastError', render: value => value || '—' },
      ]} />
    </Modal>
  </div>;
}
