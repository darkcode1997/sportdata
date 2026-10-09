'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, Select, Spin, Tag } from 'antd';
import { participantApi, participantError } from '@/lib/participant-auth';
import { STAFF_ROLE_OPTIONS, PARTICIPATION_STATUS, accountRoleLabel } from '@/lib/account-roles';
import { fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

export function StaffEventRegistration({ eventId, accountType }: { eventId: string; accountType?: string }) {
  const toast = useSportDataToast();
  const [saving, setSaving] = useState(false);
  const { data: event, error } = useSWR<{ name: string; endDate: string }>(`/events/${eventId}`, fetcher);
  const applications = useSWR<Array<{ id: string; eventId: string; role: string; status: string; reviewNote?: string }>>('/participant-roles/applications/me', url => participantApi.get(url).then(response => response.data));
  const current = applications.data?.find(item => item.eventId === eventId);
  const apply = async (values: { role: string; note?: string }) => {
    setSaving(true);
    try { await participantApi.post('/participant-roles/applications', { ...values, eventId }); await applications.mutate(); toast.success('Đã gửi hồ sơ cho ban tổ chức'); }
    catch (requestError) { toast.error(participantError(requestError)); }
    finally { setSaving(false); }
  };
  return <main className="mx-auto min-h-[70vh] max-w-3xl px-4 py-10">
    <Link href={`/events/${eventId}`} className="mb-6 inline-block text-sky-400">← Thông tin sự kiện</Link>
    <Card title={`Đăng ký nhân sự · ${event?.name || 'SportData'}`}>
      <p className="mb-6 text-slate-400">Đăng ký nhiệm vụ chuyên môn tại sự kiện. Ban tổ chức xác minh hồ sơ và phân công; hồ sơ này không tạo vận động viên hoặc quyền CMS.</p>
      {(error || applications.error) ? <Alert type="error" showIcon message="Không thể tải hồ sơ. Vui lòng đăng nhập lại hoặc thử lại." /> : !applications.data ? <Spin /> : current && ['PENDING', 'APPROVED'].includes(current.status) ? <>
        <Tag color={current.status === 'APPROVED' ? 'success' : 'processing'}>{PARTICIPATION_STATUS[current.status]}</Tag>
        <p className="mt-4">Vai trò: {accountRoleLabel(current.role)}</p>
        {current.reviewNote && <p className="mt-3">Ban tổ chức: {current.reviewNote}</p>}
        <Button className="mt-5" onClick={async () => { try { await participantApi.patch(`/participant-roles/applications/${current.id}/cancel`); await applications.mutate(); } catch (requestError) { toast.error(participantError(requestError)); } }}>Hủy hồ sơ</Button>
      </> : <>
        {current && <Alert className="mb-4" showIcon type="info" message={PARTICIPATION_STATUS[current.status]} description={current.reviewNote} />}
        <Form layout="vertical" onFinish={apply} initialValues={{ role: STAFF_ROLE_OPTIONS.some(option => option.value === accountType) ? accountType : undefined }}>
          <Form.Item name="role" label="Vai trò tại sự kiện" rules={[{ required: true }]}><Select options={STAFF_ROLE_OPTIONS} /></Form.Item>
          <Form.Item name="note" label="Giới thiệu chuyên môn, thời gian có thể tham gia" rules={[{ max: 2000 }]}><Input.TextArea rows={4} /></Form.Item>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!event || new Date(event.endDate) < new Date()}>Gửi ban tổ chức</Button>
        </Form>
      </>}
      <Link className="mt-6 block text-sky-400" href="/account">Quản lý hồ sơ tài khoản và chuyên môn →</Link>
      <Link className="mt-3 block text-sky-400" href={`/events/${eventId}/register?mode=athlete`}>Bạn cũng thi đấu? Đăng ký bằng hồ sơ VĐV đang hoạt động →</Link>
    </Card>
  </main>;
}
