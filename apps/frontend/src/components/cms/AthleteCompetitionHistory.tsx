'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Card, Empty, Segmented, Space, Statistic, Table, Tag } from 'antd';
import { CalendarClock, CircleDot, Medal, Trophy } from 'lucide-react';
import { fetcher } from '@/lib/api';

type AthleteCompetitionHistoryProps = {
  athleteId: string;
  athlete: any;
};

const matchStatus = {
  SCHEDULED: { label: 'Sắp tới', color: 'blue' },
  RUNNING: { label: 'Đang thi đấu', color: 'error' },
  FINISHED: { label: 'Đã đấu', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
} as const;

export function AthleteCompetitionHistory({ athleteId, athlete }: AthleteCompetitionHistoryProps) {
  const [status, setStatus] = useState<'SCHEDULED' | 'RUNNING' | 'FINISHED'>('SCHEDULED');
  const { data, isLoading } = useSWR<any>(
    `/matches?athleteId=${encodeURIComponent(athleteId)}&status=${status}&limit=50`,
    fetcher,
  );
  const { data: finishedData } = useSWR<any>(
    `/matches?athleteId=${encodeURIComponent(athleteId)}&status=FINISHED&limit=50`,
    fetcher,
  );
  const matches = data?.items || [];
  const finishedMatches = useMemo(() => finishedData?.items || [], [finishedData?.items]);
  const statistics = useMemo(() => athlete.statistics || [], [athlete.statistics]);
  const careerStatistics = useMemo(() => statistics.some((item: any) => !item.eventId)
    ? statistics.filter((item: any) => !item.eventId)
    : statistics, [statistics]);
  const summary = useMemo(() => careerStatistics.reduce((total: any, item: any) => ({
    totalMatches: total.totalMatches + (item.totalMatches || 0),
    totalWins: total.totalWins + (item.totalWins || 0),
    totalLosses: total.totalLosses + (item.totalLosses || 0),
    totalDraws: total.totalDraws + (item.totalDraws || 0),
    medals: total.medals + (item.goldMedals || 0) + (item.silverMedals || 0) + (item.bronzeMedals || 0),
  }), { totalMatches: 0, totalWins: 0, totalLosses: 0, totalDraws: 0, medals: 0 }), [careerStatistics]);
  const actualResults = useMemo(() => finishedMatches.reduce((total: any, match: any) => {
    if (!match.winnerId) total.totalDraws += 1;
    else if (match.winnerId === athleteId) total.totalWins += 1;
    else total.totalLosses += 1;
    total.totalMatches += 1;
    return total;
  }, { totalMatches: 0, totalWins: 0, totalLosses: 0, totalDraws: 0 }), [athleteId, finishedMatches]);
  const performance = summary.totalMatches ? summary : { ...actualResults, medals: summary.medals };

  const events = useMemo(() => {
    const byId = new Map<string, any>();
    (athlete.events || []).forEach((event: any) => byId.set(event.id, event));
    statistics.forEach((item: any) => {
      if (item.event) byId.set(item.event.id, item.event);
    });
    return [...byId.values()].sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());
  }, [athlete.events, statistics]);

  const resultFor = (match: any) => {
    if (match.status !== 'FINISHED') return '—';
    if (!match.winnerId) return 'Hòa';
    return match.winnerId === athleteId ? 'Thắng' : 'Thua';
  };

  const opponentFor = (match: any) => match.athlete1?.id === athleteId ? match.athlete2 : match.athlete1;
  const scoreFor = (match: any) => match.athlete1?.id === athleteId
    ? `${match.athlete1Score ?? 0} – ${match.athlete2Score ?? 0}`
    : `${match.athlete2Score ?? 0} – ${match.athlete1Score ?? 0}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><Statistic title="Sự kiện đã tham gia" value={events.length} prefix={<Trophy className="h-4 w-4 text-sky-500" />} /></Card>
        <Card><Statistic title="Tổng trận" value={performance.totalMatches} /></Card>
        <Card><Statistic title="Thắng" value={performance.totalWins} valueStyle={{ color: '#10b981' }} /></Card>
        <Card><Statistic title="Thua / hòa" value={`${performance.totalLosses} / ${performance.totalDraws}`} /></Card>
        <Card><Statistic title="Huy chương" value={summary.medals} prefix={<Medal className="h-4 w-4 text-amber-500" />} /></Card>
      </div>

      <Card title="Giải đấu / sự kiện đã tham gia" extra={<Tag color="blue">{events.length} sự kiện</Tag>} styles={{ body: { padding: events.length ? 0 : 24 } }}>
        {events.length ? (
          <Table<any>
            rowKey="id"
            dataSource={events}
            pagination={{ pageSize: 8 }}
            columns={[
              { title: 'Sự kiện', dataIndex: 'name', render: (value) => <strong>{value}</strong> },
              { title: 'Thời gian', width: 230, render: (_, event) => `${new Date(event.startDate).toLocaleDateString('vi-VN')} – ${new Date(event.endDate).toLocaleDateString('vi-VN')}` },
              { title: 'Địa điểm', dataIndex: 'location', render: (value) => value || '—' },
              { title: 'Trạng thái', width: 140, render: (_, event) => {
                const now = Date.now();
                const starts = new Date(event.startDate).getTime();
                const ends = new Date(event.endDate).getTime();
                return <Tag color={now < starts ? 'blue' : now > ends ? 'success' : 'error'}>{now < starts ? 'Sắp diễn ra' : now > ends ? 'Đã kết thúc' : 'Đang diễn ra'}</Tag>;
              } },
            ]}
          />
        ) : <Empty description="Vận động viên chưa tham gia sự kiện nào." />}
      </Card>

      <Card
        title={<span className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-sky-500" />Lịch sử trận đấu & thành tích</span>}
        extra={(
          <Segmented
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={[
              { value: 'SCHEDULED', label: 'Sắp tới', icon: <CalendarClock className="h-4 w-4" /> },
              { value: 'RUNNING', label: 'Đang đánh', icon: <CircleDot className="h-4 w-4" /> },
              { value: 'FINISHED', label: 'Đã đánh', icon: <Trophy className="h-4 w-4" /> },
            ]}
          />
        )}
        styles={{ body: { padding: 0 } }}
      >
        <Table<any>
          rowKey="id"
          loading={isLoading}
          dataSource={matches}
          scroll={{ x: 950 }}
          pagination={{ pageSize: 15 }}
          locale={{ emptyText: status === 'RUNNING' ? 'VĐV không có trận đang diễn ra.' : status === 'FINISHED' ? 'Chưa có trận đã hoàn thành.' : 'Chưa có trận sắp tới.' }}
          columns={[
            {
              title: 'Thời gian',
              width: 180,
              render: (_, match) => <div>{new Date(match.startTime || match.matchDate).toLocaleString('vi-VN')}<div className="text-xs text-slate-500">{match.fopRecord?.name || match.fop || 'Chưa xếp sân'}</div></div>,
            },
            { title: 'Sự kiện', dataIndex: ['event', 'name'], width: 210 },
            { title: 'Hạng đấu', width: 210, render: (_, match) => <div>{match.category?.name}<div className="text-xs text-slate-500">{match.category?.sport?.name}</div></div> },
            {
              title: 'Đối thủ',
              width: 210,
              render: (_, match) => {
                const opponent = opponentFor(match);
                return opponent ? <div><strong>{opponent.fullName}</strong><div className="text-xs text-slate-500">{opponent.country?.code || ''} · {opponent.federation?.name || 'VĐV tự do'}</div></div> : <Tag>Chờ xác định</Tag>;
              },
            },
            { title: 'Tỷ số', width: 100, align: 'center' as const, render: (_, match) => status === 'FINISHED' ? <strong>{scoreFor(match)}</strong> : '—' },
            {
              title: 'Kết quả',
              width: 120,
              render: (_, match) => {
                const result = resultFor(match);
                return <Tag color={result === 'Thắng' ? 'success' : result === 'Thua' ? 'error' : result === 'Hòa' ? 'gold' : matchStatus[match.status as keyof typeof matchStatus]?.color}>{result === '—' ? matchStatus[match.status as keyof typeof matchStatus]?.label || match.status : result}</Tag>;
              },
            },
            { title: 'Thắng bằng', dataIndex: 'winMethod', width: 140, render: (value) => value || '—' },
          ]}
        />
      </Card>
    </div>
  );
}
