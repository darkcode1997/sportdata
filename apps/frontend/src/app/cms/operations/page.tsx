'use client';

import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import useSWR from 'swr';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  TimePicker,
  Typography,
} from 'antd';
import { CalendarClock, CheckCircle2, LockKeyhole, MapPin, Play, ScanSearch } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { CompetitionEntriesPanel } from '@/components/cms/CompetitionEntriesPanel';
import { api, fetcher } from '@/lib/api';

const resultLabels: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: 'default' },
  ENTERED: { label: 'Đã nhập', color: 'processing' },
  REFEREE_CONFIRMED: { label: 'Trọng tài xác nhận', color: 'cyan' },
  APPROVED: { label: 'Đã phê duyệt', color: 'blue' },
  PUBLISHED: { label: 'Đã công bố', color: 'green' },
  LOCKED: { label: 'Đã khóa', color: 'gold' },
};

function requestMessage(error: any, fallback: string) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('. ') : value || fallback;
}

export default function OperationsPage() {
  const { message } = AntApp.useApp();
  const [eventId, setEventId] = useState<string>();
  const [venueOpen, setVenueOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [slotSession, setSlotSession] = useState<any>();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<any>();
  const [scheduling, setScheduling] = useState(false);
  const [resultMatch, setResultMatch] = useState<any>();
  const [venueForm] = Form.useForm();
  const [sessionForm] = Form.useForm();
  const [slotForm] = Form.useForm();
  const [ruleForm] = Form.useForm();

  const { data: eventsResponse } = useSWR<any>('/events?limit=200', fetcher);
  const events = eventsResponse?.items || [];
  const { data: event } = useSWR<any>(eventId ? `/events/${eventId}` : null, fetcher);
  const { data: venues = [], mutate: mutateVenues } = useSWR<any[]>(eventId ? `/scheduling/venues?eventId=${eventId}` : null, fetcher);
  const { data: sessions = [], mutate: mutateSessions } = useSWR<any[]>(eventId ? `/scheduling/events/${eventId}/sessions` : null, fetcher);
  const { data: rules = [], mutate: mutateRules } = useSWR<any[]>(eventId ? `/scheduling/events/${eventId}/rules` : null, fetcher);
  const { data: conflictReport, mutate: mutateConflicts } = useSWR<any>(eventId ? `/scheduling/events/${eventId}/conflicts` : null, fetcher);
  const { data: matchesResponse, mutate: mutateMatches } = useSWR<any>(eventId ? `/matches?eventId=${eventId}&limit=50` : null, fetcher);
  const matches = matchesResponse?.items || [];
  const sports = event?.sports?.length ? event.sports : event?.sport ? [event.sport] : [];

  const saveVenue = async () => {
    try {
      const values = await venueForm.validateFields();
      await api.post('/scheduling/venues', { ...values, eventIds: [eventId] });
      message.success('Đã tạo địa điểm');
      setVenueOpen(false);
      venueForm.resetFields();
      await mutateVenues();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể tạo địa điểm'));
    }
  };

  const saveSession = async () => {
    try {
      const values = await sessionForm.validateFields();
      await api.post(`/scheduling/events/${eventId}/sessions`, {
        ...values,
        startTime: values.window[0].toISOString(),
        endTime: values.window[1].toISOString(),
        window: undefined,
      });
      message.success('Đã tạo ca thi đấu');
      setSessionOpen(false);
      sessionForm.resetFields();
      await mutateSessions();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể tạo ca thi đấu'));
    }
  };

  const generateSlots = async () => {
    try {
      const values = await slotForm.validateFields();
      const response = await api.post(`/scheduling/sessions/${slotSession.id}/time-slots/generate`, values);
      message.success(`Đã tạo ${response.data.created} time slot`);
      setSlotSession(undefined);
      slotForm.resetFields();
      await mutateSessions();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể tạo time slot'));
    }
  };

  const saveRule = async () => {
    try {
      const values = await ruleForm.validateFields();
      const toTime = (value: any) => value ? value.format('HH:mm') : undefined;
      await api.patch(`/scheduling/events/${eventId}/rules/${values.sportId}`, {
        ...values,
        sportId: undefined,
        earliestStart: toTime(values.earliestStart),
        latestEnd: toTime(values.latestEnd),
        preferredStart: toTime(values.preferredStart),
        preferredEnd: toTime(values.preferredEnd),
      });
      message.success('Đã lưu quy tắc xếp lịch');
      setRuleOpen(false);
      ruleForm.resetFields();
      await mutateRules();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(requestMessage(error, 'Không thể lưu quy tắc'));
    }
  };

  const autoSchedule = async (dryRun: boolean) => {
    if (!eventId) return;
    setScheduling(true);
    try {
      const response = await api.post(`/scheduling/events/${eventId}/auto-schedule`, { dryRun, onlyUnscheduled: true });
      setScheduleResult(response.data);
      message.success(dryRun ? 'Đã mô phỏng lịch' : `Đã xếp ${response.data.scheduled} trận`);
      if (!dryRun) await Promise.all([mutateMatches(), mutateConflicts(), mutateSessions()]);
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể xếp lịch'));
    } finally {
      setScheduling(false);
    }
  };

  const sessionColumns = [
    { title: 'Ca thi đấu', dataIndex: 'name' },
    { title: 'Địa điểm', render: (_: any, row: any) => row.venue?.name },
    { title: 'Bộ môn', render: (_: any, row: any) => row.sport?.name || 'Dùng chung' },
    { title: 'Thời gian', render: (_: any, row: any) => `${dayjs(row.startTime).format('DD/MM HH:mm')} – ${dayjs(row.endTime).format('HH:mm')}` },
    { title: 'Time slot', render: (_: any, row: any) => row._count?.timeSlots || 0 },
    { title: '', render: (_: any, row: any) => <Button onClick={() => setSlotSession(row)}>Tạo time slot</Button> },
  ];

  const matchColumns = [
    {
      title: 'Trận',
      render: (_: any, row: any) => (
        <div>
          <Typography.Text strong>#{row.matchNumber || '—'} · {row.category?.name}</Typography.Text>
          <Typography.Text type="secondary" className="block text-xs">
            {row.athlete1?.fullName || row.team1?.name || 'Chờ xác định'} vs {row.athlete2?.fullName || row.team2?.name || 'Chờ xác định'}
          </Typography.Text>
        </div>
      ),
    },
    { title: 'Lịch', render: (_: any, row: any) => row.startTime ? `${dayjs(row.startTime).format('DD/MM HH:mm')} · ${row.fop || '—'}` : <Tag>Chưa xếp</Tag> },
    { title: 'Kết quả', render: (_: any, row: any) => { const state = resultLabels[row.resultStatus || 'DRAFT']; return <Tag color={state.color}>{state.label}</Tag>; } },
    { title: '', render: (_: any, row: any) => <Button onClick={() => setResultMatch(row)}>Quy trình kết quả</Button> },
  ];

  const conflictColumns = [
    { title: 'Loại', dataIndex: 'type' },
    { title: 'Mức', dataIndex: 'severity', render: (value: string) => <Tag color={value === 'ERROR' ? 'red' : 'orange'}>{value}</Tag> },
    { title: 'Trận liên quan', dataIndex: 'matchIds', render: (value: string[]) => value?.join(', ') || '—' },
    { title: 'Chi tiết', render: (_: any, row: any) => row.participant || (row.requiredMinutes ? `Nghỉ tối thiểu ${row.requiredMinutes} phút` : '—') },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader title="Điều hành đại hội" description="Venue, ca thi đấu, time slot, xếp lịch có ràng buộc và quy trình công bố kết quả." />

      <Card className="cms-surface">
        <Typography.Text strong className="mb-2 block">Kỳ đại hội</Typography.Text>
        <Select showSearch optionFilterProp="label" className="w-full" size="large" placeholder="Chọn kỳ đại hội để điều hành" value={eventId} onChange={(value) => { setEventId(value); setScheduleResult(undefined); }} options={events.map((item: any) => ({ value: item.id, label: item.name }))} />
      </Card>

      {!eventId ? <Alert showIcon message="Chọn một kỳ đại hội để bắt đầu." /> : (
        <Tabs items={[
          {
            key: 'schedule',
            label: 'Xếp lịch',
            children: (
              <Space direction="vertical" size="large" className="w-full">
                <Row gutter={[16, 16]}>
                  <Col xs={12} lg={6}><Card><Statistic title="Địa điểm" value={venues.length} prefix={<MapPin className="h-4 w-4" />} /></Card></Col>
                  <Col xs={12} lg={6}><Card><Statistic title="Ca thi đấu" value={sessions.length} prefix={<CalendarClock className="h-4 w-4" />} /></Card></Col>
                  <Col xs={12} lg={6}><Card><Statistic title="Quy tắc môn" value={rules.length} /></Card></Col>
                  <Col xs={12} lg={6}><Card><Statistic title="Xung đột" value={conflictReport?.conflictCount || 0} valueStyle={{ color: conflictReport?.valid ? '#22c55e' : '#ef4444' }} /></Card></Col>
                </Row>
                <Card title="Chuẩn bị tài nguyên" extra={<Space wrap><Button icon={<MapPin className="h-4 w-4" />} onClick={() => setVenueOpen(true)}>Thêm địa điểm</Button><Button icon={<CalendarClock className="h-4 w-4" />} disabled={!venues.length} onClick={() => setSessionOpen(true)}>Thêm ca</Button><Button onClick={() => setRuleOpen(true)}>Quy tắc bộ môn</Button></Space>}>
                  <Table rowKey="id" size="small" pagination={false} columns={sessionColumns} dataSource={sessions} scroll={{ x: 800 }} />
                </Card>
                <Card title="Bộ xếp lịch" extra={<Space wrap><Button icon={<ScanSearch className="h-4 w-4" />} loading={scheduling} onClick={() => autoSchedule(true)}>Mô phỏng</Button><Button type="primary" icon={<Play className="h-4 w-4" />} loading={scheduling} onClick={() => autoSchedule(false)}>Áp dụng lịch</Button></Space>}>
                  {scheduleResult ? <Descriptions bordered size="small" column={{ xs: 1, sm: 4 }}><Descriptions.Item label="Chế độ">{scheduleResult.dryRun ? 'Mô phỏng' : 'Đã ghi lịch'}</Descriptions.Item><Descriptions.Item label="Yêu cầu">{scheduleResult.requested}</Descriptions.Item><Descriptions.Item label="Đã xếp">{scheduleResult.scheduled}</Descriptions.Item><Descriptions.Item label="Chưa xếp">{scheduleResult.unscheduled}</Descriptions.Item></Descriptions> : <Typography.Text type="secondary">Luôn chạy Mô phỏng và xử lý hết xung đột trước khi áp dụng.</Typography.Text>}
                </Card>
                <Card title="Báo cáo xung đột" extra={<Button onClick={() => mutateConflicts()}>Kiểm tra lại</Button>}>
                  {conflictReport?.valid ? <Alert showIcon type="success" message="Lịch hiện tại không có xung đột cứng." /> : <Table rowKey={(_, index) => String(index)} size="small" pagination={{ pageSize: 20 }} columns={conflictColumns} dataSource={conflictReport?.conflicts || []} scroll={{ x: 800 }} />}
                </Card>
              </Space>
            ),
          },
          { key: 'results', label: 'Kết quả & phê duyệt', children: <Card><Table rowKey="id" columns={matchColumns} dataSource={matches} pagination={{ pageSize: 20 }} scroll={{ x: 900 }} /></Card> },
          { key: 'entries', label: 'Đội, entry & thể thức', children: <CompetitionEntriesPanel eventId={eventId} event={event} /> },
        ]} />
      )}

      <Modal title="Thêm địa điểm" open={venueOpen} onCancel={() => setVenueOpen(false)} onOk={saveVenue} destroyOnHidden>
        <Form form={venueForm} layout="vertical"><Row gutter={12}><Col span={8}><Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input placeholder="NHD" /></Form.Item></Col><Col span={16}><Form.Item name="name" label="Tên địa điểm" rules={[{ required: true }]}><Input /></Form.Item></Col></Row><Form.Item name="location" label="Địa chỉ"><Input /></Form.Item><Row gutter={12}><Col span={10}><Form.Item name="capacity" label="Sức chứa"><InputNumber min={0} className="w-full" /></Form.Item></Col><Col span={14}><Form.Item name="timezone" label="Múi giờ" initialValue="Asia/Ho_Chi_Minh"><Input /></Form.Item></Col></Row><Form.Item name="sportIds" label="Bộ môn có thể tổ chức"><Select mode="multiple" options={sports.map((sport: any) => ({ value: sport.id, label: sport.name }))} /></Form.Item></Form>
      </Modal>

      <Modal title="Thêm ca thi đấu" open={sessionOpen} onCancel={() => setSessionOpen(false)} onOk={saveSession} destroyOnHidden>
        <Form form={sessionForm} layout="vertical"><Form.Item name="name" label="Tên ca" rules={[{ required: true }]}><Input placeholder="Ca sáng · Boxing" /></Form.Item><Form.Item name="venueId" label="Địa điểm" rules={[{ required: true }]}><Select options={venues.map((venue: any) => ({ value: venue.id, label: venue.name }))} /></Form.Item><Form.Item name="sportId" label="Bộ môn"><Select allowClear options={sports.map((sport: any) => ({ value: sport.id, label: sport.name }))} /></Form.Item><Form.Item name="window" label="Bắt đầu – kết thúc" rules={[{ required: true }]}><DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" /></Form.Item></Form>
      </Modal>

      <Modal title={`Tạo time slot · ${slotSession?.name || ''}`} open={Boolean(slotSession)} onCancel={() => setSlotSession(undefined)} onOk={generateSlots} destroyOnHidden>
        <Form form={slotForm} layout="vertical" initialValues={{ durationMinutes: 10, turnaroundMinutes: 5 }}><Form.Item name="fopIds" label="Sàn/FOP" rules={[{ required: true, type: 'array', min: 1 }]}><Select mode="multiple" options={(event?.fops || []).map((fop: any) => ({ value: fop.id, label: fop.name }))} /></Form.Item><Row gutter={12}><Col span={12}><Form.Item name="durationMinutes" label="Thời lượng (phút)"><InputNumber min={1} className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="turnaroundMinutes" label="Chuyển sân (phút)"><InputNumber min={0} className="w-full" /></Form.Item></Col></Row></Form>
      </Modal>

      <Modal title="Quy tắc xếp lịch bộ môn" open={ruleOpen} onCancel={() => setRuleOpen(false)} onOk={saveRule} width={720} destroyOnHidden>
        <Form form={ruleForm} layout="vertical" initialValues={{ matchDurationMinutes: 10, turnaroundMinutes: 5, minRestMinutes: 60, outdoor: false }}><Form.Item name="sportId" label="Bộ môn" rules={[{ required: true }]}><Select options={sports.map((sport: any) => ({ value: sport.id, label: sport.name }))} /></Form.Item><Row gutter={12}><Col span={8}><Form.Item name="matchDurationMinutes" label="Thi đấu (phút)"><InputNumber min={1} className="w-full" /></Form.Item></Col><Col span={8}><Form.Item name="turnaroundMinutes" label="Chuyển sân"><InputNumber min={0} className="w-full" /></Form.Item></Col><Col span={8}><Form.Item name="minRestMinutes" label="Nghỉ tối thiểu"><InputNumber min={0} className="w-full" /></Form.Item></Col></Row><Row gutter={12}><Col span={12}><Form.Item name="earliestStart" label="Bắt đầu sớm nhất" initialValue={dayjs('08:00', 'HH:mm')}><TimePicker format="HH:mm" className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="latestEnd" label="Kết thúc muộn nhất" initialValue={dayjs('22:00', 'HH:mm')}><TimePicker format="HH:mm" className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="preferredStart" label="Khung giờ vàng từ"><TimePicker format="HH:mm" className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="preferredEnd" label="Khung giờ vàng đến"><TimePicker format="HH:mm" className="w-full" /></Form.Item></Col></Row><Form.Item name="outdoor" label="Môn ngoài trời" valuePropName="checked"><Switch /></Form.Item></Form>
      </Modal>

      {resultMatch && <ResultWorkflowModal match={resultMatch} open onClose={() => setResultMatch(undefined)} onChanged={async () => { await mutateMatches(); }} />}
    </div>
  );
}

function ResultWorkflowModal({ match, open, onClose, onChanged }: { match: any; open: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [pending, setPending] = useState(false);
  const { data, mutate } = useSWR<any>(`/results/matches/${match.id}`, fetcher);
  const state = data?.resultStatus || match.resultStatus || 'DRAFT';
  const athletes = useMemo(() => [match.athlete1, match.athlete2].filter(Boolean), [match]);

  const act = async (action: string, payload: Record<string, unknown> = {}) => {
    setPending(true);
    try {
      await api.post(`/results/matches/${match.id}/${action}`, payload);
      message.success('Đã cập nhật quy trình kết quả');
      await Promise.all([mutate(), onChanged()]);
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể cập nhật kết quả'));
    } finally {
      setPending(false);
    }
  };

  const enter = async () => {
    try { await act('enter', await form.validateFields()); }
    catch (error: any) { if (!error?.errorFields) message.error(requestMessage(error, 'Dữ liệu chưa hợp lệ')); }
  };
  const nextAction = state === 'ENTERED' ? { action: 'referee-confirm', label: 'Trọng tài xác nhận' } : state === 'REFEREE_CONFIRMED' ? { action: 'approve', label: 'Phê duyệt' } : state === 'APPROVED' ? { action: 'publish', label: 'Công bố' } : state === 'PUBLISHED' ? { action: 'lock', label: 'Khóa kết quả' } : null;

  return (
    <Modal title={`Quy trình kết quả · Trận #${match.matchNumber || '—'}`} open={open} onCancel={onClose} footer={null} width={760} destroyOnHidden>
      <Space direction="vertical" size="large" className="w-full">
        <Alert showIcon type={state === 'LOCKED' ? 'success' : 'info'} message={resultLabels[state]?.label || state} />
        {(state === 'DRAFT' || state === 'ENTERED') && <Form form={form} layout="vertical" initialValues={{ athlete1Score: data?.athlete1Score ?? match.athlete1Score ?? 0, athlete2Score: data?.athlete2Score ?? match.athlete2Score ?? 0, winnerId: data?.winnerId || match.winnerId }}><Row gutter={12}><Col span={12}><Form.Item name="athlete1Score" label={`Điểm ${match.athlete1?.fullName || 'VĐV 1'}`}><InputNumber className="w-full" /></Form.Item></Col><Col span={12}><Form.Item name="athlete2Score" label={`Điểm ${match.athlete2?.fullName || 'VĐV 2'}`}><InputNumber className="w-full" /></Form.Item></Col></Row><Form.Item name="winnerId" label="Người thắng"><Select allowClear options={athletes.map((athlete: any) => ({ value: athlete.id, label: athlete.fullName }))} /></Form.Item>{state === 'ENTERED' && <Form.Item name="reason" label="Lý do hiệu chỉnh" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>}<Button type="primary" loading={pending} onClick={enter}>Lưu kết quả</Button></Form>}
        <Space wrap>{nextAction && <Button type="primary" icon={<CheckCircle2 className="h-4 w-4" />} loading={pending} onClick={() => act(nextAction.action)}>{nextAction.label}</Button>}{state !== 'DRAFT' && state !== 'ENTERED' && <Button danger icon={<LockKeyhole className="h-4 w-4" />} loading={pending} onClick={() => act('reopen', { reason: 'Mở lại từ màn hình điều hành' })}>Mở lại để hiệu chỉnh</Button>}</Space>
        <Card size="small" title="Lịch sử phiên bản"><Table rowKey="id" size="small" pagination={false} dataSource={data?.resultRevisions || []} columns={[{ title: 'Phiên bản', dataIndex: 'version' }, { title: 'Thao tác', dataIndex: 'action' }, { title: 'Trạng thái', dataIndex: 'status' }, { title: 'Thời gian', dataIndex: 'createdAt', render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm:ss') }, { title: 'Lý do', dataIndex: 'reason' }]} /></Card>
      </Space>
    </Modal>
  );
}
