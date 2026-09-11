'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Flex,
  Input,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  type TableProps,
} from 'antd';
import { ExternalLink, FileText, Pencil, Search, Trash2 } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { api, fetcher } from '@/lib/api';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default function NewsManagementPage() {
  const { data: currentUser } = useSWR<any>('/auth/profile', fetcher);
  const canDelete = currentUser?.role === 'ADMIN';
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [page, setPage] = useState(1);
  const [requestError, setRequestError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search.trim()) params.set('search', search.trim());
    if (status !== 'all') params.set('isPublished', String(status === 'published'));
    return `/articles/admin/list?${params}`;
  }, [page, search, status]);

  const { data, error, isLoading, mutate } = useSWR<any>(query, fetcher);
  const articles = data?.items || [];

  const updatePublished = async (article: any, isPublished: boolean) => {
    setRequestError(null);
    try {
      await api.patch(`/articles/${article.id}`, { isPublished });
      await mutate();
    } catch (updateError: any) {
      setRequestError(updateError.response?.data?.message || 'Không thể cập nhật trạng thái bài viết.');
    }
  };

  const remove = async (id: string) => {
    setRequestError(null);
    try {
      await api.delete(`/articles/${id}`);
      await mutate();
    } catch (deleteError: any) {
      setRequestError(deleteError.response?.data?.message || 'Không thể xóa bài viết.');
    }
  };

  const columns: TableProps<any>['columns'] = [
    {
      title: 'Bài viết',
      key: 'article',
      width: 420,
      render: (_, article) => (
        <Flex align="center" gap={12}>
          <Avatar
            shape="square"
            size={48}
            src={article.coverImageUrl || undefined}
            icon={<FileText className="h-5 w-5" />}
            className="shrink-0 bg-sblue-500/15 text-sblue-400 [&_img]:object-cover"
          />
          <div className="min-w-0">
            <Typography.Text strong className="block max-w-[330px] truncate">{article.title}</Typography.Text>
            <Typography.Text type="secondary" className="block max-w-[330px] truncate text-xs">
              {article.excerpt || `/${article.slug}`}
            </Typography.Text>
          </div>
        </Flex>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 170,
      render: (_, article) => (
        <Space size={8}>
          <Switch size="small" checked={article.isPublished} onChange={(checked) => updatePublished(article, checked)} />
          <Tag color={article.isPublished ? 'success' : 'default'}>
            {article.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Cập nhật',
      dataIndex: 'updatedAt',
      width: 180,
      render: (value) => <Typography.Text type="secondary">{dateFormat.format(new Date(value))}</Typography.Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      fixed: 'right',
      align: 'right',
      render: (_, article) => (
        <Space size={4}>
          {article.isPublished && (
            <Tooltip title="Xem bài viết">
              <Button type="text" href={`/news/${article.slug}`} target="_blank" icon={<ExternalLink className="h-4 w-4" />} aria-label="Xem bài viết" />
            </Tooltip>
          )}
          <Tooltip title="Chỉnh sửa">
            <Button type="text" href={`/cms/news/${article.id}/edit`} icon={<Pencil className="h-4 w-4" />} aria-label="Chỉnh sửa" />
          </Tooltip>
          {canDelete && (
            <Popconfirm
              title={`Xóa “${article.title}”?`}
              description="Bài viết sẽ bị xóa vĩnh viễn."
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              onConfirm={() => remove(article.id)}
            >
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
        title="Quản lý tin tức"
        description="Soạn thảo, xem trước và xuất bản nội dung trên trang người dùng."
        actionHref="/cms/news/new"
        actionLabel="Soạn bài viết"
      />

      {(error || requestError) && (
        <Alert type="error" showIcon message={requestError || 'Không thể tải danh sách bài viết.'} />
      )}

      <Card className="cms-toolbar" styles={{ body: { padding: 16 } }}>
        <Flex gap={12} wrap>
          <Input
            allowClear
            size="large"
            className="min-w-64 flex-1"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm theo tiêu đề hoặc mô tả..."
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
              { value: 'all', label: 'Mọi trạng thái' },
              { value: 'published', label: 'Đã xuất bản' },
              { value: 'draft', label: 'Bản nháp' },
            ]}
          />
        </Flex>
      </Card>

      <Card className="cms-table" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={articles}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Chưa có bài viết.' }}
        />
        <Flex justify="flex-end" className="border-t border-sdark-800 p-4">
          <Pagination
            current={page}
            total={data?.total || 0}
            pageSize={10}
            showSizeChanger={false}
            onChange={setPage}
          />
        </Flex>
      </Card>
    </div>
  );
}
