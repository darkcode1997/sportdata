'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { imageUrl } from '@/lib/image-url';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Card, Empty, Input, Pagination, Skeleton } from 'antd';
import { ArrowRight, ArrowUpRight, CalendarDays, Newspaper, Search } from 'lucide-react';
import { fetcher } from '@/lib/api';

type Article = {
  id: string; slug: string; title: string; excerpt?: string;
  coverImageUrl?: string; publishedAt?: string; createdAt: string;
};
const dateFormat = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '9' });
    if (search.trim()) params.set('search', search.trim());
    return `/articles?${params}`;
  }, [page, search]);
  const { data, isLoading, error, mutate } = useSWR<{ items: Article[]; total: number }>(query, fetcher);
  const articles = data?.items || [];
  const lead = page === 1 && !search.trim() ? articles[0] : undefined;
  const remaining = lead ? articles.slice(1) : articles;

  return (
    <main className="news-page news-editorial min-h-screen pb-20">
      <section className="news-hero">
        <div className="editorial-container editorial-heading">
          <div>
            <span className="news-eyebrow"><Newspaper size={16} /> SportData Journal</span>
            <h1>Nhịp sống <span>thể thao.</span></h1>
          </div>
          <div className="editorial-heading-intro">
            <p>Tin tức giải đấu, dấu ấn vận động viên và những câu chuyện từ cộng đồng thể thao.</p>
            <a href="#news-stories">Khám phá bài viết <ArrowRight size={16} /></a>
          </div>
        </div>
      </section>
      <div className="editorial-container editorial-content" id="news-stories">
        <div className="news-editorial-toolbar">
          <div>
            <span className="editorial-kicker">Góc nhìn & cập nhật</span>
            <h2>{search.trim() ? 'Kết quả tìm kiếm' : 'Bài viết mới nhất'}</h2>
          </div>
          <div className="news-editorial-search">
            <Input allowClear size="large" aria-label="Tìm kiếm bài viết" prefix={<Search size={18} />}
              placeholder="Tìm câu chuyện bạn quan tâm..." value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
        </div>
        {error ? <ToastNotice type="error" showIcon message="Không thể tải tin tức"
          action={<Button onClick={() => void mutate()}>Thử lại</Button>} /> : isLoading ? (
          <div className="news-grid">
            {Array.from({ length: 6 }).map((_, index) => <Card className="public-surface h-80" key={index}><Skeleton active paragraph={{ rows: 4 }} /></Card>)}
          </div>
        ) : articles.length ? (
          <>
            {lead && (
              <Link href={`/news/${lead.slug}`} className="news-lead group">
                <div className="news-lead-cover">
                  {lead.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lead.coverImageUrl} alt="" />
                  ) : <Newspaper size={64} strokeWidth={1} />}
                  <span className="news-lead-badge">Mới nhất trên SportData</span>
                </div>
                <div className="news-lead-copy">
                  <span className="editorial-kicker">Câu chuyện thể thao</span>
                  <h2>{lead.title}</h2>
                  <p>{lead.excerpt || 'Khám phá câu chuyện và những cập nhật mới nhất từ SportData.'}</p>
                  <div className="news-lead-footer">
                    <ArticleDate article={lead} />
                    <span className="news-lead-arrow"><ArrowUpRight size={22} /></span>
                  </div>
                </div>
              </Link>
            )}
            {remaining.length > 0 && <div className="news-grid news-editorial-grid">
              {remaining.map((article) => <ArticleCard article={article} key={article.id} />)}
            </div>}
          </>
        ) : (
          <Card className="public-surface">
            <Empty image={<Newspaper className="mx-auto h-12 w-12 text-slate-500" />}
              description={search.trim() ? 'Không tìm thấy bài viết phù hợp. Hãy thử từ khóa khác.' : 'Các câu chuyện mới sẽ sớm được cập nhật.'}>
              {search.trim() && <Button onClick={() => { setSearch(''); setPage(1); }}>Xem tất cả bài viết</Button>}
            </Empty>
          </Card>
        )}
        {!error && !isLoading && (data?.total || 0) > 9 && (
          <div className="news-editorial-pagination">
            <span>{data?.total} bài viết</span>
            <Pagination current={page} total={data?.total} pageSize={9} showSizeChanger={false} onChange={setPage} />
          </div>
        )}
      </div>
    </main>
  );
}

function ArticleDate({ article }: { article: Article }) {
  const date = new Date(article.publishedAt || article.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return <time className="news-card-date" dateTime={date.toISOString()}><CalendarDays size={14} />{dateFormat.format(date)}</time>;
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link href={`/news/${article.slug}`} className="news-editorial-card group">
      <div className="news-card-cover">
        {article.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl(article.coverImageUrl, 'card')} alt="" loading="lazy" decoding="async" />
        ) : <Newspaper size={40} />}
      </div>
      <div className="news-card-body">
        <ArticleDate article={article} />
        <h2>{article.title}</h2>
        <p>{article.excerpt || 'Đọc nội dung bài viết và các thông tin mới nhất từ SportData.'}</p>
        <span className="news-card-action">Đọc câu chuyện <ArrowRight size={16} /></span>
      </div>
    </Link>
  );
}
