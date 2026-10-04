'use client';

import useSWR from 'swr';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  List,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  theme as antdTheme,
  Typography,
  type TableProps,
} from 'antd';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Radio,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cms_token') : null;
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
};

type StatCardProps = {
  label: string;
  value: number | string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: string;
};

function StatCard({ label, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <Card className="cms-surface h-full">
      <Flex justify="space-between" align="flex-start" gap={16}>
        <Statistic title={label} value={value} valueStyle={{ fontWeight: 800, fontSize: 30 }} />
        <Avatar
          shape="square"
          size={48}
          icon={<Icon className="h-6 w-6" />}
          style={{ background: color }}
        />
      </Flex>
      {trend && <Tag className="mt-4" color="success">{trend} tháng này</Tag>}
    </Card>
  );
}

export default function DashboardPage() {
  const { token } = antdTheme.useToken();
  const { data: stats } = useSWR('/api/dashboard/stats', fetcher);
  const { data: recentMatches = [], isLoading: loadingMatches } = useSWR('/api/dashboard/recent-matches', fetcher);
  const { data: eventChart = [] } = useSWR('/api/dashboard/events-chart', fetcher);
  const { data: eventsData, isLoading: loadingEvents } = useSWR('/api/events?limit=4', fetcher);
  const upcomingEvents = eventsData?.items || [];
  const maxChartValue = Math.max(1, ...eventChart.map((item: any) => Math.max(item.events, item.matches)));

  const statusBadge = (status: string) => {
    if (status === 'live') return <Tag color="error" icon={<Radio className="h-3 w-3" />}>TRỰC TIẾP</Tag>;
    if (status === 'finished') return <Tag color="success">Hoàn thành</Tag>;
    return <Tag color="blue">Sắp diễn ra</Tag>;
  };

  const matchColumns: TableProps<any>['columns'] = [
    {
      title: 'Trận đấu',
      key: 'match',
      render: (_, match) => (
        <Typography.Text strong>
          {match.team1} <Typography.Text type="secondary">vs</Typography.Text> {match.team2}
        </Typography.Text>
      ),
    },
    { title: 'Bộ môn', dataIndex: 'sport_name', key: 'sport', render: (value) => <Tag>{value}</Tag> },
    { title: 'Thời gian', dataIndex: 'start_time', key: 'time', render: (value) => format(parseISO(value), 'dd/MM HH:mm') },
    {
      title: 'Địa điểm',
      dataIndex: 'venue',
      key: 'venue',
      render: (value) => <Space size={5}><MapPin className="h-3.5 w-3.5" />{value}</Space>,
    },
    { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: statusBadge },
    {
      title: 'Tỷ số',
      key: 'score',
      align: 'right',
      render: (_, match) => (
        <Typography.Text strong className="text-lg tabular-nums">
          {match.score1 !== null && match.score2 !== null ? `${match.score1} - ${match.score2}` : '—'}
        </Typography.Text>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader title="Bảng điều khiển" description="Tổng quan hoạt động hệ thống hôm nay." />

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard label="Tổng sự kiện" value={stats?.totalEvents ?? 0} icon={CalendarDays} color="linear-gradient(135deg,#00a6f0,#0069a6)" trend={`+${stats?.eventsThisMonth ?? 0}`} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard label="Tổng vận động viên" value={stats?.totalAthletes ?? 0} icon={Users} color="linear-gradient(135deg,#10b981,#047857)" trend={`+${stats?.athletesThisMonth ?? 0}`} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard label="Tổng trận đấu" value={stats?.totalMatches ?? 0} icon={Swords} color="linear-gradient(135deg,#f59e0b,#b45309)" trend={`+${stats?.matchesThisMonth ?? 0}`} />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard label="Đang thi đấu" value={stats?.liveMatches ?? 0} icon={Radio} color="linear-gradient(135deg,#ef4444,#b91c1c)" />
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={16}>
          <Card
            className="cms-surface h-full"
            title={<Space><Trophy className="h-5 w-5 text-amber-400" />Hoạt động theo tháng</Space>}
            extra={<Space><Tag color="blue">Sự kiện</Tag><Tag color="gold">Trận đấu</Tag></Space>}
          >
            <div className="space-y-4">
              {eventChart.map((item: any, index: number) => (
                <div key={`${item.month}-${index}`}>
                  <Flex justify="space-between" className="mb-1">
                    <Typography.Text strong>{item.month}</Typography.Text>
                    <Typography.Text type="secondary">{item.events} sự kiện · {item.matches} trận</Typography.Text>
                  </Flex>
                  <Flex gap={10}>
                    <Progress percent={(item.events / maxChartValue) * 100} showInfo={false} strokeColor="#00a6f0" trailColor={token.colorFillSecondary} className="!mb-0" />
                    <Progress percent={(item.matches / maxChartValue) * 100} showInfo={false} strokeColor="#f59e0b" trailColor={token.colorFillSecondary} className="!mb-0" />
                  </Flex>
                </div>
              ))}
              {!eventChart.length && <Empty description="Chưa có dữ liệu biểu đồ" />}
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="cms-surface h-full" title={<Space><CalendarDays className="h-5 w-5 text-sblue-400" />Sự kiện mới nhất</Space>}>
            <List
              loading={loadingEvents}
              dataSource={upcomingEvents}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có sự kiện" /> }}
              renderItem={(event: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar shape="square" icon={<CalendarDays className="h-4 w-4" />} />}
                    title={<Typography.Text strong>{event.name}</Typography.Text>}
                    description={<Space size={6}><Clock className="h-3.5 w-3.5" />{format(parseISO(event.startDate), 'dd/MM/yyyy')} · {event._count?.athletes || 0} VĐV</Space>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Card
        className="cms-table"
        title={<Space><Swords className="h-5 w-5 text-red-400" />Trận đấu gần đây</Space>}
        extra={<Button type="link" href="/cms/events" icon={<ArrowRight className="h-4 w-4" />} iconPosition="end">Xem sự kiện</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table rowKey="id" columns={matchColumns} dataSource={recentMatches} loading={loadingMatches} pagination={false} scroll={{ x: 900 }} />
      </Card>
    </div>
  );
}
