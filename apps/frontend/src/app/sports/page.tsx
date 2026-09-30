'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Alert, Button, Empty, Input, Skeleton, Tag } from 'antd';
import { ArrowRight, CalendarDays, Dumbbell, Search, Tags } from 'lucide-react';
import { fetcher } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  gender?: string;
  format?: string;
};

type Sport = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  categories?: Category[];
  _count?: { events?: number; categories?: number };
};

export default function SportsDirectoryPage() {
  const [search, setSearch] = useState('');
  const { data = [], error, isLoading, mutate } = useSWR<Sport[]>('/sports', fetcher);
  const sports = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const filteredSports = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return sports;
    return sports.filter((sport) => [sport.name, sport.code, sport.description]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(keyword));
  }, [search, sports]);

  return (
    <main className="directory-page min-h-screen pb-20">
      <div className="container-set mx-auto px-4 pt-10 sm:px-6 lg:px-8">
        <header className="directory-hero">
          <div>
            <span className="directory-eyebrow"><Dumbbell className="h-4 w-4" /> Danh mục nền tảng</span>
            <h1>Bộ môn thể thao</h1>
            <p>Khám phá các bộ môn, nội dung thi đấu và sự kiện đang được vận hành trên SportData.</p>
          </div>
          <div className="directory-hero-stat">
            <strong>{sports.length}</strong>
            <span>Bộ môn</span>
          </div>
        </header>

        <div className="directory-toolbar">
          <Input
            allowClear
            size="large"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            prefix={<Search className="h-4 w-4" />}
            placeholder="Tìm theo tên hoặc mã bộ môn"
          />
          <Link href="/events"><Button size="large" type="primary" icon={<CalendarDays className="h-4 w-4" />}>Xem tất cả sự kiện</Button></Link>
        </div>

        {error && (
          <Alert
            showIcon
            type="error"
            message="Không thể tải danh sách bộ môn"
            action={<Button onClick={() => mutate()}>Thử lại</Button>}
          />
        )}

        {isLoading ? (
          <div className="directory-grid">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton.Node key={index} active className="directory-skeleton" />)}
          </div>
        ) : filteredSports.length ? (
          <section className="directory-grid" aria-label="Danh sách bộ môn">
            {filteredSports.map((sport) => (
              <article key={sport.id} className="directory-card">
                <div className="directory-card-heading">
                  <span className="directory-card-logo">
                    {sport.logoUrl ? (
                      // Logos are managed by CMS editors and can be hosted on different domains.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sport.logoUrl} alt={`Logo ${sport.name}`} />
                    ) : <Dumbbell className="h-7 w-7" />}
                  </span>
                  <div>
                    <Tag color="blue">{sport.code}</Tag>
                    <h2>{sport.name}</h2>
                  </div>
                </div>
                <p className="directory-card-description">{sport.description || 'Bộ môn đang được cấu hình nội dung và dữ liệu sự kiện.'}</p>
                <div className="directory-card-metrics">
                  <span><CalendarDays className="h-4 w-4" /><strong>{sport._count?.events || 0}</strong> sự kiện</span>
                  <span><Tags className="h-4 w-4" /><strong>{sport._count?.categories || sport.categories?.length || 0}</strong> hạng mục</span>
                </div>
                {!!sport.categories?.length && (
                  <div className="directory-card-tags">
                    {sport.categories.slice(0, 4).map((category) => <span key={category.id}>{category.name}</span>)}
                    {sport.categories.length > 4 && <span>+{sport.categories.length - 4}</span>}
                  </div>
                )}
                <Link href={`/sports/${encodeURIComponent(sport.code.toLowerCase())}`} className="directory-card-action">
                  Mở nền tảng bộ môn <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </section>
        ) : !error ? (
          <div className="directory-empty"><Empty description="Không tìm thấy bộ môn phù hợp" /></div>
        ) : null}
      </div>
    </main>
  );
}
