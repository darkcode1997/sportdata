'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import useSWR from 'swr';
import { Alert, Button, Empty, Input, Skeleton } from 'antd';
import { ArrowUpRight, Building2, Layers3, Search, Trophy } from 'lucide-react';
import { fetcher } from '@/lib/api';

type Category = { id: string; name: string };

type Sport = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  logoUrl?: string | null;
  displayName?: string | null;
  subtitle?: string | null;
  backgroundUrl?: string | null;
  isVisible?: boolean;
  sortOrder?: number;
  categories?: Category[];
  _count?: { events?: number; categories?: number };
};

type EventItem = {
  id: string;
  bannerUrl?: string | null;
  sportId?: string | null;
  sport?: Pick<Sport, 'id'> | null;
  sports?: Array<Pick<Sport, 'id'>>;
};

type EventResponse = { items?: EventItem[]; data?: EventItem[] } | EventItem[];

const fallbackBackgrounds = [
  'radial-gradient(circle at 22% 18%, rgba(14,165,233,.45), transparent 38%), linear-gradient(135deg, #172554 0%, #07111f 70%)',
  'radial-gradient(circle at 78% 22%, rgba(239,68,68,.38), transparent 38%), linear-gradient(135deg, #3f1018 0%, #090d18 72%)',
  'radial-gradient(circle at 28% 78%, rgba(34,197,94,.32), transparent 42%), linear-gradient(135deg, #123026 0%, #080d17 72%)',
  'radial-gradient(circle at 75% 70%, rgba(168,85,247,.35), transparent 42%), linear-gradient(135deg, #2e1065 0%, #090d18 72%)',
  'radial-gradient(circle at 22% 25%, rgba(245,158,11,.38), transparent 38%), linear-gradient(135deg, #422006 0%, #090d18 72%)',
  'radial-gradient(circle at 80% 25%, rgba(6,182,212,.35), transparent 40%), linear-gradient(135deg, #083344 0%, #080d17 72%)',
];

function unwrapEvents(value?: EventResponse) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.items || value.data || [];
}

function belongsToSport(event: EventItem, sportId: string) {
  return event.sportId === sportId
    || event.sport?.id === sportId
    || event.sports?.some((sport) => sport.id === sportId);
}

export default function EventPlatformsPage() {
  const [search, setSearch] = useState('');
  const { data: sports = [], error: sportsError, isLoading: sportsLoading, mutate } = useSWR<Sport[]>('/sports', fetcher);
  const { data: eventResponse } = useSWR<EventResponse>('/events?isPublished=true&limit=200', fetcher);
  const events = useMemo(() => unwrapEvents(eventResponse), [eventResponse]);
  const keyword = search.trim().toLocaleLowerCase('vi');
  const filteredSports = useMemo(() => sports.filter((sport) => {
    if (sport.isVisible === false) return false;
    if (!keyword) return true;
    return [sport.name, sport.displayName, sport.subtitle, sport.code, sport.description, ...(sport.categories || []).map((category) => category.name)]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(keyword);
  }), [keyword, sports]);

  return (
    <main className="min-h-screen bg-[#11131f] pb-20 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_88%_5%,rgba(14,165,233,.13),transparent_34%)]">
        <div className="mx-auto max-w-[1600px] px-5 pb-8 pt-12 sm:px-8 lg:px-10 lg:pb-10 lg:pt-16">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-sky-400">
                <Trophy className="h-4 w-4" /> SportData Việt Nam
              </p>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Nền tảng sự kiện</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
                Chọn bộ môn để truy cập nền tảng riêng, xem sự kiện và đăng ký thi đấu.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="primary" size="large" shape="round" className="min-w-28 !font-bold">
                Tất cả
              </Button>
              <Link href="/organizations">
                <Button size="large" shape="round" className="min-w-44" icon={<Building2 className="h-4 w-4" />}>
                  Đơn vị tổ chức
                </Button>
              </Link>
              <Input
                allowClear
                size="large"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                prefix={<Search className="h-4 w-4" />}
                placeholder="Tìm bộ môn"
                aria-label="Tìm bộ môn"
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-5 py-9 sm:px-8 lg:px-10" aria-labelledby="event-platform-list">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 id="event-platform-list" className="text-lg font-bold text-white">Các bộ môn</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredSports.length} nền tảng đang hiển thị</p>
          </div>
          <span className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:flex">
            <Layers3 className="h-4 w-4" /> Event Platforms
          </span>
        </div>

        {sportsError && (
          <Alert
            className="mb-6"
            showIcon
            type="error"
            message="Không thể tải danh sách bộ môn"
            action={<Button onClick={() => mutate()}>Thử lại</Button>}
          />
        )}

        {sportsLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton.Node key={index} active className="!h-[300px] !w-full !rounded-[28px]" />
            ))}
          </div>
        ) : filteredSports.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredSports.map((sport, index) => {
              const sportEvents = events.filter((event) => belongsToSport(event, sport.id));
              const cover = sport.backgroundUrl || sportEvents.find((event) => event.bannerUrl)?.bannerUrl;
              const backgroundImage = cover
                ? `linear-gradient(180deg, rgba(5,8,18,.22) 0%, rgba(5,8,18,.52) 48%, rgba(5,8,18,.96) 100%), url("${cover.replace(/"/g, '%22')}")`
                : fallbackBackgrounds[index % fallbackBackgrounds.length];

              return (
                <Link
                  key={sport.id}
                  href={`/sports/${encodeURIComponent(sport.code.toLowerCase())}`}
                  className="group relative min-h-[300px] overflow-hidden rounded-[28px] border border-white/20 bg-cover bg-center shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-400/80 hover:shadow-sky-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  style={{ backgroundImage, '--platform-index': index } as CSSProperties}
                  aria-label={`Mở nền tảng ${sport.displayName || sport.name}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.06),transparent_35%)] opacity-70" />
                  <div className="relative flex min-h-[300px] flex-col justify-between p-7 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid min-h-16 min-w-16 place-items-center rounded-2xl border border-white/15 bg-black/35 p-3 backdrop-blur-sm">
                        {sport.logoUrl ? (
                          // Logo URL is managed by CMS and may use an external host.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sport.logoUrl} alt={`Logo ${sport.name}`} className="max-h-12 max-w-28 object-contain" />
                        ) : (
                          <span className="text-xl font-black tracking-tight text-sky-300">{sport.code.slice(0, 4)}</span>
                        )}
                      </div>
                      <span className="grid h-11 w-11 place-items-center rounded-full border border-white/20 bg-black/30 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                        <ArrowUpRight className="h-5 w-5" />
                      </span>
                    </div>

                    <div>
                      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
                        <span>{sport.code}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-500" />
                        <span>{sportEvents.length || sport._count?.events || 0} sự kiện</span>
                      </div>
                      <h3 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">{sport.displayName || sport.name}</h3>
                      <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-slate-300">
                        {sport.subtitle || sport.description || `Nền tảng quản lý sự kiện và đăng ký thi đấu ${sport.name}.`}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !sportsError ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16">
            <Empty description={<span className="text-slate-400">Không tìm thấy bộ môn phù hợp</span>} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
