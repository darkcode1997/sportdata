'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
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
import { CheckCircle2, Eye, Mail, Search, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type ContactStatus = 'NEW' | 'READ' | 'RESOLVED';

const statusMap: Record<ContactStatus, { label: string; color: string }> = {
  NEW: { label: 'Mới', color: 'error' },
  READ: { label: 'Đã xem', color: 'blue' },
  RESOLVED: { label: 'Đã xử lý', color: 'success' },
};

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function ContactsManagementPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canDelete = currentUser?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContactStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<any>();
  const [adminNote, setAdminNote] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useSportDataToast();

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'ALL') params.set('status', status);
    return `/contacts?${params}`;
  }, [page, search, status]);
  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const contacts = data?.items || [];

  useEffect(() => {
    if (error) toast.error('Không thể tải danh sách liên hệ.');
  }, [error, toast]);

  const openContact = async (contact: any) => {
    const nextContact = contact.status === 'NEW' ? { ...contact, status: 'READ' } : contact;
    setSelectedContact(nextContact);
    setAdminNote(contact.adminNote || '');
    if (contact.status === 'NEW') {
      try {
        await api.patch(`/contacts/${contact.id}`, { status: 'READ' });
        await mutate();
      } catch {
        setSelectedContact(contact);
      }
    }
  };

  const saveContact = async (nextStatus: ContactStatus = selectedContact?.status || 'READ') => {
    if (!selectedContact) return;
    setSaving(true);
    try {
      const { data: updated } = await api.patch(`/contacts/${selectedContact.id}`, {
        status: nextStatus,
        adminNote,
      });
      setSelectedContact(updated);
      await mutate();
      toast.success(nextStatus === 'RESOLVED' ? 'Đã đánh dấu liên hệ là đã xử lý.' : 'Đã lưu ghi chú liên hệ.');
    } catch (updateError: any) {
      toast.error(updateError.response?.data?.message || 'Không thể cập nhật liên hệ.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);
      if (selectedContact?.id === id) setSelectedContact(undefined);
      await mutate();
      toast.success('Đã xóa liên hệ.');
    } catch (deleteError: any) {
      toast.error(deleteError.response?.data?.message || 'Không thể xóa liên hệ.');
    }
  };

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Người liên hệ',
      key: 'contact',
      width: 270,
      render: (_, contact) => (
        <div className="min-w-0">
          <Flex align="center" gap={8}>
            {contact.status === 'NEW' && <Badge status="error" />}
            <Typography.Text strong className="truncate">{contact.fullName}</Typography.Text>
          </Flex>
          <a className="mt-1 block truncate text-xs text-sblue-400" href={`mailto:${contact.email}`}>{contact.email}</a>
          {contact.phone && <Typography.Text type="secondary" className="block text-xs">{contact.phone}</Typography.Text>}
        </div>
      ),
    },
    {
      title: 'Nội dung',
      key: 'message',
      width: 360,
      render: (_, contact) => (
        <div className="min-w-0">
          <Typography.Text strong className="block truncate">{contact.subject || 'Không có chủ đề'}</Typography.Text>
          <Typography.Text type="secondary" className="block truncate text-xs">{contact.message}</Typography.Text>
        </div>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      width: 170,
      render: (value) => <Typography.Text type="secondary">{dateFormat.format(new Date(value))}</Typography.Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      render: (value: ContactStatus) => <Tag color={statusMap[value].color}>{statusMap[value].label}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      fixed: 'right',
      align: 'right',
      render: (_, contact) => (
        <Space size={4}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" icon={<Eye className="h-4 w-4" />} onClick={() => openContact(contact)} aria-label="Xem chi tiết" />
          </Tooltip>
          <Tooltip title="Gửi email">
            <Button type="text" href={`mailto:${contact.email}`} icon={<Mail className="h-4 w-4" />} aria-label="Gửi email" />
          </Tooltip>
          {canDelete && (
            <Popconfirm title="Xóa liên hệ này?" okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => remove(contact.id)}>
              <Tooltip title="Xóa">
                <Button type="text" danger icon={<Trash2 className="h-4 w-4" />} aria-label="Xóa" />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Quản lý liên hệ"
        description="Theo dõi email, nội dung yêu cầu và trạng thái phản hồi người dùng."
        action={data?.newCount ? <Tag color="error">{data.newCount} liên hệ mới</Tag> : undefined}
      />

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            size="large"
            className="min-w-64 flex-1"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm tên, email hoặc chủ đề..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          <Select
            size="large"
            className="w-full sm:w-48"
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: 'ALL', label: 'Mọi trạng thái' },
              { value: 'NEW', label: 'Mới' },
              { value: 'READ', label: 'Đã xem' },
              { value: 'RESOLVED', label: 'Đã xử lý' },
            ]}
          />
        </Flex>
      </Card>

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={contacts}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 980 }}
          locale={{ emptyText: 'Chưa có liên hệ.' }}
        />
        <Flex justify="flex-end" className="border-t border-sdark-800 p-4">
          <Pagination current={page} total={data?.total || 0} pageSize={20} showSizeChanger={false} onChange={setPage} />
        </Flex>
      </Card>

      <Drawer
        open={Boolean(selectedContact)}
        onClose={() => setSelectedContact(undefined)}
        title="Chi tiết liên hệ"
        width="min(520px, 100vw)"
      >
        {selectedContact && (
          <div className="space-y-6">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Họ tên">{selectedContact.fullName}</Descriptions.Item>
              <Descriptions.Item label="Email"><a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a></Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{selectedContact.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Chủ đề">{selectedContact.subject || '—'}</Descriptions.Item>
              <Descriptions.Item label="Thời gian">{dateFormat.format(new Date(selectedContact.createdAt))}</Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Title level={5}>Nội dung</Typography.Title>
              <div className="cms-contact-message">{selectedContact.message}</div>
            </div>
            <div>
              <Typography.Title level={5}>Ghi chú nội bộ</Typography.Title>
              <Input.TextArea rows={5} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} placeholder="Ghi chú tình trạng xử lý..." />
            </div>
            <Flex gap={10} wrap>
              <Button type="primary" loading={saving} onClick={() => saveContact()}>
                Lưu ghi chú
              </Button>
              {selectedContact.status !== 'RESOLVED' && (
                <Button icon={<CheckCircle2 className="h-4 w-4" />} loading={saving} onClick={() => saveContact('RESOLVED')}>
                  Đánh dấu đã xử lý
                </Button>
              )}
              <Button href={`mailto:${selectedContact.email}`} icon={<Mail className="h-4 w-4" />}>Phản hồi qua email</Button>
            </Flex>
          </div>
        )}
      </Drawer>
    </div>
  );
}
