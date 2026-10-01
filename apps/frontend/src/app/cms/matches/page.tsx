'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Input,
  Form,
  Modal,
  Pagination,
  Popconfirm,
  Select,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableProps,
} from 'antd';
import { List, Network, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { RemoteAthleteSelect } from '@/components/cms/RemoteAthleteSelect';
import { SportdataBracket, type BracketDraw } from '@/components/brackets/SportdataBracket';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { AthleteQuickViewModal } from '@/components/cms/AthleteQuickViewModal';

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

type DrawFormValues = {
  eventId: string;
  sportIds: string[];
  categoryIds: string[];
  athleteIdsByCategory: Record<string, string[]>;
  type: 'MAIN_TREE' | 'DOUBLE_ELIMINATION';
  seedingMode: string;
  name?: string;
  fops: string[];
};

export default function MatchesListPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canGenerateDraw = ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER'].includes(currentUser?.role);
  const canManage = canGenerateDraw || currentUser?.role === 'VENUE_OPERATOR';
  const canDelete = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [sportId, setSportId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawGenerating, setDrawGenerating] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>();
  const toast = useSportDataToast();
  const [drawForm] = Form.useForm();
  const selectedEventId = Form.useWatch('eventId', drawForm);
  const selectedSportIds: string[] = Form.useWatch('sportIds', drawForm) || [];
  const selectedCategoryIds: string[] = Form.useWatch('categoryIds', drawForm) || [];
  const selectedDrawType = Form.useWatch('type', drawForm) || 'MAIN_TREE';

  const { data: eventsResponse } = useSWR<any>('/events?limit=500', fetcher);
  const { data: sportsResponse } = useSWR<any>('/sports', fetcher);
  const { data: categoriesResponse } = useSWR<any>('/categories?limit=500', fetcher);
  const { data: selectedEventDetails } = useSWR<any>(
    selectedEventId ? `/events/${selectedEventId}` : null,
    fetcher,
  );
  const { data: filterEventDetails } = useSWR<any>(
    eventId ? `/events/${eventId}` : null,
    fetcher,
  );
  const events = eventsResponse?.items || [];
  const sports = Array.isArray(sportsResponse) ? sportsResponse : sportsResponse?.items || [];
  const allCategories = categoriesResponse?.items || [];
  const filterEvent = filterEventDetails || events.find((event: any) => event.id === eventId);
  const filterEventSportIds = new Set<string>([
    ...(filterEvent?.sports || []).map((sport: any) => sport.id),
    ...(filterEvent?.sportId ? [filterEvent.sportId] : []),
  ]);
  const filterEventCategoryIds = new Set<string>(
    (filterEvent?.categories || []).map((category: any) => category.id),
  );
  const filterSports = eventId && filterEventSportIds.size
    ? sports.filter((sport: any) => filterEventSportIds.has(sport.id))
    : sports;
  const filterCategories = sportId
    ? allCategories.filter((category: any) => (
      category.sportId === sportId
      && (!eventId || !filterEventCategoryIds.size || filterEventCategoryIds.has(category.id))
    ))
    : [];
  const selectedEvent = selectedEventDetails
    || events.find((event: any) => event.id === selectedEventId);
  const eventSportIds = new Set<string>([
    ...(selectedEvent?.sports || []).map((sport: any) => sport.id),
    ...(selectedEvent?.sportId ? [selectedEvent.sportId] : []),
  ]);
  const eventSports = (selectedEvent?.sports?.length
    ? selectedEvent.sports
    : selectedEvent?.sport
      ? [selectedEvent.sport]
      : []) as any[];
  const eventCategoryIds = new Set<string>(
    (selectedEvent?.categories || []).map((category: any) => category.id),
  );
  const eventCategories = allCategories.filter((category: any) => (
    eventCategoryIds.size
      ? eventCategoryIds.has(category.id)
      : eventSportIds.has(category.sportId)
  ));
  const availableCategories = eventCategories.filter((category: any) => (
    selectedSportIds.includes(category.sportId)
  ));
  const selectedCategories = selectedCategoryIds
    .map((categoryId) => eventCategories.find((category: any) => category.id === categoryId))
    .filter(Boolean);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (eventId) params.set('eventId', eventId);
    if (status) params.set('status', status);
    if (sportId) params.set('sportId', sportId);
    if (categoryId) params.set('categoryId', categoryId);
    if (deferredSearch.trim()) params.set('search', deferredSearch.trim());
    return `/matches?${params}`;
  }, [categoryId, deferredSearch, eventId, page, sportId, status]);

  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const matches = data?.items || [];
  const drawQuery = viewMode === 'tree' && eventId && categoryId
    ? `/matches/event/${encodeURIComponent(eventId)}/category/${encodeURIComponent(categoryId)}/draws`
    : null;
  const {
    data: drawsResponse,
    error: drawsError,
    isLoading: drawsLoading,
    mutate: mutateDraws,
  } = useSWR<{ draws: BracketDraw[] }>(drawQuery, fetcher);
  const draws = [...(drawsResponse?.draws || [])].sort((left, right) => left.sortOrder - right.sortOrder);

  useEffect(() => {
    if (error) toast.error('Không thể tải danh sách trận đấu.');
  }, [error, toast]);

  useEffect(() => {
    if (drawsError) toast.error('Không thể tải sơ đồ cây thi đấu.');
  }, [drawsError, toast]);

  const remove = async (id: string) => {
    try {
      await api.delete(`/matches/${id}`);
      await Promise.all([mutate(), mutateDraws()]);
      toast.success('Đã xóa trận đấu.');
    } catch (requestError: any) {
      toast.error(requestError.response?.data?.message || 'Không thể xóa trận đấu.');
    }
  };

  const generateDraw = async (values: DrawFormValues) => {
    setDrawGenerating(true);
    const failures: Array<{ categoryId: string; categoryName: string; message: string }> = [];
    let generatedCount = 0;

    try {
      // Gửi tuần tự để số trận của các hạng không bị trùng nhau.
      for (const categoryId of values.categoryIds) {
        const category = eventCategories.find((item: any) => item.id === categoryId);
        try {
          await api.post(
            `/matches/event/${values.eventId}/category/${categoryId}/generate-draw`,
            {
              athleteIds: values.athleteIdsByCategory?.[categoryId] || [],
              type: values.type,
              seedingMode: values.seedingMode,
              name: values.name?.trim() || undefined,
              fops: values.fops,
            },
          );
          generatedCount += 1;
        } catch (requestError: any) {
          const message = requestError.response?.data?.message || 'Không thể sinh cây thi đấu.';
          failures.push({
            categoryId,
            categoryName: category?.name || categoryId,
            message: Array.isArray(message) ? message.join(', ') : message,
          });
        }
      }

      await Promise.all([mutate(), mutateDraws()]);

      if (!failures.length) {
        const firstCategory = eventCategories.find((category: any) => category.id === values.categoryIds[0]);
        setEventId(values.eventId);
        setSportId(firstCategory?.sportId || '');
        setCategoryId(values.categoryIds[0] || '');
        setViewMode('tree');
        setDrawOpen(false);
        drawForm.resetFields();
        toast.success(`Đã sinh ${generatedCount} cây thi đấu.`);
        return;
      }

      drawForm.setFieldValue('categoryIds', failures.map((failure) => failure.categoryId));
      toast.error({ content: [
        generatedCount ? `Đã sinh ${generatedCount}/${values.categoryIds.length} cây.` : '',
        ...failures.map((failure) => `${failure.categoryName}: ${failure.message}`),
      ].filter(Boolean).join(' '), duration: 7 });
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
            {match.athlete1 ? <Button type="link" className="h-auto !p-0 font-semibold" onClick={() => setSelectedAthleteId(match.athlete1.id)}>{match.athlete1.fullName}</Button> : 'Chờ xác định'}
            <Typography.Text type="secondary"> vs </Typography.Text>
            {match.athlete2 ? <Button type="link" className="h-auto !p-0 font-semibold" onClick={() => setSelectedAthleteId(match.athlete2.id)}>{match.athlete2.fullName}</Button> : 'Chờ xác định'}
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
          {canManage && <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              href={`/cms/matches/${match.id}/edit`}
              aria-label="Chỉnh sửa"
              icon={<Pencil className="h-4 w-4" />}
            />
          </Tooltip>}
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
        action={canManage ? (
          <Space wrap>
            {canGenerateDraw && <Button
              size="large"
              icon={<Network className="h-4 w-4" />}
              onClick={() => {
                setDrawOpen(true);
              }}
            >
              Sinh cây tự động
            </Button>}
            <Button type="primary" size="large" href="/cms/matches/new" icon={<Plus className="h-4 w-4" />}>
              Tạo trận đấu
            </Button>
          </Space>
        ) : undefined}
      />

      <Modal
        title="Sinh cây thi đấu tự động"
        open={drawOpen}
        width={840}
        rootClassName="draw-generation-modal-root"
        style={{ top: 24, paddingBottom: 24 }}
        okText="Sinh cây"
        cancelText="Hủy"
        confirmLoading={drawGenerating}
        maskClosable={!drawGenerating}
        closable={!drawGenerating}
        keyboard={!drawGenerating}
        onCancel={() => {
          if (!drawGenerating) setDrawOpen(false);
        }}
        onOk={() => drawForm.submit()}
        destroyOnHidden
      >
        <Form
          form={drawForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            sportIds: [],
            categoryIds: [],
            athleteIdsByCategory: {},
            fops: [],
            type: 'MAIN_TREE',
            seedingMode: 'STANDARD',
          }}
          onFinish={generateDraw}
        >
          <Form.Item name="eventId" label="Sự kiện" rules={[{ required: true, message: 'Chọn sự kiện' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={events.map((event: any) => ({ value: event.id, label: event.name }))}
              onChange={() => drawForm.setFieldsValue({
                sportIds: [],
                categoryIds: [],
                athleteIdsByCategory: {},
                fops: [],
              })}
            />
          </Form.Item>
          <Form.Item
            name="sportIds"
            label="Bộ môn"
            rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất 1 bộ môn' }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder={selectedEventId ? 'Chọn một hoặc nhiều bộ môn' : 'Chọn sự kiện trước'}
              disabled={!selectedEventId}
              options={eventSports.map((sport: any) => ({ value: sport.id, label: sport.name }))}
              onChange={(sportIds: string[]) => {
                const validSportIds = new Set(sportIds);
                const validCategoryIds = selectedCategoryIds.filter((categoryId) => {
                  const category = eventCategories.find((item: any) => item.id === categoryId);
                  return category && validSportIds.has(category.sportId);
                });
                const athleteIdsByCategory = drawForm.getFieldValue('athleteIdsByCategory') || {};
                drawForm.setFieldsValue({
                  categoryIds: validCategoryIds,
                  athleteIdsByCategory: Object.fromEntries(
                    validCategoryIds.map((categoryId) => [categoryId, athleteIdsByCategory[categoryId] || []]),
                  ),
                });
              }}
            />
          </Form.Item>
          <Form.Item
            name="categoryIds"
            label="Hạng thi đấu"
            rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất 1 hạng thi đấu' }]}
          >
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder={selectedSportIds.length ? 'Chọn một hoặc nhiều hạng thi đấu' : 'Chọn bộ môn trước'}
              disabled={!selectedSportIds.length}
              options={selectedSportIds.map((sportId) => {
                const sport = eventSports.find((item: any) => item.id === sportId);
                return {
                  label: sport?.name || 'Bộ môn',
                  options: availableCategories
                    .filter((category: any) => category.sportId === sportId)
                    .map((category: any) => ({ value: category.id, label: category.name })),
                };
              })}
              notFoundContent="Bộ môn này chưa có hạng thi đấu trong sự kiện"
              onChange={(categoryIds: string[]) => {
                const athleteIdsByCategory = drawForm.getFieldValue('athleteIdsByCategory') || {};
                drawForm.setFieldValue(
                  'athleteIdsByCategory',
                  Object.fromEntries(categoryIds.map((categoryId) => [
                    categoryId,
                    athleteIdsByCategory[categoryId] || [],
                  ])),
                );
              }}
            />
          </Form.Item>

          {selectedCategories.length > 0 && (
            <>
              <Divider className="my-4" titlePlacement="start">Vận động viên theo hạng</Divider>
              <div className="space-y-3">
                {selectedCategories.map((category: any) => {
                  const minimumAthletes = selectedDrawType === 'DOUBLE_ELIMINATION' ? 4 : 2;
                  return (
                    <Card
                      key={category.id}
                      size="small"
                      className="cms-surface"
                      title={category.name}
                      extra={<Tag color="blue">{category.sport?.name || '—'}</Tag>}
                    >
                      <Form.Item
                        className="mb-0"
                        name={['athleteIdsByCategory', category.id]}
                        label="Thứ tự hạt giống"
                        rules={[{
                          validator: (_, athleteIds: string[] = []) => (
                            athleteIds.length >= minimumAthletes
                              ? Promise.resolve()
                              : Promise.reject(new Error(
                                selectedDrawType === 'DOUBLE_ELIMINATION'
                                  ? 'Thể thức nhánh thắng/thua cần ít nhất 4 vận động viên'
                                  : 'Chọn ít nhất 2 vận động viên',
                              ))
                          ),
                        }]}
                      >
                        <RemoteAthleteSelect
                          mode="multiple"
                          eventId={selectedEventId}
                          categoryId={category.id}
                          autoSelectAll
                          placeholder="Hạt giống số 1, số 2..."
                        />
                      </Form.Item>
                    </Card>
                  );
                })}
              </div>
              <Typography.Text type="secondary" className="mt-2 block text-xs">
                Mỗi hạng sẽ sinh một cây riêng. Thứ tự vận động viên trong ô chọn là thứ tự hạt giống.
              </Typography.Text>
            </>
          )}

          <Divider className="my-4" titlePlacement="start">Thiết lập chung</Divider>
          <Flex gap={16} wrap>
            <Form.Item className="min-w-64 flex-1" name="type" label="Thể thức">
              <Select options={[
                { value: 'MAIN_TREE', label: 'Loại trực tiếp · Main tree' },
                { value: 'DOUBLE_ELIMINATION', label: 'Loại kép · Nhánh thắng/thua' },
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
            <Form.Item
              className="min-w-64 flex-1"
              name="fops"
              label="Sàn / FOP"
              rules={[{ required: true, type: 'array', min: 1, message: 'Chọn ít nhất 1 sàn' }]}
            >
              <Select
                mode="tags"
                showSearch
                optionFilterProp="label"
                tokenSeparators={[',', ';']}
                placeholder="Chọn hoặc nhập FOP 1, FOP 2..."
                options={(selectedEvent?.fops || []).map((fop: any) => ({
                  value: fop.name,
                  label: fop.name,
                }))}
              />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex align="center" justify="space-between" gap={12} wrap>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'tree' | 'list')}
            options={[
              { value: 'tree', label: 'Sơ đồ cây', icon: <Network className="h-4 w-4" /> },
              { value: 'list', label: 'Danh sách', icon: <List className="h-4 w-4" /> },
            ]}
          />
          <Typography.Text type="secondary">
            {viewMode === 'tree' ? 'Bấm vào một ô vận động viên để cập nhật trận đấu.' : 'Xem và lọc toàn bộ trận đấu.'}
          </Typography.Text>
        </Flex>
        <Divider className="my-4" />
        <Flex gap={12} wrap>
          <Select
            showSearch
            optionFilterProp="label"
            size="large"
            className="w-full sm:w-72"
            value={eventId}
            placeholder="Chọn sự kiện"
            options={[
              { value: '', label: 'Tất cả sự kiện' },
              ...events.map((event: any) => ({ value: event.id, label: event.name })),
            ]}
            onChange={(value) => {
              setEventId(value);
              setSportId('');
              setCategoryId('');
              setPage(1);
            }}
          />
          {viewMode === 'list' && (
            <Input
              allowClear
              size="large"
              prefix={<Search className="h-4 w-4 text-slate-500" />}
              placeholder="Tìm vận động viên hoặc sự kiện..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="min-w-64 flex-1"
            />
          )}
          <Select
            showSearch
            optionFilterProp="label"
            size="large"
            className="w-full sm:w-56"
            value={sportId}
            disabled={viewMode === 'tree' && !eventId}
            onChange={(value) => {
              setSportId(value);
              setCategoryId('');
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả bộ môn' },
              ...filterSports.map((sport: any) => ({
                value: sport.id,
                label: sport.name,
              })),
            ]}
          />
          <Select
            showSearch
            optionFilterProp="label"
            size="large"
            className="w-full sm:w-72"
            value={categoryId}
            disabled={!sportId}
            onChange={(value) => {
              setCategoryId(value);
              setPage(1);
            }}
            options={[
              { value: '', label: 'Tất cả hạng cân / nội dung' },
              ...filterCategories.map((category: any) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
          {viewMode === 'list' && (
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
          )}
        </Flex>
      </Card>

      {viewMode === 'tree' ? (
        <div className="space-y-5">
          {!eventId || !sportId || !categoryId ? (
            <Card className="cms-surface">
              <Empty description="Chọn sự kiện, bộ môn và hạng thi đấu để xem sơ đồ cây." />
            </Card>
          ) : drawsLoading ? (
            <Card loading className="cms-surface" />
          ) : draws.length ? (
            draws.map((draw) => (
              <SportdataBracket
                key={draw.id}
                draw={draw}
                matchHref={(match) => canManage ? `/cms/matches/${match.id}/edit` : undefined}
              />
            ))
          ) : (
            <Card className="cms-surface">
              <Empty description="Hạng thi đấu này chưa có cây. Chọn “Sinh cây tự động” để tạo." />
            </Card>
          )}
        </div>
      ) : (
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
      )}
      <AthleteQuickViewModal
        athleteId={selectedAthleteId}
        open={Boolean(selectedAthleteId)}
        onClose={() => setSelectedAthleteId(undefined)}
      />
    </div>
  );
}
