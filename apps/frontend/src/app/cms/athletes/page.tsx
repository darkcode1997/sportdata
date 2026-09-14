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
import { Pencil, Search, Trash2, UserRound } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';

const genderLabels: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  MIXED: 'Hỗn hợp',
};

export default function AthletesListPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canManage = ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER'].includes(currentUser?.role);
  const canDelete = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search.trim()) params.set('search', search.trim());
    if (gender) params.set('gender', gender);
    return `/athletes?${params}`;
  }, [search, gender, page]);

  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const athletes = data?.items || [];

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await api.delete(`/athletes/${id}`);
      await mutate();
    } catch (requestError: any) {
      setDeleteError(
        requestError.response?.data?.message ||
          'Không thể xóa vận động viên đang có dữ liệu thi đấu.',
      );
    }
  };

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Vận động viên',
      key: 'athlete',
      fixed: 'left',
      width: 260,
      render: (_, athlete) => (
        <Flex align="center" gap={12} className="w-full min-w-0">
          <Avatar
            size={44}
            src={athlete.photoUrl || undefined}
            alt={athlete.fullName}
            icon={<UserRound className="h-5 w-5" />}
            className="!shrink-0 bg-sblue-500/20 text-sblue-300"
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            <Tooltip title={athlete.fullName} placement="topLeft">
              <Typography.Text strong className="block max-w-full truncate">
                {athlete.fullName}
              </Typography.Text>
            </Tooltip>
            <Typography.Text type="secondary" className="text-xs">
              {genderLabels[athlete.gender] || 'Chưa xác định'}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Quốc gia',
      key: 'country',
      width: 110,
      render: (_, athlete) => (
        <Tag className="inline-flex items-center gap-1.5">
          {athlete.country?.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={athlete.country.flagUrl}
              alt={`Cờ ${athlete.country.name || athlete.country.code}`}
              className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
            />
          )}
          {athlete.country?.code || '—'}
        </Tag>
      ),
    },
    {
      title: 'Đơn vị',
      key: 'federation',
      ellipsis: true,
      render: (_, athlete) => athlete.federation?.name || '—',
    },
    {
      title: 'Bộ môn',
      key: 'sports',
      width: 180,
      render: (_, athlete) => {
        const sports = Array.from(
          new Map(
            (athlete.categories || [])
              .filter((category: any) => category.sport)
              .map((category: any) => [category.sport.id, category.sport]),
          ).values(),
        ) as any[];

        return sports.length ? (
          <Space size={[4, 4]} wrap>
            {sports.map((sport: any) => <Tag key={sport.id} color="blue">{sport.name}</Tag>)}
          </Space>
        ) : 'Chưa chọn';
      },
    },
    {
      title: 'Hạng cân / hạng đấu',
      key: 'category',
      width: 260,
      render: (_, athlete) => athlete.categories?.length ? (
        <Space size={[4, 4]} wrap>
          {athlete.categories.map((category: any) => (
            <Tag key={category.id}>{category.name}</Tag>
          ))}
        </Space>
      ) : 'Chưa phân hạng',
    },
    {
      title: 'Thành tích',
      key: 'stats',
      width: 170,
      render: (_, athlete) => {
        const stats = athlete.statistics || [];
        const matches = stats.reduce(
          (sum: number, item: any) => sum + (item.totalMatches || 0),
          0,
        );
        const medals = stats.reduce(
          (sum: number, item: any) =>
            sum +
            (item.goldMedals || 0) +
            (item.silverMedals || 0) +
            (item.bronzeMedals || 0),
          0,
        );
        return (
          <Space size={6}>
            <Tag color="blue">{matches} trận</Tag>
            <Tag color="gold">{medals} HC</Tag>
          </Space>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      width: 112,
      render: (_, athlete) => (
        <Space size={4}>
          {canManage && <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              href={`/cms/athletes/${athlete.id}/edit`}
              aria-label="Chỉnh sửa"
              icon={<Pencil className="h-4 w-4" />}
            />
          </Tooltip>}
          {canDelete && <Popconfirm
            title={`Xóa “${athlete.fullName}”?`}
            description="Thao tác này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(athlete.id)}
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
        title="Quản lý vận động viên"
        description="Tạo và cập nhật hồ sơ hiển thị trên trang người dùng."
        actionHref={canManage ? '/cms/athletes/new' : undefined}
        actionLabel={canManage ? 'Thêm VĐV' : undefined}
      />

      {(error || deleteError) && (
        <Alert
          type="error"
          showIcon
          closable={Boolean(deleteError)}
          onClose={() => setDeleteError(null)}
          message={deleteError || 'Không thể tải danh sách vận động viên.'}
        />
      )}

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            size="large"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm theo tên vận động viên..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="min-w-64 flex-1"
          />
          <Select
            size="large"
            className="w-full sm:w-48"
            value={gender}
            onChange={(value) => {
              setGender(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Mọi giới tính' },
              { value: 'MALE', label: 'Nam' },
              { value: 'FEMALE', label: 'Nữ' },
              { value: 'MIXED', label: 'Hỗn hợp' },
            ]}
          />
        </Flex>
      </Card>

      <Card className="cms-table" variant="borderless">
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={athletes}
          columns={columns}
          pagination={false}
          scroll={{ x: 1240 }}
          locale={{ emptyText: 'Không có vận động viên phù hợp.' }}
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
