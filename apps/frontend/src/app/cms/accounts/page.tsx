'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Popconfirm, Space, Table, Tag, type TableProps } from 'antd';
import { Building2, CheckCircle2, UserCheck, XCircle } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type FederationAccount = {
  id: string;
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
  const query = useSWR<FederationAccount[]>('/participant-auth/admin/federation-accounts', fetcher);
  const { data: currentUser } = useSWR<{ role?: string }>('/auth/profile', fetcher);
  const [updating, setUpdating] = useState<string>();
  const toast = useSportDataToast();
  const canReview = ['ADMIN', 'GAMES_ADMIN'].includes(currentUser?.role || '');

  const updateStatus = async (account: FederationAccount, status: FederationAccount['verificationStatus']) => {
    setUpdating(account.id);
    try {
      await api.patch(`/participant-auth/admin/federation-accounts/${account.id}/status`, { status });
      await query.mutate();
      toast.success(status === 'VERIFIED' ? 'Đã cấp quyền đại diện đơn vị.' : 'Đã từ chối yêu cầu tài khoản.');
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
      title: 'Người đại diện',
      key: 'representative',
      render: (_, row) => (
        <div><strong>{row.displayName}</strong><p className="text-xs text-slate-500">{row.representativePosition || 'Chưa khai báo chức vụ'}</p></div>
      ),
    },
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
        <Space>
          {row.verificationStatus !== 'VERIFIED' && (
            <Popconfirm title="Xác nhận người này có quyền đại diện đơn vị?" onConfirm={() => void updateStatus(row, 'VERIFIED')}>
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
      <CmsPageHeader title="Tài khoản liên đoàn / CLB" description="SportData xác minh người đại diện trước khi cho phép đăng ký danh sách vận động viên." icon={<UserCheck className="h-6 w-6" />} />
      <Card title={<span className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Yêu cầu quyền đại diện</span>}>
        <Table rowKey="id" loading={query.isLoading} columns={columns} dataSource={query.data || []} scroll={{ x: 900 }} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
