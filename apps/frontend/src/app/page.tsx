'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Alert, Avatar, Button, Card, Empty, Skeleton, Statistic, Tag } from 'antd';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
  Medal,
  Newspaper,
  Radio,
  ShieldCheck,
  Swords,
  Target,
  Star,
  Trophy,
  UserRound,
  Users,
} from 'lucide-react';
import { fetcher } from '@/lib/api';

type Athlete = {
  id: string;
  fullName: string;
  photoUrl?: string;
  country?: { code?: string; name?: string; flagUrl?: string };
  federation?: { name?: string };
  categories?: Array<{ name: string }>;
  statistics?: Array<{
    totalMatches: number;
    totalWins: number;
    goldMedals: number;
    silverMedals: number;
    bronzeMedals: number;
  }>;
};

type Match = {
  id: string;
  matchNumber?: number;
  matchDate: string;
  startTime?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'CANCELLED';
  fop?: string;
  athlete1?: Athlete;
  athlete2?: Athlete;
  athlete1Score?: number;
  athlete2Score?: number;
  event?: { id: string; name: string };
  category?: { name: string };
};

type FeaturedArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  createdAt: string;
};

const viDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const viArticleDate = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export default function HomePage() {
  const athletesQuery = useSWR('/athletes?limit=6', fetcher);
  const matchesQuery = useSWR('/matches?limit=8', fetcher);
  const rankingsQuery = useSWR('/statistics/rankings/athletes?sortBy=medals&limit=5', fetcher);
  const eventsQuery = useSWR('/events?isPublished=true&limit=4', fetcher);
  const featuredArticlesQuery = useSWR('/articles?isFeatured=true&limit=8', fetcher);

  const athleteData = athletesQuery.data as any;
  const matchData = matchesQuery.data as any;
  const rankingData = rankingsQuery.data as any;
  const eventData = eventsQuery.data as any;
  const athletes = (athleteData?.items || []) as Athlete[];
  const matches = (matchData?.items || []) as Match[];
  const rankings = (rankingData?.items || []) as any[];
  const featuredArticles = ((featuredArticlesQuery.data as any)?.items || []) as FeaturedArticle[];
  const featuredMatches = [...matches]
    .sort((a, b) => {
      const priority = { RUNNING: 0, SCHEDULED: 1, FINISHED: 2, CANCELLED: 3 };
      return priority[a.status] - priority[b.status] || new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
    })
    .slice(0, 5);
  const loading = athletesQuery.isLoading || matchesQuery.isLoading;
  const hasError = athletesQuery.error || matchesQuery.error || rankingsQuery.error || featuredArticlesQuery.error;

  return (
    <div className="home-page min-h-screen">
      <section className="home-hero relative overflow-hidden border-b border-white/10">
        <div className="home-hero-aurora absolute -inset-[10%] bg-[radial-gradient(circle_at_18%_10%,rgba(0,166,240,0.18),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="home-hero-grid absolute -inset-[52px] opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:gap-16 lg:px-8 lg:py-24">
          <div className="home-hero-copy min-w-0 self-center">
            <div className="home-hero-live-badge relative mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3.5 py-2 text-[11px] font-extrabold uppercase leading-none tracking-[0.14em] text-emerald-300">
              <Radio className="home-hero-live-icon h-3.5 w-3.5" />
              Dữ liệu thi đấu trực tiếp
            </div>
            <h1 className="home-hero-title max-w-3xl text-4xl font-extrabold leading-[1.18] tracking-[-0.035em] text-slate-100 sm:text-5xl lg:text-[3.75rem] xl:text-[4rem]">
              <span className="home-hero-title-line block">Mọi dấu ấn của vận động viên,</span>
              <span className="home-hero-title-line home-hero-title-accent block text-transparent pb-2.5">đều được ghi lại</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg sm:leading-8">
              Tra cứu hồ sơ, theo dõi lịch đấu và xem thành tích được cập nhật tập trung theo từng giải đấu.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Button type="primary" size="large" href="/athletes" icon={<Users className="h-4 w-4" />}>
                Khám phá vận động viên
              </Button>
              <Button size="large" href="/events" icon={<CalendarDays className="h-4 w-4" />}>
                Xem lịch thi đấu
              </Button>
            </div>
          </div>

          <Card className="home-hero-panel public-surface self-center shadow-2xl shadow-black/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase leading-none tracking-[0.16em] text-sblue-400">Toàn hệ thống</p>
                <h2 className="mt-2 text-xl font-extrabold leading-tight tracking-[-0.02em] text-slate-100">Dữ liệu nổi bật</h2>
              </div>
              <ShieldCheck className="home-hero-shield h-7 w-7 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <Metric icon={Users} label="Vận động viên" value={athleteData?.total ?? '—'} tone="blue" />
              <Metric icon={Swords} label="Trận đấu" value={matchData?.meta?.total ?? '—'} tone="violet" />
              <Metric icon={CalendarDays} label="Sự kiện" value={eventData?.total ?? '—'} tone="amber" />
              <Metric icon={Trophy} label="Có xếp hạng" value={rankingData?.count ?? '—'} tone="green" />
            </div>
          </Card>
        </div>
      </section>

      <div className="home-content mx-auto max-w-7xl space-y-16 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {hasError && <Alert type="warning" showIcon message="Chưa kết nối được máy chủ dữ liệu" description="Hãy khởi động hệ thống Docker để xem thông tin mới nhất." />}

        <section aria-labelledby="athletes-heading">
          <SectionHeading
            eyebrow="Hồ sơ vận động viên"
            title="Gương mặt nổi bật"
            description="Thông tin cá nhân, đơn vị thi đấu và thành tích mới nhất."
            href="/athletes"
          />
          <div className="home-athletes-grid mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              : athletes.map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
          </div>
        </section>

        <div className="home-dashboard-grid grid items-stretch gap-10 xl:grid-cols-[1.25fr_.75fr] xl:gap-6">
          <section className="home-dashboard-column flex min-w-0 flex-col" aria-labelledby="schedule-heading">
            <SectionHeading eyebrow="Lịch thi đấu" title="Các trận đáng chú ý" href="/events" compact />
            <Card className="home-dashboard-card home-matches-card public-surface mt-5 flex-1 overflow-hidden" styles={{ body: { padding: 0 } }}>
              {featuredMatches.length === 0 && !matchesQuery.isLoading ? (
                <EmptyState icon={CalendarDays} text="Chưa có lịch thi đấu." />
              ) : (
                featuredMatches.map((match) => <MatchRow key={match.id} match={match} />)
              )}
            </Card>
          </section>

          <section className="home-dashboard-column flex min-w-0 flex-col" aria-labelledby="ranking-heading">
            <SectionHeading eyebrow="Thống kê thành tích" title="Bảng xếp hạng" href="/rankings" compact />
            <Card className="home-dashboard-card home-ranking-card public-surface mt-5 flex-1 overflow-hidden" styles={{ body: { padding: 8 } }}>
              {rankings.length === 0 && !rankingsQuery.isLoading ? (
                <EmptyState icon={Medal} text="Chưa có dữ liệu xếp hạng." />
              ) : (
                rankings.map((item, index) => (
                  <Link key={`${item.athlete?.id}-${index}`} href={`/athletes/${item.athlete?.id}`} className="home-ranking-row flex items-center gap-3 rounded-xl px-3.5 py-3 transition hover:bg-white/5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? 'bg-amber-400 text-sdark-950' : 'bg-white/5 text-slate-300'}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-100">{item.athlete?.fullName}</p>
                      <p className="text-xs text-slate-500">{item.athlete?.country?.code || '—'} · {item.totalMatches} trận</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">{Math.round((item.winRate || 0) * 100)}%</p>
                      <p className="text-[11px] text-slate-500">tỷ lệ thắng</p>
                    </div>
                  </Link>
                ))
              )}
            </Card>
          </section>
        </div>

        <FeaturedNewsSlider articles={featuredArticles} loading={featuredArticlesQuery.isLoading} />
      </div>
    </div>
  );
}

