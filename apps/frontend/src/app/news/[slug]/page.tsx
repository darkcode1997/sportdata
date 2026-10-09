'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { imageUrl } from '@/lib/image-url';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { ArrowLeft, CalendarDays, Newspaper } from 'lucide-react';
import { RichTextContent } from '@/components/RichTextContent';
import { fetcher } from '@/lib/api';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export default function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, error, isLoading } = useSWR<any>(slug ? `/articles/${slug}` : null, fetcher);

  if (isLoading) {
    return <main className="news-article-page min-h-screen"><div className="mx-auto max-w-4xl px-4 py-16 sm:px-6"><Skeleton active paragraph={{ rows: 12 }} /></div></main>;
  }

  if (error || !article) {
    return (
      <main className="news-article-page min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <ToastNotice type="error" showIcon message="Không tìm thấy bài viết" action={<Link href="/news">Về trang tin tức</Link>} />
        </div>
      </main>
    );
  }

  return (
    <main className="news-article-page min-h-screen pb-20">
      <article>
        <header className="news-article-header">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:py-16">
            <Link href="/news" className="news-back-link"><ArrowLeft className="h-4 w-4" /> Tin tức</Link>
            <span className="news-article-meta"><CalendarDays className="h-4 w-4" />{dateFormat.format(new Date(article.publishedAt || article.createdAt))}</span>
            <h1>{article.title}</h1>
            {article.excerpt && <p>{article.excerpt}</p>}
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="news-article-cover" src={imageUrl(article.coverImageUrl, 'hero')} decoding="async" alt={article.title} />
          ) : (
            <div className="news-article-cover news-article-cover-placeholder"><Newspaper className="h-14 w-14" /></div>
          )}
          <RichTextContent content={article.content} className="news-article-content" />
        </div>
      </article>
    </main>
  );
}
