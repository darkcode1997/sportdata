'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useState } from 'react';
import useSWR from 'swr';
import {
  App as AntApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { Network, Plus, Users } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { ENTRY_STATUS_META, ENTRY_TYPE_LABELS, labelOf, statusMeta } from '@/lib/vi-labels';
import { RemoteAthleteSelect } from './RemoteAthleteSelect';
import { vietnamCountryId } from '@/lib/countries';

function requestMessage(error: any, fallback: string) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('. ') : value || fallback;
}

export function CompetitionEntriesPanel({
  eventId,
  event,
  readOnly = false,
  onChanged,
}: {
  eventId: string;
  event: any;
  readOnly?: boolean;
  onChanged?: () => void | Promise<void>;
}) {
  const { message } = AntApp.useApp();
  const [categoryId, setCategoryId] = useState<string>();
  const [countryId, setCountryId] = useState<string>();
  const [selectedEntryIds, setSelectedEntryIds] = useState<React.Key[]>([]);
  const [teamOpen, setTeamOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [generator, setGenerator] = useState<'HEAT' | 'ROUND_ROBIN'>();
  const [teamForm] = Form.useForm();
  const [entryForm] = Form.useForm();
  const [generatorForm] = Form.useForm();
  const teamCountryId = Form.useWatch('countryId', teamForm);
  const entryType = Form.useWatch('type', entryForm) || 'INDIVIDUAL';

  const { data: countryResponse } = useSWR<any>('/countries?limit=300', fetcher);
  const countries = Array.isArray(countryResponse) ? countryResponse : countryResponse?.items || [];
  const { data: teams = [], mutate: mutateTeams } = useSWR<any[]>(`/competitions/events/${eventId}/teams`, fetcher);
  const { data: entries = [], mutate: mutateEntries } = useSWR<any[]>(categoryId ? `/competitions/events/${eventId}/categories/${categoryId}/entries` : null, fetcher);
  const sports = event?.sports?.length ? event.sports : event?.sport ? [event.sport] : [];
  const categories = event?.categories || [];
  const category = categories.find((item: any) => item.id === categoryId);
  const availableTeams = teams.filter((team: any) => !category?.sportId || team.sportId === category.sportId);
  const filteredEntries = countryId ? entries.filter((entry: any) => entry.countryId === countryId) : entries;
  const entryCountries = countries.filter((country: any) => entries.some((entry: any) => entry.countryId === country.id));

  const createTeam = async () => {
    try {
      const values = await teamForm.validateFields();
      await api.post(`/competitions/events/${eventId}/teams`, {
        ...values,
        members: values.memberIds.map((athleteId: string, index: number) => ({
          athleteId,
          relayLeg: values.relay ? index + 1 : undefined,
        })),
        memberIds: undefined,
        relay: undefined,
      });
      message.success('Đã tạo đội/đội tiếp sức');
      setTeamOpen(false);
      teamForm.resetFields();
      await mutateTeams();
      await onChanged?.();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể tạo đội'));
    }
  };

  const createEntry = async () => {
    try {
      const values = await entryForm.validateFields();
      await api.post(`/competitions/events/${eventId}/categories/${categoryId}/entries`, values);
      message.success('Đã thêm lượt đăng ký thi đấu');
      setEntryOpen(false);
      entryForm.resetFields();
      await mutateEntries();
      await onChanged?.();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể thêm lượt đăng ký thi đấu'));
    }
  };

  const generate = async () => {
    try {
      const values = await generatorForm.validateFields();
      const path = generator === 'HEAT' ? 'heats/generate' : 'round-robin/generate';
      await api.post(`/competitions/events/${eventId}/categories/${categoryId}/${path}`, {
        ...values,
        entryIds: selectedEntryIds,
      });
      message.success(generator === 'HEAT' ? 'Đã tạo lượt đấu và phân làn' : 'Đã tạo lịch vòng tròn');
      setGenerator(undefined);
      generatorForm.resetFields();
      setSelectedEntryIds([]);
      await onChanged?.();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể sinh thể thức'));
    }
  };

  const columns = [
    {
      title: 'Lượt đăng ký',
      render: (_: any, row: any) => (
        <div>
          <Typography.Text strong>{row.athlete?.fullName || row.team?.name}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">
            {row.country?.name} · {labelOf(ENTRY_TYPE_LABELS, row.type, 'Chưa xác định')}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Hạt giống', dataIndex: 'seed', render: (value: number) => value || '—' },
    { title: 'Số đeo', dataIndex: 'bib', render: (value: string) => value || '—' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => { const item = statusMeta(ENTRY_STATUS_META, value); return <Tag color={item.color}>{item.label}</Tag>; } },
  ];

  return (
    <Space direction="vertical" size="large" className="w-full">
      <Card title="Đăng ký thi đấu" extra={<Space wrap><Button icon={<Users className="h-4 w-4" />} disabled={readOnly} onClick={() => { teamForm.setFieldsValue({ countryId: vietnamCountryId(countries), relay: false }); setTeamOpen(true); }}>Tạo đội/đội tiếp sức</Button><Button type="primary" icon={<Plus className="h-4 w-4" />} disabled={readOnly || !categoryId} onClick={() => setEntryOpen(true)}>Thêm lượt đăng ký</Button></Space>}>
        <ToastNotice className="mb-4" type="info" showIcon message="Chọn bộ môn → hạng mục → quốc gia → VĐV/đội" description="Danh sách VĐV được lọc phía server theo giới tính, tuổi và cân nặng của hạng mục." />
        <Typography.Text strong className="mb-2 block">Hạng mục thi đấu</Typography.Text>
        <Select
          showSearch
          optionFilterProp="label"
          className="w-full"
          placeholder="Chọn hạng mục"
          value={categoryId}
          onChange={(value) => { setCategoryId(value); setCountryId(undefined); setSelectedEntryIds([]); }}
          options={sports.map((sport: any) => ({
            label: sport.name,
            options: categories.filter((item: any) => item.sportId === sport.id).map((item: any) => ({ value: item.id, label: item.name })),
          }))}
        />
      </Card>

      {categoryId ? <Card title={`${category?.name || 'Hạng mục'} · ${entries.length} lượt đăng ký`} extra={<Space wrap><Button icon={<Network className="h-4 w-4" />} disabled={readOnly || selectedEntryIds.length < 2} onClick={() => setGenerator('HEAT')}>Tạo lượt đấu/phân làn</Button><Button disabled={readOnly || selectedEntryIds.length < 2} onClick={() => setGenerator('ROUND_ROBIN')}>Tạo vòng tròn</Button></Space>}>
        <Space wrap className="mb-4 w-full">
          <Select allowClear showSearch optionFilterProp="label" placeholder="Lọc theo quốc gia" value={countryId} onChange={(value) => { setCountryId(value); setSelectedEntryIds([]); }} className="min-w-64" options={entryCountries.map((country: any) => ({ value: country.id, label: `${country.name} · ${country.code}` }))} />
          <Button disabled={readOnly || !filteredEntries.length} onClick={() => setSelectedEntryIds(filteredEntries.map((entry: any) => entry.id))}>Chọn tất cả đang hiển thị</Button>
          {selectedEntryIds.length > 0 && <Button onClick={() => setSelectedEntryIds([])}>Bỏ chọn ({selectedEntryIds.length})</Button>}
        </Space>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredEntries}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          rowSelection={readOnly ? undefined : { selectedRowKeys: selectedEntryIds, onChange: setSelectedEntryIds }}
        />
      </Card> : <ToastNotice showIcon message="Chọn hạng mục để quản lý danh sách đăng ký." />}

      <Modal title="Tạo đội hoặc đội tiếp sức" open={teamOpen} onCancel={() => setTeamOpen(false)} onOk={createTeam} width={680} destroyOnHidden>
        <Form form={teamForm} layout="vertical"><Row gutter={12}><Col span={12}><Form.Item name="sportId" label="Bộ môn" rules={[{ required: true }]}><Select options={sports.map((sport: any) => ({ value: sport.id, label: sport.name }))} /></Form.Item></Col><Col span={12}><Form.Item name="countryId" label="Quốc gia" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={countries.map((country: any) => ({ value: country.id, label: `${country.name} · ${country.code}` }))} /></Form.Item></Col></Row><Row gutter={12}><Col span={16}><Form.Item name="name" label="Tên đội" rules={[{ required: true }]}><Input /></Form.Item></Col><Col span={8}><Form.Item name="code" label="Mã đội"><Input /></Form.Item></Col></Row><Form.Item name="relay" label="Loại đội"><Radio.Group options={[{ value: false, label: 'Đội thông thường' }, { value: true, label: 'Đội tiếp sức' }]} /></Form.Item><Form.Item name="memberIds" label="Thành viên theo thứ tự thi đấu" rules={[{ required: true, type: 'array', min: 1 }]}><RemoteAthleteSelect mode="multiple" eventId={eventId} countryId={teamCountryId} maxTagCount={2} selectionLabel="thành viên" showPageControls /></Form.Item></Form>
      </Modal>

      <Modal title="Thêm lượt đăng ký thi đấu" open={entryOpen} onCancel={() => setEntryOpen(false)} onOk={createEntry} destroyOnHidden>
        <Form form={entryForm} layout="vertical" initialValues={{ type: 'INDIVIDUAL', status: 'VERIFIED' }}><Form.Item name="type" label="Hình thức tham dự" rules={[{ required: true }]}><Radio.Group options={[{ value: 'INDIVIDUAL', label: 'Cá nhân' }, { value: 'TEAM', label: 'Đội' }, { value: 'RELAY', label: 'Tiếp sức' }]} /></Form.Item>{entryType === 'INDIVIDUAL' ? <Form.Item name="athleteId" label="Vận động viên" rules={[{ required: true }]}><RemoteAthleteSelect eventId={eventId} categoryId={categoryId} /></Form.Item> : <Form.Item name="teamId" label="Đội" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={availableTeams.map((team: any) => ({ value: team.id, label: `${team.name} · ${team.country?.code}` }))} /></Form.Item>}<Row gutter={12}><Col span={12}><Form.Item name="seed" label="Hạt giống"><InputNumber min={1} className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="bib" label="Số đeo"><Input /></Form.Item></Col></Row><Form.Item name="status" label="Trạng thái"><Select options={[{ value: 'REGISTERED', label: 'Đã đăng ký' }, { value: 'VERIFIED', label: 'Đã xác minh' }]} /></Form.Item></Form>
      </Modal>

      <Modal title={generator === 'HEAT' ? 'Tạo lượt đấu và phân làn' : 'Tạo vòng tròn'} open={Boolean(generator)} onCancel={() => setGenerator(undefined)} onOk={generate} destroyOnHidden>
        <ToastNotice className="mb-4" type="info" showIcon message={`Đã chọn ${selectedEntryIds.length} lượt đăng ký`} />
        <Form form={generatorForm} layout="vertical" initialValues={generator === 'HEAT' ? { laneCount: category?.laneCount || 8, round: 1, namePrefix: 'Lượt' } : { groupCount: 1, namePrefix: 'Bảng' }}>
          {generator === 'HEAT' ? <><Form.Item name="laneCount" label="Số làn"><InputNumber min={2} max={16} className="w-full" /></Form.Item><Form.Item name="round" label="Vòng"><InputNumber min={1} className="w-full" /></Form.Item><Form.Item name="namePrefix" label="Tiền tố"><Input /></Form.Item></> : <><Form.Item name="groupCount" label="Số bảng"><InputNumber min={1} className="w-full" /></Form.Item><Form.Item name="namePrefix" label="Tên bảng"><Input /></Form.Item></>}
        </Form>
      </Modal>
    </Space>
  );
}
