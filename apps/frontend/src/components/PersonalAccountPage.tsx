'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, DatePicker, Form, Input, Modal, Select, Space, Table, Tag } from 'antd';
import dayjs from 'dayjs';
import { PersonNameInput } from './PersonNameInput';
import { participantApi, participantError, getParticipantToken, setParticipantSession } from '@/lib/participant-auth';
import { PERSONAL_ACCOUNT_OPTIONS, accountRoleLabel, PARTICIPATION_STATUS } from '@/lib/account-roles';
import { fetcher } from '@/lib/api';
import { vietnamCountryId } from '@/lib/countries';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type PersonalProfile = {
  id: string; email: string; displayName: string; phone?: string; accountType: string;
  countryId?: string; gender?: string; birthDate?: string; professionalSummary?: string;
  verificationStatus: string; federationId?: string; federation?: { name: string };
  athlete?: { id: string; isArchived: boolean } | null;
  verificationNote?: string;
};
export function PersonalAccountPage({ profile, refresh }: { profile: PersonalProfile; refresh: () => Promise<unknown> }) {
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const [athleteForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [creatingAthlete, setCreatingAthlete] = useState(false);
  const countries = useSWR<Array<{ id: string; name: string; code: string }>>('/countries', fetcher);
  const federations = useSWR<Array<{ id: string; name: string; countryId: string }>>('/federations', fetcher);
  const countryId = Form.useWatch('countryId', form);
  const applications = useSWR<Array<{ id: string; role: string; status: string; reviewNote?: string; event: { id: string; name: string } }>>('/participant-roles/applications/me', url => participantApi.get(url).then(response => response.data));
  useEffect(() => { form.setFieldsValue({ ...profile, birthDate: profile.birthDate ? dayjs(profile.birthDate) : undefined }); }, [form, profile]);
  const save = async (values: any) => {
    setSaving(true);
    try { await participantApi.patch('/participant-auth/me', { ...values, birthDate: values.birthDate?.format('YYYY-MM-DD') }); await refresh(); toast.success('Đã lưu hồ sơ cá nhân'); }
    catch (requestError) { toast.error(participantError(requestError)); }
    finally { setSaving(false); }
  };
  return <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-10">
    <header><h1 className="text-3xl font-bold">{profile.displayName}</h1><p className="mt-2 text-slate-400">{profile.email} · {accountRoleLabel(profile.accountType)}</p></header>
    {profile.accountType !== 'GENERAL' && <Alert showIcon type={profile.verificationStatus === 'VERIFIED' ? 'success' : profile.verificationStatus === 'REJECTED' ? 'error' : 'info'} message={profile.verificationStatus === 'VERIFIED' ? 'Hồ sơ chuyên môn đã được xác minh' : profile.verificationStatus === 'REJECTED' ? 'Hồ sơ chuyên môn chưa được chấp thuận' : 'Hồ sơ chuyên môn đang chờ SportData xác minh'} description="Mỗi nhiệm vụ tại sự kiện cần được ban tổ chức duyệt riêng. Tài khoản cá nhân không có quyền quản trị CMS." />}
    <Card title="Loại tài khoản cá nhân">
      {profile.verificationNote && <Alert className="mb-4" showIcon type="info" message="Ý kiến SportData" description={profile.verificationNote} />}
      <Space wrap><Select style={{ width: 220 }} value={profile.accountType} disabled={saving} options={PERSONAL_ACCOUNT_OPTIONS.filter(option => option.value !== 'ATHLETE')} onChange={async accountType => {
        setSaving(true);
        try { await participantApi.patch('/participant-roles/accounts/me/type', { accountType }); await refresh(); toast.success('Đã cập nhật loại tài khoản; hồ sơ chuyên môn cần được xác minh lại.'); }
        catch (requestError) { toast.error(participantError(requestError)); }
        finally { setSaving(false); }
      }} /><Button onClick={() => { athleteForm.setFieldsValue({ countryId: profile.countryId || vietnamCountryId(countries.data || []), gender: profile.gender, birthDate: profile.birthDate ? dayjs(profile.birthDate) : undefined }); setCreatingAthlete(true); }}>Đăng ký hồ sơ vận động viên</Button></Space>
      <p className="mt-4 text-sm text-slate-400">Hồ sơ VĐV chỉ được tạo khi bạn chủ động đăng ký thi đấu. Chọn loại chuyên môn là gửi đề nghị để SportData xác minh.</p>
      {profile.athlete && !profile.athlete.isArchived && <Link href="/account/athlete" className="mt-4 block text-sky-400">Hồ sơ VĐV và vé thi đấu của bạn →</Link>}
      {profile.accountType === 'TEAM_LEADER' && profile.federationId && profile.verificationStatus === 'VERIFIED' && <Link className="mt-5 block text-sky-400" href="/federation-account">Quản lý đoàn · {profile.federation?.name} →</Link>}
    </Card>
    <Card title="Hồ sơ cá nhân">
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="displayName" label="Họ và tên" rules={[{ required: true, min: 2 }]}><PersonNameInput /></Form.Item>
        <Form.Item name="phone" label="Điện thoại"><Input /></Form.Item>
        <Form.Item name="countryId" label="Quốc gia"><Select showSearch optionFilterProp="label" options={(countries.data || []).map(country => ({ value: country.id, label: country.name }))} /></Form.Item>
        <Form.Item name="federationId" label="Đơn vị / CLB" rules={[{ required: profile.accountType === 'TEAM_LEADER' }]}><Select allowClear showSearch optionFilterProp="label" options={(federations.data || []).filter(item => item.countryId === countryId).map(item => ({ value: item.id, label: item.name }))} /></Form.Item>
        <Form.Item name="professionalSummary" label="Chuyên môn, chứng chỉ, đơn vị công tác và kinh nghiệm" rules={[{ max: 2000 }]}><Input.TextArea rows={4} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Lưu hồ sơ</Button>
      </Form>
    </Card>
    <Card title="Hồ sơ tham gia sự kiện">
      <Link className="mb-4 inline-block text-sky-400" href="/events">Tìm sự kiện và đăng ký nhiệm vụ →</Link>
      {applications.error && <Alert showIcon type="error" message="Không thể tải hồ sơ sự kiện" />}
      <Table rowKey="id" dataSource={applications.data || []} loading={applications.isLoading} scroll={{ x: 600 }} columns={[
        { title: 'Sự kiện', key: 'event', render: (_, item) => <Link href={`/events/${item.event.id}/staff`}>{item.event.name}</Link> },
        { title: 'Vai trò', dataIndex: 'role', render: accountRoleLabel },
        { title: 'Trạng thái', dataIndex: 'status', render: status => <Tag color={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'processing'}>{PARTICIPATION_STATUS[status]}</Tag> },
        { title: 'Ý kiến ban tổ chức', dataIndex: 'reviewNote' },
      ]} />
    </Card>
    <Link className="block text-sky-400" href="/account/email-preferences">Quản lý email sự kiện và tin tức →</Link>
    <Modal open={creatingAthlete} title="Đăng ký hồ sơ vận động viên" footer={null} onCancel={() => setCreatingAthlete(false)}>
      <p className="mb-4 text-slate-400">Hồ sơ này sẽ xuất hiện trong danh sách VĐV và dùng cho việc đăng ký thi đấu.</p>
      <Form form={athleteForm} layout="vertical" onFinish={async values => {
        setSaving(true);
        try { const { data } = await participantApi.post('/participant-auth/me/athlete-profile', { ...values, birthDate: values.birthDate.format('YYYY-MM-DD') }); const token = getParticipantToken(); if (token) setParticipantSession(token, data); await refresh(); setCreatingAthlete(false); }
        catch (requestError) { toast.error(participantError(requestError)); }
        finally { setSaving(false); }
      }}>
        <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
        <Form.Item name="gender" label="Giới tính" rules={[{ required: true }]}><Select options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} /></Form.Item>
        <Form.Item name="countryId" label="Quốc gia" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={(countries.data || []).map(country => ({ value: country.id, label: country.name }))} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={saving}>Xác nhận tạo hồ sơ VĐV</Button>
      </Form>
    </Modal>
  </main>;
}
