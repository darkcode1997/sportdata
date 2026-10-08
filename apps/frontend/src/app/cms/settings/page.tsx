'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Card, Divider, Skeleton, Space, Switch, Tag, Typography } from 'antd';
import {
  BadgeDollarSign,
  CreditCard,
  FileScan,
  Landmark,
  MailCheck,
  Settings,
  Smartphone,
} from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { IntegrationSettings } from '@/components/cms/IntegrationSettings';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { api, fetcher } from '@/lib/api';

type SettingKey =
  | 'identityOcrEnabled'
  | 'paymentsEnabled'
  | 'momoEnabled'
  | 'vnpayEnabled'
  | 'bankQrEnabled'
  | 'ticketEmailEnabled';

type SystemSettings = {
  values: Record<SettingKey, boolean>;
  configured: Record<SettingKey, boolean>;
  effective: Record<SettingKey, boolean>;
  environment: 'sandbox' | 'production';
  updatedAt: string | null;
};

type SettingCardProps = {
  settingKey: SettingKey;
  title: string;
  code: string;
  description: string;
  icon: React.ReactNode;
  settings: SystemSettings;
  saving: boolean;
  disabled?: boolean;
  onChange: (key: SettingKey, value: boolean) => void;
};

function SettingCard({
  settingKey,
  title,
  code,
  description,
  icon,
  settings,
  saving,
  disabled,
  onChange,
}: SettingCardProps) {
  const desired = settings.values[settingKey];
  const configured = settings.configured[settingKey];
  const effective = settings.effective[settingKey];
  const status = effective
    ? { color: 'success', label: 'Đang hoạt động' }
    : desired && !configured
      ? { color: 'warning', label: 'Thiếu cấu hình ENV' }
      : { color: 'default', label: 'Đang tắt' };

  return (
    <Card className="h-full" styles={{ body: { height: '100%' } }}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <Space align="start" size={12}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sblue-500/10 text-sblue-500">
              {icon}
            </span>
            <div>
              <Typography.Title level={5} className="!mb-1">{title}</Typography.Title>
              <Typography.Text code className="text-xs">{code}</Typography.Text>
            </div>
          </Space>
          <Switch
            checked={desired}
            loading={saving}
            disabled={disabled}
            aria-label={`${desired ? 'Tắt' : 'Bật'} ${title}`}
            onChange={(checked) => onChange(settingKey, checked)}
          />
        </div>
        <Typography.Paragraph type="secondary" className="!mb-0 flex-1 text-sm">
          {description}
        </Typography.Paragraph>
        <div>
          <Tag color={status.color}>{status.label}</Tag>
          {desired && !configured ? (
            <Typography.Text type="secondary" className="text-xs">
              Công tắc đã bật; tính năng sẽ chạy sau khi bổ sung thông tin bí mật vào môi trường.
            </Typography.Text>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

export default function SystemSettingsPage() {
  const toast = useSportDataToast();
  const { data: settings, isLoading, mutate } = useSWR<SystemSettings>('/system-settings', fetcher);
  const [savingKey, setSavingKey] = useState<SettingKey | null>(null);

  const changeSetting = async (key: SettingKey, value: boolean) => {
    if (!settings) return;
    setSavingKey(key);
    const optimistic: SystemSettings = {
      ...settings,
      values: { ...settings.values, [key]: value },
      effective: {
        ...settings.effective,
        [key]: value && settings.configured[key],
      },
    };
    try {
      await mutate(
        api.patch<SystemSettings>('/system-settings', { [key]: value }).then((response) => response.data),
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
      toast.success(`Đã ${value ? 'bật' : 'tắt'} cấu hình ${key}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể cập nhật cài đặt hệ thống.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Cài đặt hệ thống"
        description="Bật hoặc tắt các tích hợp dùng chung cho toàn bộ nền tảng."
        icon={<Settings className="h-6 w-6" />}
      />

      <Alert
        type="info"
        showIcon
        message="Quản lý cấu hình và trạng thái dịch vụ"
        description="Bạn có thể cấu hình SMTP, OCR và thanh toán bên dưới. Các giá trị trong ENV được dùng khi chưa có cấu hình tương ứng trong CMS."
      />

      <IntegrationSettings onSaved={() => { void mutate(); }} />
      {isLoading || !settings ? (
        <Card><Skeleton active paragraph={{ rows: 8 }} /></Card>
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <Typography.Title level={4} className="!mb-1">Xác minh & thông báo</Typography.Title>
              <Typography.Text type="secondary">Dịch vụ xử lý hồ sơ vận động viên và gửi vé.</Typography.Text>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <SettingCard
                settingKey="identityOcrEnabled"
                title="OCR CCCD / Hộ chiếu"
                code="IDENTITY_OCR_ENABLED"
                description="Tự động đọc thông tin giấy tờ bằng FPT.AI. Khi tắt, CCCD/Hộ chiếu được tự động xác thực để hồ sơ tiếp tục chạy; khi bật nhưng thiếu API key, hệ thống giữ trạng thái chờ để CMS kiểm tra."
                icon={<FileScan className="h-5 w-5" />}
                settings={settings}
                saving={savingKey === 'identityOcrEnabled'}
                onChange={changeSetting}
              />
              <SettingCard
                settingKey="ticketEmailEnabled"
                title="Gửi vé A6 qua email"
                code="TICKET_EMAIL_ENABLED"
                description="Gửi PDF vé cho người đăng ký sau khi hồ sơ được tiếp nhận. Cần cấu hình máy chủ SMTP để hoạt động."
                icon={<MailCheck className="h-5 w-5" />}
                settings={settings}
                saving={savingKey === 'ticketEmailEnabled'}
                onChange={changeSetting}
              />
            </div>
          </section>

          <Divider />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Typography.Title level={4} className="!mb-1">Thanh toán</Typography.Title>
                <Typography.Text type="secondary">
                  Môi trường hiện tại: {settings.environment === 'production' ? 'Production' : 'Sandbox / phát triển'}
                </Typography.Text>
              </div>
              <Space>
                <BadgeDollarSign className="h-5 w-5 text-emerald-500" />
                <Typography.Text strong>Cho phép thanh toán toàn hệ thống</Typography.Text>
                <Switch
                  checked={settings.values.paymentsEnabled}
                  loading={savingKey === 'paymentsEnabled'}
                  onChange={(checked) => changeSetting('paymentsEnabled', checked)}
                />
              </Space>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <SettingCard
                settingKey="momoEnabled"
                title="Ví MoMo"
                code="MOMO_ENABLED"
                description="Thanh toán qua ví MoMo. Cần Partner Code, Access Key và Secret Key trong môi trường."
                icon={<Smartphone className="h-5 w-5" />}
                settings={settings}
                saving={savingKey === 'momoEnabled'}
                disabled={!settings.values.paymentsEnabled}
                onChange={changeSetting}
              />
              <SettingCard
                settingKey="vnpayEnabled"
                title="VNPAY & thẻ quốc tế"
                code="VNPAY_ENABLED"
                description="Dùng chung kết nối VNPAY cho QR nội địa và Visa/Mastercard. Cần TMN Code và Hash Secret."
                icon={<CreditCard className="h-5 w-5" />}
                settings={settings}
                saving={savingKey === 'vnpayEnabled'}
                disabled={!settings.values.paymentsEnabled}
                onChange={changeSetting}
              />
              <SettingCard
                settingKey="bankQrEnabled"
                title="Chuyển khoản VietQR"
                code="BANK_QR_ENABLED"
                description="Tạo QR chuyển khoản từ tài khoản ngân hàng được cấu hình riêng trong từng sự kiện."
                icon={<Landmark className="h-5 w-5" />}
                settings={settings}
                saving={savingKey === 'bankQrEnabled'}
                disabled={!settings.values.paymentsEnabled}
                onChange={changeSetting}
              />
            </div>
          </section>

          {settings.updatedAt ? (
            <Typography.Text type="secondary" className="block text-right text-xs">
              Cập nhật lần cuối: {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(settings.updatedAt))}
            </Typography.Text>
          ) : null}
        </>
      )}
    </div>
  );
}
