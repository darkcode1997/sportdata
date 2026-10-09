'use client';

import { PersonNameInput } from '@/components/PersonNameInput';
import { PERSONAL_ACCOUNT_OPTIONS } from '@/lib/account-roles';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Checkbox, Col, DatePicker, Form, Input, Row, Select } from 'antd';
import { UserPlus } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { participantApi, participantError, setParticipantSession } from '@/lib/participant-auth';
import { vietnamCountryId } from '@/lib/countries';

type Country = { id: string; code: string; name: string };
export default function ParticipantRegisterPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [form] = Form.useForm();
  const accountType = Form.useWatch('accountType', form) || 'GENERAL';
  const isAthlete = accountType === 'ATHLETE';
  const isProfessional = !['GENERAL', 'ATHLETE'].includes(accountType);
  const { data: federations = [] } = useSWR<Array<{ id: string; name: string; countryId: string }>>('/federations', fetcher);
  const countryId = Form.useWatch('countryId', form);
  const [loading, setLoading] = useState(false);
  const { data: countries = [] } = useSWR<Country[]>('/countries', fetcher);

  useEffect(() => {
    const defaultCountryId = vietnamCountryId(countries);
    if (defaultCountryId && !form.getFieldValue('countryId')) {
      form.setFieldValue('countryId', defaultCountryId);
    }
  }, [countries, form]);

  const submit = async (values: any) => {
    setLoading(true);
    try {
      const payload = {
        ...values,
        birthDate: values.birthDate?.format('YYYY-MM-DD'),
      };
      const { data } = await participantApi.post('/participant-auth/register', payload);
      setParticipantSession(data.accessToken, data.account);
      toast.success('Tạo tài khoản SportData thành công.');
      router.replace('/account');
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể tạo tài khoản'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-64px)] justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-5xl">
      <Card className="w-full" title="Đăng ký tài khoản SportData">
        <p className="mb-6 text-sm text-slate-400">Tài khoản cá nhân dùng chung cho mọi sự kiện và bộ môn trên nền tảng.</p>
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item name="accountType" label="Bạn đăng ký với tư cách nào?" initialValue="GENERAL" rules={[{ required: true }]}>
            <Select size="large" options={[...PERSONAL_ACCOUNT_OPTIONS]} />
          </Form.Item>
          <p className="mb-6 text-sm text-slate-400">{isAthlete ? 'Tạo hồ sơ vận động viên để đăng ký thi đấu và quản lý vé.' : isProfessional ? 'Hồ sơ chuyên môn chờ SportData xác minh. Nhiệm vụ tại mỗi sự kiện được ban tổ chức duyệt riêng.' : 'Tài khoản để theo dõi sự kiện, tin tức và quản lý lựa chọn nhận email.'}</p>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="displayName" label="Họ và tên theo giấy tờ" rules={[{ required: true, min: 2 }]}>
                <PersonNameInput size="large" autoComplete="name" />
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
              <Form.Item name="birthDate" label="Ngày sinh" rules={[{ required: isAthlete }]}>
                <DatePicker size="large" className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="gender" label="Giới tính" rules={[{ required: isAthlete }]}>
                <Select size="large" options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="countryId" label="Quốc gia" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  options={countries.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
                />
              </Form.Item>
            </Col>
          </Row>
          {isProfessional && <>
            <Form.Item name="federationId" label="Đơn vị / CLB" rules={[{ required: accountType === 'TEAM_LEADER', message: 'Trưởng đoàn cần chọn đơn vị đại diện' }]}>
              <Select allowClear showSearch optionFilterProp="label" options={federations.filter(item => item.countryId === countryId).map(item => ({ value: item.id, label: item.name }))} />
            </Form.Item>
            <Form.Item name="professionalSummary" label="Chuyên môn, chứng chỉ và kinh nghiệm" rules={[{ required: true, message: 'Vui lòng giới thiệu chuyên môn để ban tổ chức xác minh' }, { max: 2000 }]}>
              <Input.TextArea rows={4} placeholder="Bộ môn, cấp trọng tài/HLV, chuyên ngành y tế, đơn vị công tác hoặc kinh nghiệm trưởng đoàn…" />
            </Form.Item>
          </>}
          <Form.Item name="marketingEnabled" valuePropName="checked" initialValue={false}>
            <Checkbox>Tôi muốn nhận email giới thiệu sự kiện và bài viết mới từ SportData. Có thể hủy bất cứ lúc nào.</Checkbox>
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<UserPlus className="h-4 w-4" />}>
            Tạo tài khoản
          </Button>
        </Form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Đã có tài khoản? <Link className="font-semibold text-sky-400" href="/account/login">Đăng nhập</Link>
        </p>
      </Card>
      </div>
    </main>
  );
}
