'use client';

import useSWR from 'swr';
import { Avatar, Card, Descriptions, Space, Tag, Typography } from 'antd';
import { ShieldCheck, UserRound } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { CMS_ROLE_INFO, isCmsRole } from '@/lib/cms-access';
import { fetcher } from '@/lib/api';

type Profile = {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function MyAccountPage() {
  const { data: profile, isLoading } = useSWR<Profile>('/auth/profile', fetcher);
  const roleLabel = profile && isCmsRole(profile.role)
    ? CMS_ROLE_INFO[profile.role].label
    : profile?.role || 'Người dùng';

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Tài khoản của tôi"
        description="Thông tin đăng nhập và quyền truy cập CMS của bạn."
        icon={<UserRound className="h-6 w-6" />}
      />

      <Card loading={isLoading} className="max-w-3xl">
        <Space direction="vertical" size={28} className="w-full">
          <Space size={16} align="center" wrap>
            <Avatar
              size={68}
              icon={<UserRound className="h-7 w-7" />}
              className="bg-sblue-500/15 text-sblue-400"
            />
            <div>
              <Typography.Title level={3} className="!mb-2">
                {profile?.name || 'Tài khoản CMS'}
              </Typography.Title>
              <Space size={8} wrap>
                <Tag color="blue" icon={<ShieldCheck className="h-3 w-3" />}>{roleLabel}</Tag>
                <Tag color={profile?.isActive === false ? 'default' : 'success'}>
                  {profile?.isActive === false ? 'Đã vô hiệu hóa' : 'Đang hoạt động'}
                </Tag>
              </Space>
            </div>
          </Space>

          <Descriptions bordered column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Họ và tên">{profile?.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Tên đăng nhập">@{profile?.username || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{profile?.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Quyền hạn">{roleLabel}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {profile?.createdAt ? new Intl.DateTimeFormat('vi-VN').format(new Date(profile.createdAt)) : '—'}
            </Descriptions.Item>
          </Descriptions>
        </Space>
      </Card>
    </div>
  );
}
