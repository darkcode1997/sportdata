'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Col, DatePicker, Form, Input, InputNumber, Row, Select } from 'antd';
import { UserPlus } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';

type Country = { id: string; code: string; name: string };
type Federation = { id: string; name: string; code?: string; countryId: string };

export default function ParticipantRegisterPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [countryId, setCountryId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { data: countries = [] } = useSWR<Country[]>('/countries', fetcher);
  const { data: federations = [] } = useSWR<Federation[]>('/federations', fetcher);
  const availableFederations = useMemo(
    () => federations.filter((item) => item.countryId === countryId),
    [countryId, federations],
  );

  const submit = async (values: any) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...values,
        birthDate: values.birthDate.format('YYYY-MM-DD'),
        federationId: values.federationId || undefined,
      };
      const { data } = await participantApi.post('/participant-auth/register', payload);
      setParticipantSession(data.accessToken, data.account);
      router.replace('/account');
    } catch (requestError) {
      setError(participantError(requestError, 'Không thể tạo tài khoản'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] px-4 py-12">
      <Card className="mx-auto max-w-3xl" title="Đăng ký tài khoản vận động viên">
        <p className="mb-6 text-sm text-slate-400">Tài khoản dùng chung cho mọi sự kiện và bộ môn trên nền tảng.</p>
        {error && <Alert className="mb-5" type="error" showIcon message={error} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="displayName" label="Họ và tên theo giấy tờ" rules={[{ required: true, min: 2 }]}>
                <Input size="large" autoComplete="name" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input size="large" autoComplete="tel" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email đăng nhập" rules={[{ required: true }, { type: 'email' }]}>
                <Input size="large" autoComplete="email" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: 'Mật khẩu tối thiểu 8 ký tự' }]}>
                <Input.Password size="large" autoComplete="new-password" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: true }]}>
                <DatePicker size="large" className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="gender" label="Giới tính thi đấu" rules={[{ required: true }]}>
                <Select size="large" options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="weight" label="Cân nặng hiện tại (kg)">
                <InputNumber size="large" className="w-full" min={1} max={300} step={0.1} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="countryId" label="Quốc gia" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  options={countries.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
                  onChange={(value) => {
                    setCountryId(value);
                    form.setFieldValue('federationId', undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="federationId" label="Liên đoàn / CLB (không bắt buộc)">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  disabled={!countryId}
                  placeholder="Để trống nếu là VĐV tự do"
                  options={availableFederations.map((item) => ({ value: item.id, label: item.name }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Alert className="mb-5" type="info" showIcon message="Bạn có thể đăng ký độc lập nếu chưa thuộc liên đoàn hoặc CLB." />
          <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<UserPlus className="h-4 w-4" />}>
            Tạo tài khoản
          </Button>
        </Form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Đã có tài khoản? <Link className="font-semibold text-sky-400" href="/account/login">Đăng nhập</Link>
        </p>
      </Card>
    </main>
  );
}
