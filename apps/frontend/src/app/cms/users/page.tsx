'use client';

import { PersonNameInput } from '@/components/PersonNameInput';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Pencil, Plus, ShieldCheck, Trash2, UserCog, UserRound } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { CMS_ROLE_INFO, CMS_ROLES, type CmsRole } from '@/lib/cms-access';
import { api, fetcher } from '@/lib/api';

type CmsUser = {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: CmsRole;
  isActive: boolean;
  permissions?: string[];
  createdAt: string;
};

type UserForm = {
  name: string;
  username: string;
  email: string;
  role: CmsRole;
  isActive: boolean;
  permissions?: string[];
  password?: string;
};

function requestMessage(error: any, fallback: string) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('. ') : value || fallback;
}

export default function CmsUsersPage() {
  const toast = useSportDataToast();
  const [form] = Form.useForm<UserForm>();
  const selectedRole = Form.useWatch('role', form);
  const { data: users = [], isLoading, mutate } = useSWR<CmsUser[]>('/users', fetcher);
  const { data: profile } = useSWR<CmsUser>('/auth/profile', fetcher);
  const [editing, setEditing] = useState<CmsUser | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const create = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ role: 'CONTENT', isActive: true, permissions: [] });
    setOpen(true);
  };

  const edit = (user: CmsUser) => {
    setEditing(user);
    form.setFieldsValue({
      name: user.name,
      username: user.username || '',
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      permissions: user.permissions || [],
      password: undefined,
    });
    setOpen(true);
  };

  const save = async () => {
    let values: UserForm;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const payload = { ...values, permissions: values.role === 'ADMIN' ? values.permissions || [] : [], password: values.password?.trim() || undefined };
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload);
        toast.success('Đã cập nhật tài khoản CMS');
      } else {
        await api.post('/users', payload);
        toast.success('Đã tạo tài khoản CMS');
      }
      setOpen(false);
      form.resetFields();
      await mutate();
    } catch (error: any) {
      toast.error(requestMessage(error, 'Không thể lưu tài khoản.'));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (user: CmsUser, isActive: boolean) => {
    if (user.id === profile?.id) return;
    setUpdatingId(user.id);
    try {
      await api.patch(`/users/${user.id}`, { isActive });
      toast.success(isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      await mutate();
    } catch (error: any) {
      toast.error(requestMessage(error, 'Không thể cập nhật trạng thái.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const remove = async (user: CmsUser) => {
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Đã xóa tài khoản CMS');
      await mutate();
    } catch (error: any) {
      toast.error(requestMessage(error, 'Không thể xóa tài khoản.'));
    }
  };

  const columns: ColumnsType<CmsUser> = [
    {
      title: 'Tài khoản',
      key: 'account',
      render: (_, user) => (
        <Space size={12} className={user.isActive ? '' : 'opacity-55'}>
          <Avatar icon={<UserRound className="h-4 w-4" />} className="bg-sblue-500/15 text-sblue-400" />
          <div>
            <Typography.Text strong className="block">{user.name}</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">@{user.username || 'chưa-có-username'}</Typography.Text>
          </div>
        </Space>
      ),
    },
    { title: 'Email', dataIndex: 'email', responsive: ['md'] },
    {
      title: 'Quyền',
      dataIndex: 'role',
      width: 190,
      render: (role: CmsRole) => (
        <Tag color={role === 'ADMIN' || role === 'GAMES_ADMIN' ? 'blue' : 'cyan'} icon={<ShieldCheck className="h-3 w-3" />}>
          {CMS_ROLE_INFO[role]?.shortLabel || role}
        </Tag>
      ),
    },
    {
      title: 'Hoạt động',
      key: 'active',
      width: 130,
      render: (_, user) => (
        <Switch
          size="small"
          checked={user.isActive}
          loading={updatingId === user.id}
          disabled={user.id === profile?.id}
          onChange={(checked) => updateStatus(user, checked)}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 110,
      render: (_, user) => (
        <Space size={4}>
          <Button type="text" aria-label={`Sửa ${user.name}`} icon={<Pencil className="h-4 w-4" />} onClick={() => edit(user)} />
          <Popconfirm
            title="Xóa tài khoản CMS?"
            description={`Tài khoản ${user.name} sẽ bị xóa vĩnh viễn.`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={user.id === profile?.id}
            onConfirm={() => remove(user)}
          >
            <Button danger type="text" disabled={user.id === profile?.id} aria-label={`Xóa ${user.name}`} icon={<Trash2 className="h-4 w-4" />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Tài khoản CMS"
        description="Quản lý người vận hành, vai trò và quyền truy cập trung tâm quản trị."
        icon={<UserCog className="h-6 w-6" />}
        action={<Button type="primary" size="large" icon={<Plus className="h-4 w-4" />} onClick={create}>Thêm tài khoản</Button>}
      />
      <Table<CmsUser>
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={isLoading}
        scroll={{ x: 820 }}
        pagination={{ pageSize: 12, showSizeChanger: false }}
      />

      <Modal
        open={open}
        title={editing ? 'Chỉnh sửa tài khoản CMS' : 'Thêm tài khoản CMS'}
        okText={editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        cancelText="Hủy"
        confirmLoading={saving}
        onOk={save}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        forceRender
      >
        <Form form={form} layout="vertical" requiredMark={false} className="pt-3">
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên hiển thị' }, { min: 2, message: 'Tên phải có ít nhất 2 ký tự' }]}>
            <PersonNameInput placeholder="Nguyễn Văn A" />
          </Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item
              name="username"
              label="Tên đăng nhập"
              rules={[
                { required: true, message: 'Nhập tên đăng nhập' },
                { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' },
                { pattern: /^[a-zA-Z0-9._-]+$/, message: 'Chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc gạch ngang' },
              ]}
            >
              <Input prefix="@" autoComplete="off" />
            </Form.Item>
            <Form.Item name="role" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
              <Select
                disabled={editing?.id === profile?.id}
                options={CMS_ROLES.map((role) => ({ value: role, label: CMS_ROLE_INFO[role].label }))}
                onChange={(role) => {
                  if (role !== 'ADMIN') form.setFieldValue('permissions', []);
                }}
              />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input type="email" autoComplete="off" />
          </Form.Item>
          <Form.Item name="permissions" label="Quyền riêng" extra="Chỉ cấp cho tài khoản Quản trị hệ thống.">
            <Select
              mode="multiple"
              disabled={selectedRole !== 'ADMIN'}
              options={[{ value: 'DRAW_PRECONFIGURE', label: 'Đặt trước cặp & preview cây đấu' }]}
            />
          </Form.Item>
          <Form.Item name="isActive" label="Cho phép đăng nhập" valuePropName="checked">
            <Switch disabled={editing?.id === profile?.id} />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}
            rules={[{ required: !editing, message: 'Nhập mật khẩu' }, { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' }]}
          >
            <Input.Password autoComplete="new-password" placeholder={editing ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
