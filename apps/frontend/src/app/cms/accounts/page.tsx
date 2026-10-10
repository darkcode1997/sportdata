'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Modal, Popconfirm, Select, Space, Table, Tag, type TableProps } from 'antd';
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { accountTypeLabel, sportDataAccountTypeOptions, type SportDataAccountType } from '@/lib/sportdata-account-types';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type FederationAccount = {
  id: string;
  accountTypes: SportDataAccountType[];
  email: string;
  displayName: string;
  phone?: string | null;
  representativePosition?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  isActive: boolean;
  createdAt: string;
  federation?: { name: string; type: string; country: { name: string; code: string } } | null;
};

export default function FederationAccountsCmsPage() {
  const query = useSWR<FederationAccount[]>('/participant-auth/admin/accounts', fetcher);
  const { data: currentUser } = useSWR<{ role?: string }>('/auth/profile', fetcher);
  const [editing, setEditing] = useState<FederationAccount>();
  const [selectedType, setSelectedType] = useState<SportDataAccountType>();
  const [updating, setUpdating] = useState<string>();
  const toast = useSportDataToast();
  const canReview = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role || '');

  const updateStatus = async (account: FederationAccount, status: FederationAccount['verificationStatus']) => {
    setUpdating(account.id);
    try {
      await api.patch(`/participant-auth/admin/accounts/${account.id}/status`, { status });
      await query.mutate();
      toast.success(status === 'VERIFIED' ? 'Đã duyệt tài khoản SportData.' : 'Đã từ chối yêu cầu tài khoản.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật tài khoản.');
    } finally {
      setUpdating(undefined);
    }
  };

  const columns: TableProps<FederationAccount>['columns'] = [
    {
      title: 'Đơn vị',
      key: 'federation',
      render: (_, row) => (
        <div><strong>{row.federation?.name || 'Không còn liên kết'}</strong><p className="mt-1 text-xs text-slate-500">{row.federation?.country.code} · {row.federation?.country.name}</p></div>
      ),
    },
    {
      title: 'Tài khoản',
      key: 'representative',
      render: (_, row) => (
        <div><strong>{row.displayName}</strong><p className="text-xs text-slate-500">{row.representativePosition || 'Chưa khai báo chức vụ'}</p></div>
      ),
    },
    { title: 'Loại tài khoản', key: 'accountTypes', filters: sportDataAccountTypeOptions.map((item) => ({ text: item.label, value: item.value })), onFilter: (value, row) => row.accountTypes.includes(value as SportDataAccountType), render: (_, row) => row.accountTypes.map((type) => <Tag key={type} color="blue">{accountTypeLabel(type)}</Tag>) },
    { title: 'Liên hệ', key: 'contact', render: (_, row) => <div><span>{row.email}</span><p className="text-xs text-slate-500">{row.phone || '—'}</p></div> },
    { title: 'Ngày gửi', dataIndex: 'createdAt', width: 120, render: (value: string) => new Date(value).toLocaleDateString('vi-VN') },
    {
      title: 'Trạng thái',
      dataIndex: 'verificationStatus',
      width: 145,
      render: (status: FederationAccount['verificationStatus']) => (
        <Tag color={status === 'VERIFIED' ? 'success' : status === 'REJECTED' ? 'error' : 'processing'}>
          {status === 'VERIFIED' ? 'Đã duyệt' : status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 210,
      render: (_, row) => canReview ? (
        <Space wrap>
          <Button size="small" onClick={() => { setEditing(row); setSelectedType(row.accountTypes[0]); }}>Loại tài khoản</Button>
          {row.verificationStatus !== 'VERIFIED' && (
            <Popconfirm title="Duyệt tài khoản SportData này?" onConfirm={() => void updateStatus(row, 'VERIFIED')}>
              <Button size="small" type="primary" loading={updating === row.id} icon={<CheckCircle2 className="h-4 w-4" />}>Duyệt</Button>
            </Popconfirm>
          )}
          {row.verificationStatus !== 'REJECTED' && (
            <Popconfirm title="Từ chối yêu cầu tài khoản này?" onConfirm={() => void updateStatus(row, 'REJECTED')}>
              <Button size="small" danger loading={updating === row.id} icon={<XCircle className="h-4 w-4" />}>Từ chối</Button>
            </Popconfirm>
          )}
        </Space>
      ) : <span className="text-sm text-slate-500">Chỉ xem</span>,
    },
  ];

  return (
    <div>
      <CmsPageHeader title="Tài khoản SportData" description="Quản lý chung tài khoản với các loại VĐV, Trọng tài, Huấn luyện viên, Trưởng đoàn và Nhân viên y tế." icon={<UserCheck className="h-6 w-6" />} />
      <Card title="Danh sách tài khoản SportData">
        <Table rowKey="id" loading={query.isLoading} columns={columns} dataSource={query.data || []} scroll={{ x: 900 }} pagination={{ pageSize: 10 }} />
      </Card>
      <Modal open={Boolean(editing)} title="Loại tài khoản SportData" onCancel={() => setEditing(undefined)} okText="Lưu" cancelText="Hủy" confirmLoading={Boolean(updating)} okButtonProps={{ disabled: !selectedType }} onOk={async () => {
        if (!editing || !selectedType) return;
        setUpdating(editing.id);
        try {
          await api.patch('/participant-auth/admin/accounts/' + editing.id + '/types', { accountTypes: [selectedType] });
          await query.mutate(); setEditing(undefined); toast.success('Đã cập nhật loại tài khoản.');
        } catch (error: any) { toast.error(error.response?.data?.message || 'Không thể cập nhật loại tài khoản.'); }
        finally { setUpdating(undefined); }
      }}>
        <p className="mb-4">Mỗi tài khoản chỉ được chọn một loại.</p>
        <Select className="w-full" value={selectedType} onChange={setSelectedType} options={[...sportDataAccountTypeOptions]} />
      </Modal>
    </div>
  );
}
