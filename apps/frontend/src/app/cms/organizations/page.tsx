'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  type TableProps,
} from 'antd';
import { Building2, Flag, Pencil, Plus, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type Country = {
  id: string;
  code: string;
  name: string;
  flagUrl?: string | null;
  _count?: { athletes?: number; federations?: number; teams?: number; entries?: number };
};

type Organization = {
  id: string;
  code?: string | null;
  name: string;
  type: string;
  countryId: string;
  country: Country;
  _count?: { athletes?: number; organizedEvents?: number; participatingEvents?: number };
};

type CountryForm = { code: string; name: string; flagUrl?: string };
type OrganizationForm = { code?: string; name: string; type: string; countryId: string };

const typeOptions = [
  { value: 'INTERNATIONAL_FEDERATION', label: 'Liên đoàn quốc tế' },
  { value: 'NATIONAL_FEDERATION', label: 'Liên đoàn quốc gia' },
  { value: 'SPORTS_CENTER', label: 'Trung tâm thể thao' },
  { value: 'CLUB', label: 'Câu lạc bộ' },
  { value: 'SCHOOL', label: 'Trường học' },
  { value: 'ACADEMY', label: 'Học viện' },
  { value: 'OTHER', label: 'Đơn vị khác' },
];

export default function OrganizationsManagementPage() {
  const { data: currentUser } = useSWR<{ role?: string }>('/auth/profile', fetcher);
  const countriesQuery = useSWR<Country[]>('/countries', fetcher);
  const organizationsQuery = useSWR<Organization[]>('/federations', fetcher);
  const countries = Array.isArray(countriesQuery.data) ? countriesQuery.data : [];
  const organizations = Array.isArray(organizationsQuery.data) ? organizationsQuery.data : [];
  const role = currentUser?.role;
  const canManageCountries = ['ADMIN', 'CONTENT'].includes(role);
  const canManageOrganizations = ['ADMIN', 'CONTENT', 'GAMES_ADMIN', 'SPORT_MANAGER'].includes(role);
  const canDeleteCountries = role === 'ADMIN';
  const canDeleteOrganizations = ['ADMIN', 'GAMES_ADMIN'].includes(role);
  const [countryForm] = Form.useForm<CountryForm>();
  const [organizationForm] = Form.useForm<OrganizationForm>();
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useSportDataToast();

  const openCountry = (country?: Country) => {
    setEditingCountry(country || null);
    countryForm.setFieldsValue(country
      ? { code: country.code, name: country.name, flagUrl: country.flagUrl || '' }
      : { code: '', name: '', flagUrl: '' });
    setCountryModalOpen(true);
  };

  const openOrganization = (organization?: Organization) => {
    setEditingOrganization(organization || null);
    organizationForm.setFieldsValue(organization
      ? { code: organization.code || '', name: organization.name, type: organization.type, countryId: organization.countryId }
      : { code: '', name: '', type: 'NATIONAL_FEDERATION', countryId: countries[0]?.id || '' });
    setOrganizationModalOpen(true);
  };

  const saveCountry = async (values: CountryForm) => {
    setSaving(true);
    const payload = { ...values, code: values.code.trim().toUpperCase(), flagUrl: values.flagUrl?.trim() || undefined };
    try {
      if (editingCountry) await api.patch(`/countries/${editingCountry.id}`, payload);
      else await api.post('/countries', payload);
      await Promise.all([countriesQuery.mutate(), organizationsQuery.mutate()]);
      setCountryModalOpen(false);
      toast.success(editingCountry ? 'Đã cập nhật quốc gia.' : 'Đã thêm quốc gia.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu quốc gia.');
    } finally {
      setSaving(false);
    }
  };

  const saveOrganization = async (values: OrganizationForm) => {
    setSaving(true);
    const payload = { ...values, code: values.code?.trim().toUpperCase() || undefined };
    try {
      if (editingOrganization) await api.patch(`/federations/${editingOrganization.id}`, payload);
      else await api.post('/federations', payload);
      await organizationsQuery.mutate();
      setOrganizationModalOpen(false);
      toast.success(editingOrganization ? 'Đã cập nhật đơn vị.' : 'Đã thêm đơn vị.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể lưu đơn vị.');
    } finally {
      setSaving(false);
    }
  };

  const removeCountry = async (country: Country) => {
    try {
      await api.delete(`/countries/${country.id}`);
      await countriesQuery.mutate();
      toast.success('Đã xóa quốc gia.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa quốc gia đang được sử dụng.');
    }
  };

  const removeOrganization = async (organization: Organization) => {
    try {
      await api.delete(`/federations/${organization.id}`);
      await organizationsQuery.mutate();
      toast.success('Đã xóa đơn vị.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể xóa đơn vị đang được sử dụng.');
    }
  };

  const countryColumns: TableProps<Country>['columns'] = [
    {
      title: 'Quốc gia',
      key: 'country',
      render: (_, country) => (
        <Flex align="center" gap={12}>
          <span className="grid h-9 w-12 place-items-center overflow-hidden rounded-lg bg-slate-800 text-xs font-black">
            {country.flagUrl ? (
              // Flags are configured by administrators and may use different hosts.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={country.flagUrl} alt={`Cờ ${country.name}`} className="h-full w-full object-cover" />
            ) : country.code}
          </span>
          <div><strong>{country.name}</strong><div><Tag className="mt-1">{country.code}</Tag></div></div>
        </Flex>
      ),
    },
    { title: 'Đơn vị', width: 110, render: (_, country) => country._count?.federations || 0 },
    { title: 'VĐV', width: 110, render: (_, country) => country._count?.athletes || 0 },
    {
      title: 'Thao tác',
      width: 120,
      align: 'right',
      render: (_, country) => (
        <Space size={4}>
          {canManageCountries && <Tooltip title="Chỉnh sửa"><Button type="text" icon={<Pencil className="h-4 w-4" />} onClick={() => openCountry(country)} /></Tooltip>}
          {canDeleteCountries && <Popconfirm title={`Xóa “${country.name}”?`} description="Chỉ có thể xóa quốc gia chưa được sử dụng." onConfirm={() => removeCountry(country)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}><Button type="text" danger icon={<Trash2 className="h-4 w-4" />} /></Popconfirm>}
        </Space>
      ),
    },
  ];

  const organizationColumns: TableProps<Organization>['columns'] = [
    {
      title: 'Đơn vị thể thao',
      key: 'organization',
      render: (_, organization) => <div><strong>{organization.name}</strong><div className="mt-1"><Tag>{organization.code || '—'}</Tag><Tag color="blue">{typeOptions.find((item) => item.value === organization.type)?.label}</Tag></div></div>,
    },
    { title: 'Quốc gia', width: 210, render: (_, organization) => `${organization.country?.code || '—'} · ${organization.country?.name || 'Chưa xác định'}` },
    { title: 'Sự kiện tổ chức', width: 135, align: 'center', render: (_, organization) => organization._count?.organizedEvents || 0 },
    { title: 'VĐV', width: 90, align: 'center', render: (_, organization) => organization._count?.athletes || 0 },
    {
      title: 'Thao tác',
      width: 120,
      align: 'right',
      render: (_, organization) => (
        <Space size={4}>
          {canManageOrganizations && <Tooltip title="Chỉnh sửa"><Button type="text" icon={<Pencil className="h-4 w-4" />} onClick={() => openOrganization(organization)} /></Tooltip>}
          {canDeleteOrganizations && <Popconfirm title={`Xóa “${organization.name}”?`} description="Chỉ có thể xóa đơn vị chưa có VĐV hoặc sự kiện." onConfirm={() => removeOrganization(organization)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}><Button type="text" danger icon={<Trash2 className="h-4 w-4" />} /></Popconfirm>}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Quốc gia & đơn vị thể thao"
        description="Quản lý mạng lưới liên đoàn, trung tâm, câu lạc bộ và quốc gia tham gia sự kiện."
        icon={<Building2 className="h-6 w-6" />}
        action={(
          <Space wrap>
            {canManageCountries && <Button icon={<Flag className="h-4 w-4" />} onClick={() => openCountry()}>Thêm quốc gia</Button>}
            {canManageOrganizations && <Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={() => openOrganization()}>Thêm đơn vị</Button>}
          </Space>
        )}
      />

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Tabs
          className="px-5 pt-2"
          items={[
            {
              key: 'organizations',
              label: `Đơn vị thể thao (${organizations.length})`,
              children: <Table rowKey="id" columns={organizationColumns} dataSource={organizations} loading={organizationsQuery.isLoading} pagination={{ pageSize: 12 }} scroll={{ x: 920 }} />,
            },
            {
              key: 'countries',
              label: `Quốc gia (${countries.length})`,
              children: <Table rowKey="id" columns={countryColumns} dataSource={countries} loading={countriesQuery.isLoading} pagination={{ pageSize: 12 }} scroll={{ x: 620 }} />,
            },
          ]}
        />
      </Card>

      <Modal title={editingCountry ? 'Chỉnh sửa quốc gia' : 'Thêm quốc gia'} open={countryModalOpen} onCancel={() => setCountryModalOpen(false)} footer={null} destroyOnHidden>
        <Form form={countryForm} layout="vertical" className="mt-5" onFinish={saveCountry}>
          <Flex gap={12}>
            <Form.Item name="code" label="Mã quốc gia" className="w-36" rules={[{ required: true }, { max: 10 }]}><Input className="uppercase" placeholder="VIE" /></Form.Item>
            <Form.Item name="name" label="Tên quốc gia" className="flex-1" rules={[{ required: true }]}><Input placeholder="Việt Nam" /></Form.Item>
          </Flex>
          <Form.Item name="flagUrl" label="URL cờ quốc gia"><Input type="url" placeholder="https://..." /></Form.Item>
          <Flex justify="flex-end" gap={10}><Button onClick={() => setCountryModalOpen(false)}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>Lưu quốc gia</Button></Flex>
        </Form>
      </Modal>

      <Modal title={editingOrganization ? 'Chỉnh sửa đơn vị' : 'Thêm đơn vị thể thao'} open={organizationModalOpen} onCancel={() => setOrganizationModalOpen(false)} footer={null} destroyOnHidden width={640}>
        <Form form={organizationForm} layout="vertical" className="mt-5" onFinish={saveOrganization}>
          <Form.Item name="countryId" label="Quốc gia" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={countries.map((country) => ({ value: country.id, label: `${country.code} · ${country.name}` }))} /></Form.Item>
          <Form.Item name="type" label="Loại đơn vị" rules={[{ required: true }]}><Select options={typeOptions} /></Form.Item>
          <Flex gap={12}>
            <Form.Item name="code" label="Mã đơn vị" className="w-40" rules={[{ max: 30 }]}><Input className="uppercase" placeholder="VNF" /></Form.Item>
            <Form.Item name="name" label="Tên đơn vị" className="flex-1" rules={[{ required: true }]}><Input placeholder="Liên đoàn..." /></Form.Item>
          </Flex>
          <Flex justify="flex-end" gap={10}><Button onClick={() => setOrganizationModalOpen(false)}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>Lưu đơn vị</Button></Flex>
        </Form>
      </Modal>
    </div>
  );
}
