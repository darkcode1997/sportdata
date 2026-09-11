'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  Button,
  Card,
  Flex,
  Input,
  Form,
  Modal,
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
import { Network, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const statusMap: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Sắp diễn ra', color: 'blue' },
  RUNNING: { label: 'Đang thi đấu', color: 'error' },
  FINISHED: { label: 'Hoàn thành', color: 'success' },
  CANCELLED: { label: 'Đã hủy', color: 'default' },
};

export default function MatchesListPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canDelete = currentUser?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawGenerating, setDrawGenerating] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [drawForm] = Form.useForm();
  const selectedEventId = Form.useWatch('eventId', drawForm);
  const selectedCategoryId = Form.useWatch('categoryId', drawForm);

  const { data: eventsResponse } = useSWR<any>('/events?limit=200', fetcher);
  const { data: categoriesResponse } = useSWR<any>('/categories?limit=200', fetcher);
  const { data: athletesResponse } = useSWR<any>('/athletes?limit=200', fetcher);
  const events = eventsResponse?.items || [];
  const allCategories = categoriesResponse?.items || [];
  const allAthletes = athletesResponse?.items || [];
  const selectedEvent = events.find((event: any) => event.id === selectedEventId);
  const eventCategories = selectedEvent?.categories?.length ? selectedEvent.categories : allCategories;
  const selectedCategory = allCategories.find((category: any) => category.id === selectedCategoryId)
    || eventCategories.find((category: any) => category.id === selectedCategoryId);
  const eventAthletes = selectedEvent?.athletes?.length ? selectedEvent.athletes : allAthletes;
  const eligibleAthleteIds = new Set((selectedCategory?.athletes || []).map((athlete: any) => athlete.id));
  const eligibleAthletes = eligibleAthleteIds.size
    ? eventAthletes.filter((athlete: any) => eligibleAthleteIds.has(athlete.id))
    : eventAthletes;

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) params.set('status', status);
    return `/matches?${params}`;
  }, [status, page]);

  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const matches = (data?.items || []).filter((match: any) => {
    const haystack = `${match.athlete1?.fullName || ''} ${match.athlete2?.fullName || ''} ${match.event?.name || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const remove = async (id: string) => {
    setDeleteError(null);
    try {
      await api.delete(`/matches/${id}`);
      await mutate();
    } catch (requestError: any) {
      setDeleteError(requestError.response?.data?.message || 'Không thể xóa trận đấu.');
    }
  };

  const generateDraw = async (values: any) => {
    setDrawError(null);
    setDrawGenerating(true);
    try {
      await api.post(
        `/matches/event/${values.eventId}/category/${values.categoryId}/generate-draw`,
        {
          athleteIds: values.athleteIds,
          type: values.type,
          seedingMode: values.seedingMode,
          name: values.name || undefined,
          fop: values.fop || undefined,
        },
      );
      setDrawOpen(false);
      drawForm.resetFields();
      await mutate();
    } catch (requestError: any) {
      const message = requestError.response?.data?.message || 'Không thể sinh cây thi đấu.';
      setDrawError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setDrawGenerating(false);
    }
  };

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Trận đấu',
      key: 'match',
      fixed: 'left',
      width: 300,
      render: (_, match) => (
        <div>
          <Typography.Text strong>
            {match.athlete1?.fullName || 'Chờ xác định'}
            <Typography.Text type="secondary"> vs </Typography.Text>
            {match.athlete2?.fullName || 'Chờ xác định'}
          </Typography.Text>
          <Typography.Text type="secondary" className="mt-1 block text-xs">
            #{match.matchNumber || '—'} · {match.fop || 'Chưa có FOP'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Sự kiện / Hạng',
      key: 'event',
      width: 260,
      render: (_, match) => (
        <div>
          <Typography.Text className="block max-w-56 truncate">{match.event?.name || '—'}</Typography.Text>
          <Typography.Text type="secondary" className="text-xs">{match.category?.name || '—'}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Thời gian',
      key: 'time',
      width: 160,
      render: (_, match) => dateTime.format(new Date(match.startTime || match.matchDate)),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, match) => {
        const badge = statusMap[match.status] || statusMap.SCHEDULED;
        return <Tag color={badge.color}>{badge.label}</Tag>;
      },
    },
    {
      title: 'Tỷ số',
      key: 'score',
      align: 'center',
      width: 110,
      render: (_, match) => (
        <Typography.Text strong className="text-lg tabular-nums">
          {match.status === 'SCHEDULED' ? '—' : `${match.athlete1Score} – ${match.athlete2Score}`}
        </Typography.Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      fixed: 'right',
      width: 112,
      render: (_, match) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              href={`/cms/matches/${match.id}/edit`}
              aria-label="Chỉnh sửa"
              icon={<Pencil className="h-4 w-4" />}
            />
          </Tooltip>
          {canDelete && <Popconfirm
            title="Xóa trận đấu này?"
            description="Thao tác này không thể hoàn tác."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(match.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger aria-label="Xóa" icon={<Trash2 className="h-4 w-4" />} />
            </Tooltip>
          </Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Quản lý trận đấu"
        description="Sinh cây theo cấu trúc, xếp lịch và cập nhật kết quả."
        action={(
          <Space wrap>
            <Button
              size="large"
              icon={<Network className="h-4 w-4" />}
              onClick={() => {
                setDrawError(null);
                setDrawOpen(true);
              }}
            >
              Sinh cây tự động
            </Button>
            <Button type="primary" size="large" href="/cms/matches/new" icon={<Plus className="h-4 w-4" />}>
              Tạo trận đấu
            </Button>
          </Space>
        )}
      />

      <Modal
        title="Sinh cây thi đấu tự động"
        open={drawOpen}
        width={720}
        okText="Sinh cây"
        cancelText="Hủy"
        confirmLoading={drawGenerating}
        onCancel={() => setDrawOpen(false)}
        onOk={() => drawForm.submit()}
        destroyOnHidden
      >
        {drawError && <Alert className="mb-4" type="error" showIcon message={drawError} />}
        <Form
          form={drawForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ type: 'MAIN_TREE', seedingMode: 'STANDARD' }}
          onFinish={generateDraw}
        >
          <Form.Item name="eventId" label="Sự kiện" rules={[{ required: true, message: 'Chọn sự kiện' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={events.map((event: any) => ({ value: event.id, label: event.name }))}
              onChange={() => drawForm.setFieldsValue({ categoryId: undefined, athleteIds: [] })}
            />
          </Form.Item>
          <Form.Item name="categoryId" label="Hạng thi đấu" rules={[{ required: true, message: 'Chọn hạng thi đấu' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={eventCategories.map((category: any) => ({ value: category.id, label: category.name }))}
              onChange={() => drawForm.setFieldValue('athleteIds', [])}
            />
          </Form.Item>
          <Form.Item
            name="athleteIds"
            label="Vận động viên theo thứ tự hạt giống"
            rules={[{ required: true, type: 'array', min: 2, message: 'Chọn ít nhất 2 vận động viên' }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="Hạt giống số 1, số 2..."
              options={eligibleAthletes.map((athlete: any) => ({ value: athlete.id, label: athlete.fullName }))}
            />
          </Form.Item>
          <Flex gap={16} wrap>
            <Form.Item className="min-w-64 flex-1" name="type" label="Thể thức">
              <Select options={[
                { value: 'MAIN_TREE', label: 'Loại trực tiếp · Main tree' },
                { value: 'DOUBLE_ELIMINATION', label: 'Double elimination · Nhánh thắng/thua' },
              ]} />
            </Form.Item>
            <Form.Item className="min-w-64 flex-1" name="seedingMode" label="Chế độ seeding">
              <Select options={[
                { value: 'STANDARD', label: 'Chuẩn · tách hạt giống mạnh' },
                { value: 'ORDERED', label: 'Theo đúng thứ tự nhập' },
                { value: 'RANDOM', label: 'Ngẫu nhiên' },
                { value: 'COUNTRY_SEPARATED', label: 'Tách quốc gia' },
                { value: 'FEDERATION_SEPARATED', label: 'Tách liên đoàn' },
              ]} />
            </Form.Item>
          </Flex>
          <Flex gap={16} wrap>
            <Form.Item className="min-w-64 flex-1" name="name" label="Tên cây">
              <Input placeholder="MAIN TREE POOL 1" />
            </Form.Item>
            <Form.Item className="min-w-64 flex-1" name="fop" label="Sàn / FOP">
              <Input placeholder="FOP 1" />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>

      {(error || deleteError) && (
        <Alert
          type="error"
          showIcon
          closable={Boolean(deleteError)}
          onClose={() => setDeleteError(null)}
          message={deleteError || 'Không thể tải danh sách trận đấu.'}
        />
      )}

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            size="large"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm vận động viên hoặc sự kiện..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-w-64 flex-1"
          />
          <Select
            size="large"
            className="w-full sm:w-52"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Mọi trạng thái' },
              { value: 'SCHEDULED', label: 'Sắp diễn ra' },
              { value: 'RUNNING', label: 'Đang thi đấu' },
              { value: 'FINISHED', label: 'Hoàn thành' },
              { value: 'CANCELLED', label: 'Đã hủy' },
            ]}
          />
        </Flex>
      </Card>

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={matches}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'Không có trận đấu phù hợp.' }}
        />
        <Flex justify="flex-end" className="border-t border-sdark-800 p-4">
          <Pagination
            current={page}
            total={data?.meta?.total || (data?.meta?.totalPages || 1) * 20}
            pageSize={20}
            showSizeChanger={false}
            onChange={setPage}
          />
        </Flex>
      </Card>
    </div>
  );
}
