'use client';

import Link from 'next/link';
import { useMemo, useState, type CSSProperties } from 'react';
import useSWR from 'swr';
import { Alert, Button, Empty, Input, Select, Skeleton } from 'antd';
import { ArrowUpRight, CalendarCheck2, Layers3, Search, SlidersHorizontal, Trophy } from 'lucide-react';
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
  const [selectedSportId, setSelectedSportId] = useState('');
  const { data: sports = [], error: sportsError, isLoading: sportsLoading, mutate } = useSWR<Sport[]>('/sports', fetcher);
  const { data: eventResponse } = useSWR<EventResponse>('/events?isPublished=true&limit=200', fetcher);
  const events = useMemo(() => unwrapEvents(eventResponse), [eventResponse]);
  const keyword = search.trim().toLocaleLowerCase('vi');
  const filteredSports = useMemo(() => sports.filter((sport) => {
    if (sport.isVisible === false) return false;
    if (selectedSportId && sport.id !== selectedSportId) return false;
    if (!keyword) return true;
    return [sport.name, sport.displayName, sport.subtitle, sport.code, sport.description, ...(sport.categories || []).map((category) => category.name)]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('vi')
      .includes(keyword);
  }), [keyword, selectedSportId, sports]);
  const visibleSports = useMemo(() => sports.filter((sport) => sport.isVisible !== false), [sports]);

  return (
    <main className="event-platform-page min-h-screen bg-[#11131f] pb-20 text-white">
      <section className="event-platform-hero relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_82%_12%,rgba(14,165,233,.18),transparent_35%)]">
        <div className="pointer-events-none absolute -right-24 -top-40 h-96 w-96 rounded-full border border-sky-400/10" />
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-12 sm:px-8 lg:pb-12 lg:pt-16">
          <div className="grid gap-8 xl:grid-cols-[1fr_520px] xl:items-end">
            <div className="max-w-3xl">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-sky-400">
                <Trophy className="h-4 w-4" /> SportData Việt Nam
              </p>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Sự kiện theo bộ môn</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
                Chọn nền tảng bộ môn để xem lịch giải, hạng thi đấu và đăng ký trực tuyến cho các sự kiện do SportData tổ chức, vận hành.
              </p>
              <div className="mt-7 flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                  <Layers3 className="h-4 w-4 text-sky-400" /> {visibleSports.length} bộ môn
                </span>
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-slate-300">
                  <CalendarCheck2 className="h-4 w-4 text-emerald-400" /> {events.length} sự kiện công khai
                </span>
              </div>
            </div>

            <div className="event-platform-filter rounded-3xl border border-white/10 bg-[#0b1220]/80 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                <SlidersHorizontal className="h-4 w-4 text-sky-400" /> Tìm nền tảng phù hợp
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Select
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  value={selectedSportId}
                  onChange={setSelectedSportId}
                  aria-label="Lọc theo bộ môn"
                  options={[
                    { value: '', label: 'Tất cả bộ môn' },
                    ...visibleSports.map((sport) => ({ value: sport.id, label: sport.displayName || sport.name })),
                  ]}
                  className="w-full"
                />
              <Input
                allowClear
                size="large"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                prefix={<Search className="h-4 w-4" />}
                placeholder="Tìm bộ môn"
                aria-label="Tìm bộ môn"
                  className="w-full"
              />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="event-platform-list mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-12" aria-labelledby="event-platform-list">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-400">Event platforms</p>
            <h2 id="event-platform-list" className="text-2xl font-black text-white">Chọn bộ môn</h2>
            <p className="mt-2 text-sm text-slate-500">Hiển thị {filteredSports.length}/{visibleSports.length} nền tảng bộ môn</p>
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton.Node key={index} active className="!h-[300px] !w-full !rounded-[28px]" />
            ))}
          </div>
        ) : filteredSports.length ? (
          <div className={filteredSports.length <= 2 ? 'grid gap-6 md:grid-cols-2' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}>
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
                  className="group relative min-h-[340px] overflow-hidden rounded-[28px] border border-white/15 bg-cover bg-center shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-400/80 hover:shadow-sky-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  style={{ backgroundImage, '--platform-index': index } as CSSProperties}
                  aria-label={`Mở nền tảng ${sport.displayName || sport.name}`}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,.06),transparent_35%)] opacity-70" />
                  <div className="relative flex min-h-[340px] flex-col justify-between p-7 sm:p-8">
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
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-white">
                        Xem sự kiện <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : !sportsError ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16">
            <Empty description={<span className="text-slate-400">Không tìm thấy bộ môn phù hợp</span>}>
              <Button onClick={() => { setSearch(''); setSelectedSportId(''); }}>Xóa bộ lọc</Button>
            </Empty>
          </div>
        ) : null}
      </section>
    </main>
  );
}
