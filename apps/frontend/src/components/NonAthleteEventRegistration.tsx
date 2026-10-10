'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Card, Form, Input, Result, Select, Spin, Tag } from 'antd';
import { fetcher } from '@/lib/api';
import { ParticipationTicketActions } from './ParticipationTicketActions';
import { getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { eventRoleLabel, participationStatusLabels, type EventParticipation, type ParticipationRole } from '@/lib/event-participation';

type EventInfo = {
  id: string;
  name: string;
  startDate: string;
  registrationEnabled: boolean;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  participatingFederations?: { id: string }[];
};
type Federation = { id: string; name: string; country?: { code: string } };
type Profile = { displayName: string; email: string; phone?: string | null };

export function NonAthleteEventRegistration({ eventId, role, embedded = false }: { eventId: string; role: ParticipationRole; embedded?: boolean }) {
  const [form] = Form.useForm();
  const toast = useSportDataToast();
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<EventParticipation>();
  const [now, setNow] = useState(() => Date.now());
  const { data: event, isLoading } = useSWR<EventInfo>(`/events/${eventId}`, fetcher);
  const { data: federations = [] } = useSWR<Federation[]>(role === 'TEAM_LEADER' ? '/federations' : null, fetcher);
  const { data: profile } = useSWR<Profile>(getParticipantToken() ? '/participant-auth/me' : null, (url: string) => participantApi.get(url).then(({ data }) => data));
  const { data: mine = [], mutate } = useSWR<EventParticipation[]>(getParticipantToken() ? `/participant-auth/event-participations?eventId=${eventId}` : null, (url: string) => participantApi.get(url).then(({ data }) => data), { refreshInterval: 30_000 });
  const existing = mine.find((item) => item.role === role);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (profile) form.setFieldsValue({ contactName: profile.displayName, contactEmail: profile.email, contactPhone: profile.phone || '' });
  }, [profile, form]);

  const submit = async (values: { contactName: string; contactEmail: string; contactPhone?: string; federationId?: string }) => {
    setSubmitting(true);
    try {
      const { data } = await participantApi.post<EventParticipation>('/participant-auth/event-participations', { ...values, eventId, role });
      setReceipt(data);
      await mutate();
      toast.success('Đã gửi hồ sơ đăng ký tham gia sự kiện.');
    } catch (error) {
      toast.error(participantError(error, 'Không thể đăng ký tham gia sự kiện'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <main className="grid min-h-[40vh] place-items-center"><Spin /></main>;
  if (!event) return <main className="mx-auto max-w-6xl p-4"><Card>Không thể tải sự kiện. Vui lòng thử lại.</Card></main>;
  const open = event.registrationEnabled && (!event.registrationOpenAt || now >= Date.parse(event.registrationOpenAt))
    && now <= Date.parse(event.registrationCloseAt || event.startDate);
  const record = existing || receipt;
  const eligibleFederations = event.participatingFederations?.length
    ? federations.filter((item) => event.participatingFederations!.some((unit) => unit.id === item.id)) : federations;
  return (
    <main className={embedded ? 'registration-contact-form' : 'mx-auto max-w-6xl px-4 py-6'}>
      <Card title={embedded ? 'Thông tin người tham gia' : `${event.name} · ${eventRoleLabel(role)}`}>
        {record ? <Result status={record.status === 'REJECTED' ? 'warning' : 'success'} title={participationStatusLabels[record.status]} subTitle={<>
          <p>Mã hồ sơ: {record.referenceCode}</p>
          {record.federation && <p>Liên đoàn: {record.federation.name}</p>}
          {record.statusReason && <p>{record.statusReason}</p>}
          <p>Vé được phát hành và gửi tới email đăng ký sau khi hồ sơ được duyệt.</p>
        </>} extra={<div className="flex flex-wrap justify-center gap-3"><ParticipationTicketActions code={record.referenceCode} status={record.status} /><Link href={`/events/${eventId}`}><Button>Xem sự kiện</Button></Link></div>} /> : <>
          <p className="registration-muted mb-6">{profile ? `Đăng ký bằng tài khoản ${profile.displayName}. Vé sẽ được gửi tới ${profile.email}.` : 'Nhập thông tin liên hệ của bạn. Vé được gửi tới email này sau khi hồ sơ được duyệt.'}</p>
          {!open && <Tag className="mb-4" color="warning">Sự kiện hiện chưa mở hoặc đã hết hạn đăng ký</Tag>}
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="contactName" label="Họ và tên" rules={[{ required: true, whitespace: true, min: 2, max: 200 }]}><Input size="large" disabled={Boolean(profile)} autoComplete="name" /></Form.Item>
            <Form.Item name="contactEmail" label="Email liên hệ" rules={[{ required: true }, { type: 'email' }]}><Input size="large" disabled={Boolean(profile)} autoComplete="email" /></Form.Item>
            <Form.Item name="contactPhone" label="Số điện thoại"><Input size="large" maxLength={30} autoComplete="tel" /></Form.Item>
            {role === 'TEAM_LEADER' && <Form.Item name="federationId" label="Liên đoàn làm Trưởng đoàn" rules={[{ required: true, message: 'Vui lòng chọn Liên đoàn' }]}>
              <Select size="large" showSearch optionFilterProp="label" placeholder="Chọn Liên đoàn" options={eligibleFederations.map((item) => ({ value: item.id, label: `${item.name}${item.country?.code ? ` · ${item.country.code}` : ''}` }))} />
            </Form.Item>}
            <Button block type="primary" size="large" htmlType="submit" loading={submitting} disabled={!open}>Gửi đăng ký · {eventRoleLabel(role)}</Button>
          </Form>
        </>}
      </Card>
    </main>
  );
}
