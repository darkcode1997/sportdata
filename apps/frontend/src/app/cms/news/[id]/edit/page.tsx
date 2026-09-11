'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { Newspaper } from 'lucide-react';
import { ArticleForm } from '@/components/cms/ArticleForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { ErrorMessage } from '@/components/cms/AthleteForm';
import { fetcher } from '@/lib/api';

export default function EditArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR(id ? `/articles/admin/${id}` : null, fetcher);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CmsPageHeader
        backHref="/cms/news"
        title="Chỉnh sửa bài viết"
        description="Cập nhật nội dung và trạng thái xuất bản."
        icon={<Newspaper className="h-6 w-6" />}
      />
      {error
        ? <ErrorMessage message="Không thể tải bài viết." />
        : isLoading
          ? <Skeleton active paragraph={{ rows: 10 }} />
          : <ArticleForm articleId={id} initialData={data} />}
    </div>
  );
}
