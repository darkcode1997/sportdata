'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Flex,
  Input,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableProps,
} from 'antd';
import { CalendarDays, Pencil, Search, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const eventLevelOptions = [
  { value: '', label: 'Tất cả quy mô' },
  { value: 'INTERNATIONAL', label: 'Quốc tế' },
  { value: 'NATIONAL', label: 'Toàn quốc' },
  { value: 'REGIONAL', label: 'Khu vực' },
  { value: 'PROVINCIAL', label: 'Tỉnh / thành' },
  { value: 'CENTER_INTERNAL', label: 'Nội bộ trung tâm' },
  { value: 'OPEN', label: 'Mở rộng' },
];

function eventLevelLabel(level?: string) {
  return eventLevelOptions.find((option) => option.value === level)?.label || 'Chưa phân loại';
}

function eventStatus(event: any) {
  const now = Date.now();
  const start = new Date(event.startDate).getTime();
  const end = new Date(event.endDate).getTime();
  if (!event.isPublished) return { label: 'Bản nháp', color: 'default' };
  if (now < start) return { label: 'Sắp diễn ra', color: 'blue' };
  if (now > end) return { label: 'Đã kết thúc', color: 'success' };
  return { label: 'Đang diễn ra', color: 'error' };
}

export default function EventsListPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canManage = ['ADMIN', 'CONTENT', 'GAMES_ADMIN'].includes(currentUser?.role);
  const canDelete = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search.trim()) params.set('search', search.trim());
    if (level) params.set('level', level);
    return `/events?${params}`;
  }, [search, level, page]);

  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const events = data?.items || [];

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await api.delete(`/events/${id}`);
      await mutate();
    } catch (requestError: any) {
      setDeleteError(
        requestError.response?.data?.message ||
          'Không thể xóa sự kiện đang có dữ liệu liên quan.',
      );
    }
  };

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Sự kiện',
      key: 'event',
      fixed: 'left',
      width: 300,
      render: (_, event) => (
        <Flex align="center" gap={12}>
          <Avatar
            shape="square"
            size={44}
            icon={<CalendarDays className="h-5 w-5" />}
            className="bg-sblue-500/20 text-sblue-300"
          />
          <div className="min-w-0">
            <Typography.Text strong className="block max-w-56 truncate">
              {event.name}
            </Typography.Text>
            <Typography.Text type="secondary" className="block max-w-56 truncate text-xs">
              {event.organizer?.name || event.location || 'Chưa cập nhật đơn vị tổ chức'}
            </Typography.Text>
            <Tag className="mt-1" color={event.level === 'INTERNATIONAL' ? 'purple' : 'cyan'}>
              {eventLevelLabel(event.level)}
            </Tag>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Bộ môn',
      key: 'sport',
      width: 220,
      render: (_, event) => (
        <Space size={[4, 4]} wrap>
          {(event.sports?.length ? event.sports : event.sport ? [event.sport] : []).map((sport: any) => (
            <Tag color="blue" key={sport.id}>{sport.name}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 230,
      render: (_, event) => (
        <Typography.Text type="secondary">
          {dateFormat.format(new Date(event.startDate))} → {dateFormat.format(new Date(event.endDate))}
        </Typography.Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, event) => {
        const status = eventStatus(event);
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    {
      title: 'Quy mô',
      key: 'scale',
      width: 180,
      render: (_, event) => (
        <Space size={6}>
          <Tag color="blue">{event._count?.matches || 0} trận</Tag>
          <Tag>{event._count?.athletes || 0} VĐV</Tag>
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      width: 112,
      render: (_, event) => (
        <Space size={4}>
          {canManage && <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              href={`/cms/events/${event.id}/edit`}
              aria-label="Chỉnh sửa"
              icon={<Pencil className="h-4 w-4" />}
            />
          </Tooltip>}
          {canDelete && <Popconfirm
            title={`Xóa “${event.name}”?`}
            description="Toàn bộ trận đấu, sơ đồ và thống kê của sự kiện cũng sẽ bị xóa."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(event.id)}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                danger
                aria-label="Xóa"
                icon={<Trash2 className="h-4 w-4" />}
              />
            </Tooltip>
          </Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Quản lý sự kiện"
        description="Quản lý giải đấu, thời gian và trạng thái công khai."
        actionHref={canManage ? '/cms/events/new' : undefined}
        actionLabel={canManage ? 'Tạo sự kiện' : undefined}
      />

      {(error || deleteError) && (
        <Alert
          type="error"
          showIcon
          closable={Boolean(deleteError)}
          onClose={() => setDeleteError(null)}
          message={deleteError || 'Không thể tải danh sách sự kiện.'}
        />
      )}

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            size="large"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm theo tên hoặc địa điểm..."
            value={search}
            className="min-w-64 flex-1"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            size="large"
            className="w-full sm:w-56"
            value={level}
            options={eventLevelOptions}
            onChange={(value) => {
              setLevel(value);
              setPage(1);
            }}
          />
        </Flex>
      </Card>

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={events}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1120 }}
          locale={{ emptyText: 'Không có sự kiện phù hợp.' }}
        />
        <Flex justify="flex-end" className="border-t border-sdark-800 p-4">
          <Pagination
            current={page}
            total={data?.total || (data?.totalPages || 1) * 10}
            pageSize={10}
            showSizeChanger={false}
            onChange={setPage}
          />
        </Flex>
      </Card>
    </div>
  );
}
