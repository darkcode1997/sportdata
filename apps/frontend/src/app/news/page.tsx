'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, Empty, Input, Pagination, Skeleton } from 'antd';
import { ArrowRight, CalendarDays, Newspaper, Search } from 'lucide-react';
import { fetcher } from '@/lib/api';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '9' });
    if (search.trim()) params.set('search', search.trim());
    return `/articles?${params}`;
  }, [page, search]);
  const { data, isLoading } = useSWR<any>(query, fetcher);
  const articles = data?.items || [];

  return (
    <main className="news-page min-h-screen pb-20">
      <section className="news-hero border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <span className="news-eyebrow"><Newspaper className="h-4 w-4" /> Tin tức SportData</span>
            <h1>Tin tức và câu chuyện thể thao</h1>
            <p>Cập nhật giải đấu, vận động viên và những câu chuyện đáng chú ý từ cộng đồng thể thao.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <Card className="public-surface news-search-card" styles={{ body: { padding: 14 } }}>
          <Input
            allowClear
            size="large"
            prefix={<Search className="h-4 w-4 text-slate-500" />}
            placeholder="Tìm bài viết..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </Card>

        {isLoading ? (
          <div className="news-grid mt-8">
            {Array.from({ length: 6 }).map((_, index) => <Card className="public-surface h-80" key={index}><Skeleton active paragraph={{ rows: 4 }} /></Card>)}
          </div>
        ) : articles.length ? (
          <div className="news-grid mt-8">
            {articles.map((article: any) => <ArticleCard article={article} key={article.id} />)}
          </div>
        ) : (
          <Card className="public-surface mt-8">
            <Empty image={<Newspaper className="mx-auto h-12 w-12 text-slate-500" />} description="Chưa có bài viết phù hợp." />
          </Card>
        )}

        {(data?.total || 0) > 9 && (
          <div className="mt-10 flex justify-center">
            <Pagination current={page} total={data.total} pageSize={9} showSizeChanger={false} onChange={setPage} />
          </div>
        )}
      </div>
    </main>
  );
}

function ArticleCard({ article }: { article: any }) {
  return (
    <Link href={`/news/${article.slug}`} className="group block h-full">
      <Card hoverable className="news-card public-surface h-full" styles={{ body: { padding: 0 } }}>
        <div className="news-card-cover">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={article.coverImageUrl} alt="" />
          ) : (
            <Newspaper className="h-10 w-10" />
          )}
        </div>
        <div className="news-card-body">
          <span className="news-card-date"><CalendarDays className="h-3.5 w-3.5" />{dateFormat.format(new Date(article.publishedAt || article.createdAt))}</span>
          <h2>{article.title}</h2>
          <p>{article.excerpt || 'Đọc nội dung bài viết và các thông tin mới nhất từ SportData.'}</p>
          <span className="news-card-action">Đọc bài viết <ArrowRight className="h-4 w-4" /></span>
        </div>
      </Card>
    </Link>
  );
}
