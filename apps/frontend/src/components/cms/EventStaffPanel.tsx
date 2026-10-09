'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Checkbox, Input, Modal, Select, Space, Table, Tag } from 'antd';
import { api, fetcher } from '@/lib/api';
import { accountRoleLabel, PARTICIPATION_STATUS } from '@/lib/account-roles';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type StaffApplication = {
  id: string; role: string; status: string; note?: string; reviewNote?: string;
  account: { displayName: string; email: string; phone?: string; accountType: string; verificationStatus: string; professionalSummary?: string; federation?: { name: string } };
};
export function EventStaffPanel({ eventId }: { eventId: string }) {
  const toast = useSportDataToast();
  const { data = [], isLoading, error, mutate } = useSWR<StaffApplication[]>(`/participant-roles/events/${eventId}/applications`, fetcher);
  const [reviewing, setReviewing] = useState<StaffApplication>();
  const [status, setStatus] = useState('APPROVED');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);
  const save = async () => {
    if (!reviewing) return;
    setSaving(true);
    try { await api.patch(`/participant-roles/applications/${reviewing.id}/review`, { status, reviewNote: note, qualificationVerified: verified }); await mutate(); setReviewing(undefined); toast.success('Đã cập nhật hồ sơ nhân sự'); }
    catch (requestError: any) { toast.error(requestError.response?.data?.message || 'Không thể duyệt hồ sơ'); }
    finally { setSaving(false); }
  };
  return <Card title="Nhân sự chuyên môn và trưởng đoàn" className="mb-6">
    <p className="mb-4 text-sm text-slate-400">Kiểm tra chuyên môn phù hợp và duyệt nhiệm vụ cho từng sự kiện. Hồ sơ cá nhân, vai trò sự kiện và quyền CMS được quản lý riêng.</p>
    {error && <p className="text-red-400">Không thể tải danh sách nhân sự</p>}
    <Table rowKey="id" dataSource={data} loading={isLoading} scroll={{ x: 800 }} columns={[
      { title: 'Người đăng ký', key: 'account', render: (_, item) => <div><strong>{item.account.displayName}</strong><div className="text-xs text-slate-400">{item.account.email} · {item.account.phone || '—'}</div>{item.account.federation?.name}</div> },
      { title: 'Vai trò', dataIndex: 'role', render: accountRoleLabel },
      { title: 'Hồ sơ cá nhân', key: 'profile', render: (_, item) => ['GENERAL', 'ATHLETE'].includes(item.account.accountType) ? <Tag>{accountRoleLabel(item.account.accountType)}</Tag> : <Tag color={item.account.verificationStatus === 'VERIFIED' ? 'success' : 'gold'}>{item.account.verificationStatus === 'VERIFIED' ? 'Chuyên môn đã xác minh' : 'Chuyên môn chờ xác minh'}</Tag> },
      { title: 'Nhiệm vụ', dataIndex: 'status', render: value => <Tag color={value === 'APPROVED' ? 'success' : value === 'REJECTED' ? 'error' : 'processing'}>{PARTICIPATION_STATUS[value]}</Tag> },
      { title: 'Thao tác', key: 'actions', render: (_, item) => <Button disabled={item.status === 'CANCELLED'} onClick={() => { setReviewing(item); setStatus('APPROVED'); setNote(item.reviewNote || ''); setVerified(false); }}>Xem và duyệt</Button> },
    ]} />
    <Modal title="Duyệt nhiệm vụ sự kiện" open={Boolean(reviewing)} onCancel={() => setReviewing(undefined)} onOk={save} confirmLoading={saving}>
      {status === 'APPROVED' && <Checkbox className="mb-4" checked={verified} onChange={event => setVerified(event.target.checked)}>Tôi đã kiểm tra chuyên môn, chứng chỉ hoặc quyền đại diện phù hợp với nhiệm vụ này.</Checkbox>}
      <Space direction="vertical" className="w-full"><strong>{reviewing?.account.displayName} · {accountRoleLabel(reviewing?.role || '')}</strong><p>{reviewing?.account.professionalSummary || 'Chưa có thông tin chuyên môn'}</p><p>{reviewing?.note}</p><Select className="w-full" value={status} onChange={setStatus} options={[{ value: 'APPROVED', label: 'Phê duyệt nhiệm vụ' }, { value: 'REJECTED', label: 'Từ chối' }, { value: 'CANCELLED', label: 'Thu hồi nhiệm vụ' }]} /><Input.TextArea rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Phân công, hướng dẫn hoặc lý do từ chối" /></Space>
    </Modal>
  </Card>;
}
