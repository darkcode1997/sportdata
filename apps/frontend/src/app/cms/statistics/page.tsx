'use client';

import useSWR from 'swr';
import {
  Avatar,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  type TableProps,
} from 'antd';
import { BarChart3, CalendarDays, Medal, Swords, Trophy, Users } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cms_token') : null;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

export default function StatisticsPage() {
  const { data: stats, isLoading } = useSWR('/api/statistics', fetcher);
  const { data: rankingsData, isLoading: loadingRankings } = useSWR(
    '/api/statistics/rankings/athletes?sortBy=medals&limit=10',
    fetcher,
  );
  const rankings = (rankingsData?.items || []) as any[];
  const sports = (stats?.bySport || []) as any[];
  const months = (stats?.monthlyPerformance || []) as any[];
  const maxMedals = Math.max(1, ...months.map((item) => item.medals || 0));
  const totalMedals = sports.reduce((sum, sport) => sum + (sport.medals || 0), 0);

  const overviewCards = [
    { label: 'Tổng sự kiện', value: stats?.overview?.total_events || 0, icon: CalendarDays, color: '#00a6f0', change: stats?.overview?.events_change || 0 },
    { label: 'Tổng trận đấu', value: stats?.overview?.total_matches || 0, icon: Swords, color: '#8b5cf6', change: stats?.overview?.matches_change || 0 },
    { label: 'Vận động viên', value: stats?.overview?.total_athletes || 0, icon: Users, color: '#10b981', change: stats?.overview?.athletes_change || 0 },
    { label: 'Huy chương', value: stats?.overview?.total_medals || 0, icon: Trophy, color: '#f59e0b', change: stats?.overview?.medals_change || 0 },
  ];

  const sportColumns: TableProps<any>['columns'] = [
    { title: 'Bộ môn', dataIndex: 'name', key: 'name', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
    { title: 'Sự kiện', dataIndex: 'events', key: 'events', align: 'right' },
    { title: 'Trận đấu', dataIndex: 'matches', key: 'matches', align: 'right' },
    { title: 'VĐV', dataIndex: 'athletes', key: 'athletes', align: 'right' },
    { title: 'Huy chương', dataIndex: 'medals', key: 'medals', align: 'right', render: (value) => <Tag color="gold">{value}</Tag> },
    {
      title: 'Tỷ trọng',
      key: 'share',
      width: 190,
      render: (_, sport) => {
        const percent = (sport.medals / (totalMedals || 1)) * 100;
        return <Progress percent={percent} size="small" format={() => `${percent.toFixed(1)}%`} />;
      },
    },
  ];

  const rankingColumns: TableProps<any>['columns'] = [
    { title: 'Hạng', key: 'rank', width: 76, align: 'center', render: (_, __, index) => <Avatar size={32} className={index < 3 ? 'bg-amber-500 text-slate-950' : 'bg-sdark-700'}>{index + 1}</Avatar> },
    {
      title: 'Vận động viên',
      key: 'athlete',
      render: (_, entry) => (
        <div>
          <Typography.Text strong>{entry.athlete?.fullName}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">{entry.athlete?.country?.name || entry.athlete?.country?.code || '—'}</Typography.Text>
        </div>
      ),
    },
    { title: 'Trận', dataIndex: 'totalMatches', key: 'matches', align: 'right' },
    { title: 'Thắng', dataIndex: 'totalWins', key: 'wins', align: 'right', render: (value) => <Tag color="success">{value}</Tag> },
    { title: 'Tỷ lệ', dataIndex: 'winRate', key: 'rate', align: 'right', render: (value) => `${Math.round((value || 0) * 100)}%` },
    { title: 'Vàng', dataIndex: 'goldMedals', key: 'gold', align: 'center', render: (value) => <Tag color="gold">{value}</Tag> },
    { title: 'Bạc', dataIndex: 'silverMedals', key: 'silver', align: 'center', render: (value) => <Tag>{value}</Tag> },
    { title: 'Đồng', dataIndex: 'bronzeMedals', key: 'bronze', align: 'center', render: (value) => <Tag color="orange">{value}</Tag> },
    { title: 'Điểm', dataIndex: 'medalScore', key: 'score', align: 'right', render: (value) => <Typography.Text strong className="text-amber-400">{value}</Typography.Text> },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader title="Thống kê tổng hợp" description="Phân tích dữ liệu hoạt động toàn hệ thống." icon={<BarChart3 className="h-7 w-7" />} />

      <Row gutter={[20, 20]}>
        {overviewCards.map((card) => (
          <Col xs={24} sm={12} xl={6} key={card.label}>
            <Card className="cms-surface h-full" loading={isLoading}>
              <Flex justify="space-between" align="flex-start" gap={16}>
                <Statistic title={card.label} value={card.value} valueStyle={{ fontWeight: 800, fontSize: 30 }} />
                <Avatar shape="square" size={46} style={{ background: card.color }} icon={<card.icon className="h-5 w-5" />} />
              </Flex>
              <Tag className="mt-4" color={card.change >= 0 ? 'success' : 'error'}>
                {card.change >= 0 ? '+' : ''}{card.change} trong 7 ngày
              </Tag>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={14}>
          <Card className="cms-surface h-full" title={<Space><Medal className="h-5 w-5 text-amber-400" />Huy chương theo tháng</Space>} loading={isLoading}>
            <div className="space-y-4">
              {months.map((month, index) => (
                <div key={`${month.month}-${index}`}>
                  <Flex justify="space-between" className="mb-1">
                    <Typography.Text strong>{month.month}</Typography.Text>
                    <Typography.Text type="secondary">{month.medals} huy chương</Typography.Text>
                  </Flex>
                  <Progress percent={(month.medals / maxMedals) * 100} showInfo={false} strokeColor={{ from: '#00a6f0', to: '#67d2ff' }} trailColor="#202c43" />
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card className="cms-table h-full" title={<Space><Trophy className="h-5 w-5 text-amber-400" />Thành tích theo bộ môn</Space>} styles={{ body: { padding: 0 } }}>
            <Table rowKey={(record) => record.id || record.name} columns={sportColumns} dataSource={sports} loading={isLoading} pagination={false} scroll={{ x: 720 }} size="middle" />
          </Card>
        </Col>
      </Row>

      <Card className="cms-table" title={<Space><Trophy className="h-5 w-5 text-emerald-400" />Top vận động viên xuất sắc</Space>} styles={{ body: { padding: 0 } }}>
        <Table rowKey={(record) => record.athlete?.id} columns={rankingColumns} dataSource={rankings} loading={loadingRankings} pagination={false} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
