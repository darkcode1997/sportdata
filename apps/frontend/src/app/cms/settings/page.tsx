'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  KeyRound,
  Pencil,
  Plus,
  Settings,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, clearAuthToken, fetcher } from '@/lib/api';

type Role = 'ADMIN' | 'CONTENT';

type Account = {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountFormValues = {
  name: string;
  username: string;
  email: string;
  role: Role;
  isActive: boolean;
  password?: string;
};

function requestMessage(error: any, fallback: string) {
  const value = error?.response?.data?.message;
  return Array.isArray(value) ? value.join('. ') : value || fallback;
}

export default function SettingsPage() {
  const router = useRouter();
  const { message } = AntApp.useApp();
  const [passwordForm] = Form.useForm();
  const [accountForm] = Form.useForm<AccountFormValues>();
  const { data: profile, isLoading: profileLoading, mutate: mutateProfile } = useSWR<Account>('/auth/profile', fetcher);
  const isAdmin = profile?.role === 'ADMIN';
  const {
    data: users = [],
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR<Account[]>(isAdmin ? '/users' : null, fetcher);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const changePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setChangingPassword(true);
    try {
      const response = await api.patch<{ message: string }>('/auth/change-password', values);
      passwordForm.resetFields();
      message.success(response.data.message);
      clearAuthToken();
      window.setTimeout(() => router.replace('/cms/login'), 700);
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể đổi mật khẩu.'));
    } finally {
      setChangingPassword(false);
    }
  };

  const openCreateAccount = () => {
    setEditingAccount(null);
    accountForm.resetFields();
    accountForm.setFieldsValue({ role: 'CONTENT', isActive: true });
    setAccountModalOpen(true);
  };

  const openEditAccount = (account: Account) => {
    setEditingAccount(account);
    accountForm.setFieldsValue({
      name: account.name,
      username: account.username || '',
      email: account.email,
      role: account.role,
      isActive: account.isActive,
      password: undefined,
    });
    setAccountModalOpen(true);
  };

  const saveAccount = async () => {
    let values: AccountFormValues;
    try {
      values = await accountForm.validateFields();
    } catch {
      return;
    }

    setSavingAccount(true);
    try {
      const payload = {
        ...values,
        password: values.password?.trim() || undefined,
      };
      if (editingAccount) {
        await api.patch(`/users/${editingAccount.id}`, payload);
        message.success('Đã cập nhật tài khoản');
      } else {
        await api.post('/users', payload);
        message.success('Đã tạo tài khoản');
      }
      setAccountModalOpen(false);
      accountForm.resetFields();
      await Promise.all([mutateUsers(), mutateProfile()]);
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể lưu tài khoản.'));
    } finally {
      setSavingAccount(false);
    }
  };

  const removeAccount = async (account: Account) => {
    try {
      await api.delete(`/users/${account.id}`);
      message.success('Đã xóa tài khoản');
      await mutateUsers();
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể xóa tài khoản.'));
    }
  };

  const updateAccountStatus = async (account: Account, isActive: boolean) => {
    if (account.id === profile?.id) return;
    setUpdatingStatusId(account.id);
    try {
      await api.patch(`/users/${account.id}`, { isActive });
      message.success(isActive ? 'Đã kích hoạt tài khoản' : 'Đã vô hiệu hóa tài khoản');
      await mutateUsers();
    } catch (error: any) {
      message.error(requestMessage(error, 'Không thể cập nhật trạng thái tài khoản.'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const columns: ColumnsType<Account> = [
    {
      title: 'Tài khoản',
      key: 'account',
      render: (_, account) => (
        <Space size={12} className={account.isActive ? '' : 'opacity-60'}>
          <Avatar icon={<UserRound className="h-4 w-4" />} className="bg-sblue-500/15 text-sblue-300" />
          <div>
            <Typography.Text strong className="block">{account.name}</Typography.Text>
            <Typography.Text type="secondary" className="text-xs">@{account.username || 'chưa-có-username'}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      responsive: ['md'],
    },
    {
      title: 'Quyền',
      dataIndex: 'role',
      width: 160,
      render: (role: Role) => role === 'ADMIN'
        ? <Tag color="blue" icon={<ShieldCheck className="h-3 w-3" />}>Admin</Tag>
        : <Tag color="cyan" icon={<Pencil className="h-3 w-3" />}>Content</Tag>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 180,
      render: (_, account) => (
        <Space size={8}>
          <Popconfirm
            title="Vô hiệu hóa tài khoản?"
            description={`${account.name} sẽ bị đăng xuất và không thể truy cập CMS.`}
            okText="Vô hiệu hóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={!account.isActive || account.id === profile?.id}
            onConfirm={() => updateAccountStatus(account, false)}
          >
            <Switch
              size="small"
              checked={account.isActive}
              loading={updatingStatusId === account.id}
              disabled={account.id === profile?.id}
              aria-label={`${account.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'} tài khoản ${account.name}`}
              onChange={(checked) => {
                if (checked) updateAccountStatus(account, true);
              }}
            />
          </Popconfirm>
          <Tag color={account.isActive ? 'success' : 'default'}>
            {account.isActive ? 'Active' : 'Inactive'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 150,
      responsive: ['lg'],
      render: (value: string) => new Intl.DateTimeFormat('vi-VN').format(new Date(value)),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      align: 'right',
      width: 120,
      render: (_, account) => (
        <Space>
          <Button
            type="text"
            aria-label={`Sửa tài khoản ${account.name}`}
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openEditAccount(account)}
          />
          <Popconfirm
            title="Xóa tài khoản?"
            description={account.id === profile?.id ? 'Không thể xóa tài khoản đang đăng nhập.' : `Tài khoản ${account.name} sẽ bị xóa vĩnh viễn.`}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            disabled={account.id === profile?.id}
            onConfirm={() => removeAccount(account)}
          >
            <Button
              danger
              type="text"
              disabled={account.id === profile?.id}
              aria-label={`Xóa tài khoản ${account.name}`}
              icon={<Trash2 className="h-4 w-4" />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const personalTab = (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card loading={profileLoading} className="border-sdark-700 bg-sdark-900">
        <Space direction="vertical" size={20} className="w-full">
          <Space size={14}>
            <Avatar size={56} icon={<UserRound className="h-6 w-6" />} className="bg-sblue-500/15 text-sblue-300" />
            <div>
              <Typography.Title level={4} className="!mb-1">{profile?.name || 'Tài khoản'}</Typography.Title>
              <Space size={6} wrap>
                <Tag color={isAdmin ? 'blue' : 'cyan'}>{isAdmin ? 'ADMIN' : 'CONTENT'}</Tag>
                <Tag color="success">ACTIVE</Tag>
              </Space>
            </div>
          </Space>
          <Descriptions column={1} size="small" colon={false}>
            <Descriptions.Item label="Username">@{profile?.username || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{profile?.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Quyền hạn">{isAdmin ? 'Quản trị viên' : 'Biên tập nội dung'}</Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>

      <Card
        className="border-sdark-700 bg-sdark-900"
        title={<Space><KeyRound className="h-5 w-5 text-sblue-400" />Đổi mật khẩu</Space>}
      >
        <Alert
          type="info"
          showIcon
          className="mb-5"
          message="Sau khi đổi mật khẩu, bạn sẽ được đăng xuất khỏi các phiên đăng nhập cũ."
        />
        <Form form={passwordForm} layout="vertical" onFinish={changePassword} requiredMark={false}>
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}
          >
            <Input.Password autoComplete="current-password" placeholder="Nhập mật khẩu hiện tại" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Nhập mật khẩu mới' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Tối thiểu 8 ký tự" />
          </Form.Item>
          <Form.Item
            name="confirmation"
            label="Xác nhận mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Nhập lại mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  return !value || getFieldValue('newPassword') === value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu xác nhận không khớp'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={changingPassword} icon={<KeyRound className="h-4 w-4" />}>
            Đổi mật khẩu
          </Button>
        </Form>
      </Card>
    </div>
  );

  const accountsTab = (
    <div className="space-y-5">
      <Alert
        type="info"
        showIcon
        message="Phân quyền tài khoản"
        description="Admin có toàn quyền quản lý tài khoản. Tài khoản Inactive sẽ bị đăng xuất khỏi phiên cũ và không thể đăng nhập cho đến khi được kích hoạt lại."
      />
      <Card
        className="border-sdark-700 bg-sdark-900"
        title={<Space><Users className="h-5 w-5 text-sblue-400" />Danh sách tài khoản</Space>}
        extra={<Button type="primary" icon={<Plus className="h-4 w-4" />} onClick={openCreateAccount}>Thêm tài khoản</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table<Account>
          rowKey="id"
          columns={columns}
          dataSource={users}
          loading={usersLoading}
          pagination={false}
          scroll={{ x: 940 }}
        />
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Cài đặt"
        description="Quản lý bảo mật, thông tin đăng nhập và quyền truy cập CMS."
        icon={<Settings className="h-6 w-6" />}
      />

      <Tabs
        defaultActiveKey="personal"
        items={[
          { key: 'personal', label: <Space><KeyRound className="h-4 w-4" />Tài khoản của tôi</Space>, children: personalTab },
          ...(isAdmin
            ? [{ key: 'accounts', label: <Space><Users className="h-4 w-4" />Quản lý tài khoản</Space>, children: accountsTab }]
            : []),
        ]}
      />

      <Modal
        open={accountModalOpen}
        title={editingAccount ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản'}
        okText={editingAccount ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        cancelText="Hủy"
        confirmLoading={savingAccount}
        onOk={saveAccount}
        onCancel={() => {
          setAccountModalOpen(false);
          accountForm.resetFields();
        }}
        forceRender
      >
        <Form form={accountForm} layout="vertical" requiredMark={false} className="pt-3">
          <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Nhập tên hiển thị' }, { min: 2, message: 'Tên phải có ít nhất 2 ký tự' }]}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
          <div className="grid gap-x-4 md:grid-cols-2">
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Nhập username' },
                { min: 3, message: 'Username phải có ít nhất 3 ký tự' },
                { pattern: /^[a-zA-Z0-9._-]+$/, message: 'Chỉ dùng chữ, số, dấu chấm, gạch dưới hoặc gạch ngang' },
              ]}
            >
              <Input prefix="@" autoComplete="off" placeholder="username" />
            </Form.Item>
            <Form.Item name="role" label="Quyền" rules={[{ required: true, message: 'Chọn quyền' }]}>
              <Select
                disabled={editingAccount?.id === profile?.id}
                options={[
                  { value: 'ADMIN', label: 'Admin · Toàn quyền' },
                  { value: 'CONTENT', label: 'Content · Quản lý nội dung' },
                ]}
              />
            </Form.Item>
          </div>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
            <Input type="email" autoComplete="off" placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            name="isActive"
            label="Trạng thái tài khoản"
            valuePropName="checked"
            extra={editingAccount?.id === profile?.id ? 'Không thể tự vô hiệu hóa tài khoản đang đăng nhập.' : 'Tài khoản Inactive không thể đăng nhập hoặc tiếp tục sử dụng phiên cũ.'}
          >
            <Switch
              checkedChildren="Active"
              unCheckedChildren="Inactive"
              disabled={editingAccount?.id === profile?.id}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label={editingAccount ? 'Đặt mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}
            rules={[
              { required: !editingAccount, message: 'Nhập mật khẩu' },
              { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự' },
            ]}
          >
            <Input.Password autoComplete="new-password" placeholder={editingAccount ? 'Để trống nếu không đổi' : 'Tối thiểu 8 ký tự'} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
