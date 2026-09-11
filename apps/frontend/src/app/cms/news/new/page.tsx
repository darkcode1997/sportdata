'use client';

import { FilePlus2 } from 'lucide-react';
import { ArticleForm } from '@/components/cms/ArticleForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

export default function NewArticlePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CmsPageHeader
        backHref="/cms/news"
        title="Soạn bài viết"
        description="Biên soạn nội dung, xem trước và xuất bản tin tức mới."
        icon={<FilePlus2 className="h-6 w-6" />}
      />
      <ArticleForm />
    </div>
  );
}
