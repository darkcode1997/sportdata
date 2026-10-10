'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Card, Empty, Spin, Tag } from 'antd';
import { participantApi } from '@/lib/participant-auth';
import { ParticipationTicketActions } from './ParticipationTicketActions';
import { eventRoleLabel, participationStatusLabels, type EventParticipation } from '@/lib/event-participation';

export function MyEventParticipations() {
  const { data = [], isLoading, error } = useSWR<EventParticipation[]>('/participant-auth/event-participations', (url: string) => participantApi.get(url).then(({ data }) => data), { refreshInterval: 30_000 });
  return (
    <Card className="mb-6" title="Vai trò tham gia sự kiện của tôi">
      {isLoading ? <Spin /> : error ? <p>Không thể tải hồ sơ tham gia. Vui lòng thử lại.</p> : data.length ? <div className="space-y-3">{data.map((item) => (
        <div key={item.id} className="rounded-xl border border-white/10 p-4">
          <Link className="font-semibold text-sky-400" href={`/events/${item.event.id}/register?role=${item.role}`}>{item.event.name}</Link>
          <div className="mt-2 flex flex-wrap gap-2"><Tag color="blue">{eventRoleLabel(item.role)}</Tag><Tag color={item.status === 'CONFIRMED' ? 'success' : item.status === 'REJECTED' ? 'error' : 'default'}>{participationStatusLabels[item.status]}</Tag></div>
          <p className="mt-2 text-sm text-slate-400">Mã hồ sơ: {item.referenceCode}{item.federation ? ` · Liên đoàn: ${item.federation.name}` : ''}</p>
          {item.statusReason && <p className="mt-1 text-sm text-slate-400">{item.statusReason}</p>}
          <div className="mt-3"><ParticipationTicketActions code={item.referenceCode} status={item.status} /></div>
        </div>
      ))}</div> : <Empty description="Chưa có hồ sơ tham gia sự kiện với vai trò ngoài VĐV" />}
    </Card>
  );
}
