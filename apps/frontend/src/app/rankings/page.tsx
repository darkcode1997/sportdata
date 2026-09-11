'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Avatar,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { Award, Medal, Swords, Target, TrendingUp, Trophy } from 'lucide-react';
import { fetcher } from '@/lib/api';

interface Sport {
  id: string;
  name: string;
}

interface RankingEntry {
  rank: number;
  athleteId: string;
  athlete: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    country?: { code?: string; name?: string } | null;
  };
  totalWins: number;
  totalLosses: number;
  totalMatches: number;
  goldMedals: number;
  silverMedals: number;
  bronzeMedals: number;
  totalPoints: number;
  totalDraws?: number;
  medalScore?: number;
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function RankingsPage() {
  const [sportFilter, setSportFilter] = useState('');
  const [viewMode, setViewMode] = useState<'points' | 'medals'>('points');
  const { data: sports } = useSWR<{ data?: Sport[] } | Sport[]>('/sports', fetcher);

  const rankingsQuery = useMemo(() => {
    const params = new URLSearchParams({ limit: '50', sortBy: viewMode === 'points' ? 'points' : 'medals' });
    if (sportFilter) params.set('sportId', sportFilter);
    return `/statistics/rankings/athletes?${params}`;
  }, [sportFilter, viewMode]);

  const { data, isLoading } = useSWR<
    { data?: RankingEntry[]; items?: RankingEntry[] } | RankingEntry[]
  >(rankingsQuery, fetcher);

  const rankings = useMemo(() => {
    const items = (Array.isArray(data) ? data : data?.data || data?.items || []) as RankingEntry[];
    return items.map((item, index) => ({
      ...item,
      athleteId: item.athleteId || item.athlete?.id || `ranking-${index}`,
      rank: numberOrZero(item.rank) || index + 1,
      totalMatches: numberOrZero(item.totalMatches),
      totalWins: numberOrZero(item.totalWins),
      totalLosses: numberOrZero(item.totalLosses),
      goldMedals: numberOrZero(item.goldMedals),
      silverMedals: numberOrZero(item.silverMedals),
      bronzeMedals: numberOrZero(item.bronzeMedals),
      totalPoints: numberOrZero(item.totalPoints ?? item.medalScore),
    }));
  }, [data]);
  const sportsList = (Array.isArray(sports) ? sports : sports?.data || []) as Sport[];

  const displayRankings = useMemo(() => {
    const sorted = [...rankings].sort((left, right) => {
      if (viewMode === 'points') {
        return numberOrZero(right.totalPoints) - numberOrZero(left.totalPoints);
      }

      return (
        numberOrZero(right.goldMedals) * 5 + numberOrZero(right.silverMedals) * 3 + numberOrZero(right.bronzeMedals) -
        (numberOrZero(left.goldMedals) * 5 + numberOrZero(left.silverMedals) * 3 + numberOrZero(left.bronzeMedals))
      );
    });

    return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [rankings, viewMode]);

  const columns: TableProps<RankingEntry>['columns'] = [
    {
      title: 'Hạng',
      key: 'rank',
      width: 86,
      align: 'center',
      render: (_, row, index) => <RankBadge rank={row.rank || index + 1} />,
    },
    {
      title: 'Vận động viên',
      key: 'athlete',
      width: 280,
      render: (_, row) => (
        <Link href={`/athletes/${row.athlete.id}`}>
          <Flex align="center" gap={12}>
            <Avatar size={42} src={row.athlete.photoUrl || undefined}>
              {initials(row.athlete.fullName)}
            </Avatar>
            <div className="min-w-0">
              <Typography.Text strong className="block truncate">{row.athlete.fullName}</Typography.Text>
              <Typography.Text type="secondary" className="text-xs">
                {row.athlete.country?.code || row.athlete.country?.name || '—'}
              </Typography.Text>
            </div>
          </Flex>
        </Link>
      ),
    },
    { title: 'Trận', dataIndex: 'totalMatches', key: 'matches', align: 'center' },
    { title: 'Thắng', dataIndex: 'totalWins', key: 'wins', align: 'center', render: (value) => <Tag color="success">{value}</Tag> },
    { title: 'Thua', dataIndex: 'totalLosses', key: 'losses', align: 'center', render: (value) => <Tag color="error">{value}</Tag> },
    { title: 'Vàng', dataIndex: 'goldMedals', key: 'gold', align: 'center', render: (value) => <Tag color="gold">{value}</Tag> },
    { title: 'Bạc', dataIndex: 'silverMedals', key: 'silver', align: 'center', render: (value) => <Tag>{value}</Tag> },
    { title: 'Đồng', dataIndex: 'bronzeMedals', key: 'bronze', align: 'center', render: (value) => <Tag color="orange">{value}</Tag> },
    {
      title: 'Điểm',
      dataIndex: 'totalPoints',
      key: 'points',
      align: 'right',
      render: (value) => <Typography.Text strong className="text-lg text-sblue-400">{numberOrZero(value).toLocaleString('vi-VN')}</Typography.Text>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Typography.Title level={1} className="!mb-2 !text-3xl">Bảng xếp hạng</Typography.Title>
        <Typography.Paragraph type="secondary" className="!mb-0 text-base">
          Thành tích vận động viên theo điểm thi đấu và số huy chương.
        </Typography.Paragraph>
      </div>

      <Card className="public-surface" styles={{ body: { padding: 16 } }}>
        <Flex justify="space-between" align="center" gap={16} wrap>
          <Space>
            <Trophy className="h-5 w-5 text-amber-400" />
            <Select
              size="large"
              className="min-w-60"
              value={sportFilter}
              onChange={setSportFilter}
              options={[
                { value: '', label: 'Tất cả bộ môn' },
                ...sportsList.map((sport) => ({ value: sport.id, label: sport.name })),
              ]}
            />
          </Space>
          <Segmented
            size="large"
            value={viewMode}
            onChange={(value) => setViewMode(value as 'points' | 'medals')}
            options={[
              { value: 'points', label: <Space size={6}><TrendingUp className="h-4 w-4" />Theo điểm</Space> },
              { value: 'medals', label: <Space size={6}><Medal className="h-4 w-4" />Theo huy chương</Space> },
            ]}
          />
        </Flex>
      </Card>

      {sportFilter && displayRankings.length > 0 && (
        <Row gutter={[16, 16]}>
          <SummaryCard icon={Trophy} label="Vận động viên" value={displayRankings.length} color="#94a3b8" />
          <SummaryCard icon={Swords} label="Tổng trận" value={displayRankings.reduce((sum, item) => sum + item.totalMatches, 0)} color="#00a6f0" />
          <SummaryCard icon={Target} label="Tổng trận thắng" value={displayRankings.reduce((sum, item) => sum + item.totalWins, 0)} color="#10b981" />
          <SummaryCard icon={Award} label="Tổng điểm" value={displayRankings.reduce((sum, item) => sum + item.totalPoints, 0)} color="#f59e0b" />
        </Row>
      )}

      <Card className="public-table" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="athleteId"
          columns={columns}
          dataSource={displayRankings}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 920 }}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu xếp hạng" /> }}
        />
      </Card>
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('');
}

function RankBadge({ rank }: { rank: number }) {
  const color = rank === 1 ? '#facc15' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#334155';
  return <Avatar size={36} style={{ background: color, color: rank === 1 ? '#0f172a' : '#fff', fontWeight: 800 }}>{rank <= 3 ? <Medal className="h-4 w-4" /> : rank}</Avatar>;
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<any>; label: string; value: number; color: string }) {
  return (
    <Col xs={12} lg={6}>
      <Card className="public-surface h-full">
        <Flex justify="space-between" align="flex-start" gap={12}>
          <Statistic title={label} value={value} valueStyle={{ fontWeight: 800 }} />
          <Avatar shape="square" size={42} icon={<Icon className="h-5 w-5" />} style={{ background: color }} />
        </Flex>
      </Card>
    </Col>
  );
}