function FeaturedNewsSlider({ articles, loading }: { articles: FeaturedArticle[]; loading: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= articles.length) setActiveIndex(0);
  }, [activeIndex, articles.length]);

  useEffect(() => {
    if (paused || articles.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % articles.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [articles.length, paused]);

  if (loading) {
    return (
      <section aria-label="Đang tải bài viết nổi bật">
        <SectionHeading eyebrow="Tin tức SportData" title="Bài viết nổi bật" href="/news" />
        <Card className="home-featured-news-skeleton public-surface mt-7">
          <Skeleton active avatar paragraph={{ rows: 5 }} />
        </Card>
      </section>
    );
  }

  if (articles.length === 0) return null;

  const showPrevious = () => setActiveIndex((current) => (current - 1 + articles.length) % articles.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % articles.length);

  return (
    <section aria-label="Bài viết nổi bật">
      <SectionHeading
        eyebrow="Tin tức SportData"
        title="Bài viết nổi bật"
        description="Những câu chuyện, dấu ấn và cập nhật đáng chú ý được ban biên tập lựa chọn."
        href="/news"
      />
      <div
        className="home-featured-news mt-7"
        role="region"
        aria-roledescription="slider"
        aria-label={`Bài viết ${activeIndex + 1} trên ${articles.length}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="home-featured-news-viewport">
          <div
            className="home-featured-news-track"
            style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
          >
            {articles.map((article, index) => (
              <article
                key={article.id}
                className="home-featured-news-slide"
                aria-hidden={index !== activeIndex}
              >
                <Link
                  href={`/news/${article.slug}`}
                  className="home-featured-news-cover"
                  tabIndex={index === activeIndex ? 0 : -1}
                >
                  {article.coverImageUrl ? (
                    <img src={article.coverImageUrl} alt={article.title} loading={index === 0 ? 'eager' : 'lazy'} />
                  ) : (
                    <span className="home-featured-news-placeholder"><Newspaper className="h-14 w-14" /></span>
                  )}
                  <span className="home-featured-news-cover-shade" />
                  <span className="home-featured-news-badge"><Star className="h-3.5 w-3.5 fill-current" /> Nổi bật</span>
                </Link>

                <div className="home-featured-news-copy">
                  <p className="home-featured-news-date">
                    <CalendarDays className="h-4 w-4" />
                    {viArticleDate.format(new Date(article.publishedAt || article.createdAt))}
                  </p>
                  <h3>{article.title}</h3>
                  <p className="home-featured-news-excerpt">
                    {article.excerpt || 'Khám phá nội dung mới nhất từ SportData.'}
                  </p>
                  <Link
                    href={`/news/${article.slug}`}
                    className="home-featured-news-action"
                    tabIndex={index === activeIndex ? 0 : -1}
                  >
                    Đọc bài viết <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>

        {articles.length > 1 && (
          <div className="home-featured-news-controls">
            <div className="home-featured-news-dots" role="tablist" aria-label="Chọn bài viết">
              {articles.map((article, index) => (
                <button
                  key={article.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Xem bài viết ${index + 1}: ${article.title}`}
                  className={index === activeIndex ? 'is-active' : ''}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
            <div className="home-featured-news-arrows">
              <Button type="text" shape="circle" icon={<ChevronLeft className="h-5 w-5" />} onClick={showPrevious} aria-label="Bài viết trước" />
              <Button type="text" shape="circle" icon={<ChevronRight className="h-5 w-5" />} onClick={showNext} aria-label="Bài viết tiếp theo" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: 'blue' | 'violet' | 'amber' | 'green' }) {
  const animatedValue = useCountUp(value);
  const tones = {
    blue: 'bg-sblue-400/10 text-sblue-300',
    violet: 'bg-violet-400/10 text-violet-300',
    amber: 'bg-amber-400/10 text-amber-300',
    green: 'bg-emerald-400/10 text-emerald-300',
  };
  return (
    <Card size="small" className="home-hero-metric h-full border-white/10 bg-sdark-950/50">
      <Avatar shape="square" className={`home-hero-metric-icon mb-4 ${tones[tone]}`} icon={<Icon className="h-4 w-4" />} />
      <Statistic className="home-hero-statistic" title={label} value={animatedValue} />
    </Card>
  );
}

function useCountUp(value: string | number, duration = 1100) {
  const target = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : null;
  const [displayValue, setDisplayValue] = useState<string | number>(target === null ? value : 0);

  useEffect(() => {
    if (target === null) {
      setDisplayValue(value);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(target);
      return;
    }

    let animationFrame = 0;
    let startedAt: number | null = null;

    const update = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * easedProgress));

      if (progress < 1) animationFrame = requestAnimationFrame(update);
    };

    setDisplayValue(0);
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, target, value]);

  return displayValue;
}

