'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  type TableProps,
  type UploadFile,
} from 'antd';
import {
  ExternalLink,
  Images,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type Banner = {
  id: string;
  title?: string | null;
  altText: string;
  linkUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string;
  imageMimeType: string;
  imageSize: number;
  createdAt: string;
  updatedAt: string;
};

type BannerFormValues = {
  title?: string;
  altText: string;
  linkUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function BannerManagementPage() {
  const { data, error, isLoading, mutate } = useSWR<{ items: Banner[] }>('/banners/admin/list', fetcher);
  const banners = useMemo(() => data?.items || [], [data?.items]);
  const [form] = Form.useForm<BannerFormValues>();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const toast = useSportDataToast();

  useEffect(() => {
    if (error) toast.error('Không thể tải danh sách banner.');
  }, [error, toast]);

  const nextSortOrder = useMemo(
    () => banners.reduce((highest, banner) => Math.max(highest, banner.sortOrder), -1) + 1,
    [banners],
  );

  const openCreate = () => {
    setEditing(null);
    setFileList([]);
    form.setFieldsValue({
      title: '',
      altText: '',
      linkUrl: '',
      sortOrder: nextSortOrder,
      isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditing(banner);
    setFileList([]);
    form.setFieldsValue({
      title: banner.title || '',
      altText: banner.altText,
      linkUrl: banner.linkUrl || '',
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setFileList([]);
    form.resetFields();
  };

  const validateUpload = (file: File) => {
    if (!acceptedTypes.includes(file.type)) {
      toast.error('Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc AVIF.');
      return Upload.LIST_IGNORE;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Ảnh banner không được vượt quá 4 MB.');
      return Upload.LIST_IGNORE;
    }
    setFileList([file as unknown as UploadFile]);
    return false;
  };

  const save = async (values: BannerFormValues) => {
    const image = fileList[0]?.originFileObj || fileList[0];
    if (!editing && !image) {
      toast.error('Vui lòng chọn ảnh banner.');
      return;
    }

    setSaving(true);
    const payload = new FormData();
    if (image instanceof File) payload.append('image', image);
    payload.append('title', values.title?.trim() || '');
    payload.append('altText', values.altText.trim());
    payload.append('linkUrl', values.linkUrl?.trim() || '');
    payload.append('sortOrder', String(values.sortOrder ?? 0));
    payload.append('isActive', String(values.isActive));

    try {
      if (editing) {
        await api.patch(`/banners/${editing.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/banners', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      await mutate();
      toast.success(editing ? 'Đã cập nhật banner.' : 'Đã thêm banner mới.');
      setModalOpen(false);
      setEditing(null);
      setFileList([]);
      form.resetFields();
    } catch (saveError: any) {
      const responseMessage = saveError.response?.data?.message;
      toast.error(Array.isArray(responseMessage) ? responseMessage.join(', ') : responseMessage || 'Không thể lưu banner.');
    } finally {
      setSaving(false);
    }
  };

  const updateActive = async (banner: Banner, isActive: boolean) => {
    try {
      await api.patch(`/banners/${banner.id}`, { isActive });
      await mutate();
      toast.success(isActive ? 'Đã bật banner.' : 'Đã ẩn banner.');
    } catch (updateError: any) {
      toast.error(updateError.response?.data?.message || 'Không thể cập nhật trạng thái banner.');
    }
  };

  const remove = async (banner: Banner) => {
    try {
      await api.delete(`/banners/${banner.id}`);
      await mutate();
      toast.success('Đã xóa banner.');
    } catch (deleteError: any) {
      toast.error(deleteError.response?.data?.message || 'Không thể xóa banner.');
    }
  };

  const columns: TableProps<Banner>['columns'] = [
    {
      title: 'Banner',
      key: 'banner',
      width: 430,
      render: (_, banner) => (
        <Flex align="center" gap={14}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={banner.imageUrl}
            alt=""
            className="h-16 w-28 shrink-0 rounded-lg border border-white/10 object-cover"
          />
          <div className="min-w-0">
            <Typography.Text strong className="block max-w-[270px] truncate">
              {banner.title || banner.altText}
            </Typography.Text>
            <Typography.Text type="secondary" className="block max-w-[270px] truncate text-xs">
              {banner.altText}
            </Typography.Text>
            <Typography.Text type="secondary" className="text-[11px]">
              {(banner.imageSize / 1024).toFixed(0)} KB · {banner.imageMimeType.replace('image/', '').toUpperCase()}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Thứ tự',
      dataIndex: 'sortOrder',
      width: 90,
      align: 'center',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Hiển thị',
      key: 'isActive',
      width: 170,
      render: (_, banner) => (
        <Space size={8}>
          <Switch size="small" checked={banner.isActive} onChange={(checked) => updateActive(banner, checked)} />
          <Tag color={banner.isActive ? 'success' : 'default'}>
            {banner.isActive ? 'Đang hiển thị' : 'Đang ẩn'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Liên kết',
      dataIndex: 'linkUrl',
      width: 220,
      render: (value?: string) => value
        ? <Typography.Text type="secondary" className="block max-w-48 truncate">{value}</Typography.Text>
        : <Typography.Text type="secondary">—</Typography.Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      align: 'right',
      render: (_, banner) => (
        <Space size={4}>
          <Tooltip title="Xem ảnh">
            <Button type="text" href={banner.imageUrl} target="_blank" icon={<ExternalLink className="h-4 w-4" />} aria-label="Xem ảnh banner" />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button type="text" icon={<Pencil className="h-4 w-4" />} aria-label="Chỉnh sửa banner" onClick={() => openEdit(banner)} />
          </Tooltip>
          <Popconfirm
            title="Xóa banner này?"
            description="Ảnh và toàn bộ cấu hình banner sẽ bị xóa vĩnh viễn."
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(banner)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<Trash2 className="h-4 w-4" />} aria-label="Xóa banner" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CmsPageHeader
        title="Banner trang chủ"
        description="Tải ảnh lên, sắp xếp và quản lý slider hiển thị ở đầu trang chủ."
        icon={<Images className="h-6 w-6" />}
        action={(
          <Button type="primary" size="large" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Thêm banner
          </Button>
        )}
      />

      <Alert
        type="info"
        showIcon
        message="Ảnh đề xuất: 1920 × 720 px hoặc cùng tỷ lệ, dung lượng tối đa 4 MB."
        description="Banner có thứ tự nhỏ hơn sẽ xuất hiện trước. Chỉ banner đang bật mới hiển thị ngoài trang chủ."
      />

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Table<Banner>
          rowKey="id"
          columns={columns}
          dataSource={banners}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1050 }}
          locale={{ emptyText: 'Chưa có banner. Hãy tải ảnh đầu tiên lên.' }}
        />
      </Card>

      <Modal
        title={editing ? 'Chỉnh sửa banner' : 'Thêm banner mới'}
        open={modalOpen}
        onCancel={closeModal}
        footer={null}
        destroyOnHidden
        width={680}
      >
        <Form<BannerFormValues>
          form={form}
          layout="vertical"
          className="mt-5"
          onFinish={save}
        >
          {editing && (
            <div className="mb-5 overflow-hidden rounded-xl border border-white/10 bg-slate-950/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={editing.imageUrl} alt={editing.altText} className="aspect-[8/3] w-full object-cover" />
            </div>
          )}

          <Form.Item label={editing ? 'Thay ảnh (không bắt buộc)' : 'Ảnh banner'} required={!editing}>
            <Upload.Dragger
              accept={acceptedTypes.join(',')}
              beforeUpload={validateUpload}
              fileList={fileList}
              maxCount={1}
              onRemove={() => {
                setFileList([]);
                return true;
              }}
            >
              <UploadCloud className="mx-auto mb-3 h-9 w-9 text-sblue-400" />
              <p className="font-semibold">Kéo thả ảnh vào đây hoặc bấm để chọn</p>
              <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP, AVIF · tối đa 4 MB</p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item label="Tên quản trị" name="title" rules={[{ max: 160 }]}>
            <Input placeholder="Ví dụ: Banner giải vô địch quốc gia" />
          </Form.Item>

          <Form.Item
            label="Mô tả ảnh"
            name="altText"
            rules={[
              { required: true, message: 'Vui lòng nhập mô tả ảnh.' },
              { min: 2, max: 250 },
            ]}
          >
            <Input placeholder="Mô tả ngắn nội dung trong ảnh" />
          </Form.Item>

          <Form.Item
            label="Liên kết khi bấm vào banner"
            name="linkUrl"
            rules={[{
              validator: (_, value) => !value || /^(https?:\/\/|\/)/.test(value)
                ? Promise.resolve()
                : Promise.reject(new Error('Nhập URL đầy đủ hoặc đường dẫn bắt đầu bằng /.')),
            }]}
          >
            <Input placeholder="/events hoặc https://example.com" />
          </Form.Item>

          <Flex gap={20} wrap>
            <Form.Item label="Thứ tự hiển thị" name="sortOrder" className="min-w-44" rules={[{ required: true }]}>
              <InputNumber min={0} max={9999} className="w-full" />
            </Form.Item>
            <Form.Item label="Hiển thị ngoài trang chủ" name="isActive" valuePropName="checked">
              <Switch checkedChildren="Bật" unCheckedChildren="Ẩn" />
            </Form.Item>
          </Flex>

          <Flex justify="flex-end" gap={10}>
            <Button onClick={closeModal} disabled={saving}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              {editing ? 'Lưu thay đổi' : 'Thêm banner'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </div>
  );
}