function SectionHeading({ eyebrow, title, description, href, compact = false }: { eyebrow: string; title: string; description?: string; href: string; compact?: boolean }) {
  return (
    <div className={`home-section-heading flex items-end justify-between gap-5 ${compact ? 'home-section-heading-compact' : ''}`}>
      <div className="min-w-0">
        <p className="home-section-eyebrow text-[11px] font-extrabold uppercase leading-none tracking-[0.2em] text-sblue-400">{eyebrow}</p>
        <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className={`home-section-title ${compact ? 'text-2xl sm:text-[28px]' : 'text-3xl sm:text-[32px]'} mt-2.5 font-extrabold leading-[1.22] tracking-[-0.025em] text-slate-100`}>{title}</h2>
        {description && <p className="mt-2.5 text-sm leading-6 text-slate-500">{description}</p>}
      </div>
      <Link href={href} className="home-section-link mb-1 hidden shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-sblue-400 transition hover:bg-sblue-400/10 hover:text-sblue-300 sm:flex">
        Xem tất cả <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  const [imageFailed, setImageFailed] = useState(false);
  const stat = athlete.statistics?.[0];
  const wins = stat?.totalWins || 0;
  const total = stat?.totalMatches || 0;
  const medals = (stat?.goldMedals || 0) + (stat?.silverMedals || 0) + (stat?.bronzeMedals || 0);
  const photoUrl = athlete.photoUrl?.trim();
  return (
    <Link href={`/athletes/${athlete.id}`} className="group block h-full">
      <Card hoverable className="home-athlete-card public-surface h-full">
      <div className="flex items-start gap-4">
        <Avatar
          shape="square"
          size={56}
          src={photoUrl && !imageFailed ? photoUrl : undefined}
          icon={<UserRound className="h-6 w-6" />}
          alt={`Ảnh đại diện ${athlete.fullName}`}
          className="shrink-0 rounded-2xl bg-gradient-to-br from-sblue-400 to-sblue-700 text-white shadow-lg shadow-sblue-500/15 [&_img]:object-cover"
          onError={() => {
            setImageFailed(true);
            return false;
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-100 group-hover:text-sblue-300">{athlete.fullName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{athlete.country?.code || '—'} · {athlete.federation?.name || 'Chưa cập nhật đơn vị'}</p>
          <p className="mt-2 truncate text-xs font-semibold text-slate-400">{athlete.categories?.[0]?.name || 'Chưa phân hạng'}</p>
        </div>
      </div>
      <div className="home-athlete-stats mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
        <SmallStat label="Trận" value={total} />
        <SmallStat label="Thắng" value={wins} accent />
        <SmallStat label="Huy chương" value={medals} />
      </div>
      </Card>
    </Link>
  );
}

function SmallStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div><p className={`text-lg font-black ${accent ? 'text-emerald-400' : 'text-slate-100'}`}>{value}</p><p className="text-[11px] font-semibold text-slate-600">{label}</p></div>;
}

function MatchRow({ match }: { match: Match }) {
  const status = {
    RUNNING: { label: 'Đang đấu', className: 'bg-red-400/10 text-red-300', icon: CircleDot },
    SCHEDULED: { label: 'Sắp diễn ra', className: 'bg-sblue-400/10 text-sblue-300', icon: Clock3 },
    FINISHED: { label: 'Hoàn thành', className: 'bg-white/5 text-slate-400', icon: Target },
    CANCELLED: { label: 'Đã hủy', className: 'bg-amber-400/10 text-amber-300', icon: Clock3 },
  }[match.status];
  const StatusIcon = status.icon;
  return (
    <div className="home-match-row grid gap-3 border-b border-white/10 p-5 last:border-b-0 sm:grid-cols-[150px_1fr_auto] sm:items-center">
      <div>
        <Tag className="m-0" color={match.status === 'RUNNING' ? 'error' : match.status === 'SCHEDULED' ? 'blue' : match.status === 'FINISHED' ? 'success' : 'warning'} icon={<StatusIcon className="h-3 w-3" />}>{status.label}</Tag>
        <p className="mt-2 text-xs text-slate-500">{viDate.format(new Date(match.startTime || match.matchDate))}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-500">{match.event?.name || match.category?.name}</p>
        <p className="mt-1 truncate text-sm font-bold text-slate-100">{match.athlete1?.fullName || 'Chờ xác định'} <span className="mx-1.5 text-slate-600">vs</span> {match.athlete2?.fullName || 'Chờ xác định'}</p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{match.fop || 'FOP —'}</span>
        {match.status === 'FINISHED' && <span className="text-lg font-black tabular-nums text-slate-100">{match.athlete1Score ?? 0}–{match.athlete2Score ?? 0}</span>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return <div className="grid min-h-48 place-items-center p-8"><Empty image={<Icon className="mx-auto h-9 w-9 text-slate-600" />} description={text} /></div>;
}

function SkeletonCard() {
  return <Card className="public-surface h-44"><Skeleton active avatar paragraph={{ rows: 3 }} /></Card>;
}
