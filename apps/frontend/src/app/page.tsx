'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Alert, Avatar, Button, Card, Empty, Skeleton, Statistic, Tag } from 'antd';
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
  Medal,
  Radio,
  ShieldCheck,
  Swords,
  Target,
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

const viDate = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export default function HomePage() {
  const athletesQuery = useSWR('/athletes?limit=6', fetcher);
  const matchesQuery = useSWR('/matches?limit=8', fetcher);
  const rankingsQuery = useSWR('/statistics/rankings/athletes?sortBy=medals&limit=5', fetcher);
  const eventsQuery = useSWR('/events?isPublished=true&limit=4', fetcher);

  const athleteData = athletesQuery.data as any;
  const matchData = matchesQuery.data as any;
  const rankingData = rankingsQuery.data as any;
  const eventData = eventsQuery.data as any;
  const athletes = (athleteData?.items || []) as Athlete[];
  const matches = (matchData?.items || []) as Match[];
  const rankings = (rankingData?.items || []) as any[];
  const featuredMatches = [...matches]
    .sort((a, b) => {
      const priority = { RUNNING: 0, SCHEDULED: 1, FINISHED: 2, CANCELLED: 3 };
      return priority[a.status] - priority[b.status] || new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
    })
    .slice(0, 5);
  const loading = athletesQuery.isLoading || matchesQuery.isLoading;
  const hasError = athletesQuery.error || matchesQuery.error || rankingsQuery.error;

  return (
    <div className="min-h-screen">
      <section className="home-hero relative overflow-hidden border-b border-white/10">
        <div className="home-hero-aurora absolute -inset-[10%] bg-[radial-gradient(circle_at_18%_10%,rgba(0,166,240,0.18),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="home-hero-grid absolute -inset-[52px] opacity-[0.055] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:py-20">
          <div className="home-hero-copy self-center">
            <div className="home-hero-live-badge relative mb-6 inline-flex items-center gap-2 overflow-hidden rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              <Radio className="home-hero-live-icon h-3.5 w-3.5" />
              Dữ liệu thi đấu trực tiếp
            </div>
            <h1 className="home-hero-title max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              <span className="home-hero-title-line block">Mọi dấu ấn của vận động viên,</span>
              <span className="home-hero-title-line home-hero-title-accent block text-transparent">đều được ghi lại</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              Tra cứu hồ sơ, theo dõi lịch đấu và xem thành tích được cập nhật tập trung theo từng giải đấu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="primary" size="large" href="/athletes" icon={<Users className="h-4 w-4" />}>
                Khám phá vận động viên
              </Button>
              <Button size="large" href="/events" icon={<CalendarDays className="h-4 w-4" />}>
                Xem lịch thi đấu
              </Button>
            </div>
          </div>

          <Card className="home-hero-panel public-surface shadow-2xl shadow-black/20" styles={{ body: { padding: 24 } }}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sblue-400">Toàn hệ thống</p>
                <h2 className="mt-1 text-xl font-black text-white">Dữ liệu nổi bật</h2>
              </div>
              <ShieldCheck className="home-hero-shield h-7 w-7 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Metric icon={Users} label="Vận động viên" value={athleteData?.total ?? '—'} tone="blue" />
              <Metric icon={Swords} label="Trận đấu" value={matchData?.meta?.total ?? '—'} tone="violet" />
              <Metric icon={CalendarDays} label="Sự kiện" value={eventData?.total ?? '—'} tone="amber" />
              <Metric icon={Trophy} label="Có xếp hạng" value={rankingData?.count ?? '—'} tone="green" />
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-sdark-950/55 p-4">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Hệ thống đang hoạt động</p>
                <p className="text-xs text-slate-500">Lịch đấu và kết quả được đồng bộ từ CMS</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {hasError && <Alert type="warning" showIcon message="Chưa kết nối được máy chủ dữ liệu" description="Hãy khởi động hệ thống Docker để xem thông tin mới nhất." />}

        <section aria-labelledby="athletes-heading">
          <SectionHeading
            eyebrow="Hồ sơ vận động viên"
            title="Gương mặt nổi bật"
            description="Thông tin cá nhân, đơn vị thi đấu và thành tích mới nhất."
            href="/athletes"
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              : athletes.map((athlete) => <AthleteCard key={athlete.id} athlete={athlete} />)}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
          <section aria-labelledby="schedule-heading">
            <SectionHeading eyebrow="Lịch thi đấu" title="Các trận đáng chú ý" href="/events" compact />
            <Card className="public-surface mt-6 overflow-hidden" styles={{ body: { padding: 0 } }}>
              {featuredMatches.length === 0 && !matchesQuery.isLoading ? (
                <EmptyState icon={CalendarDays} text="Chưa có lịch thi đấu." />
              ) : (
                featuredMatches.map((match) => <MatchRow key={match.id} match={match} />)
              )}
            </Card>
          </section>

          <section aria-labelledby="ranking-heading">
            <SectionHeading eyebrow="Thống kê thành tích" title="Bảng xếp hạng" href="/rankings" compact />
            <Card className="public-surface mt-6 overflow-hidden" styles={{ body: { padding: 8 } }}>
              {rankings.length === 0 && !rankingsQuery.isLoading ? (
                <EmptyState icon={Medal} text="Chưa có dữ liệu xếp hạng." />
              ) : (
                rankings.map((item, index) => (
                  <Link key={`${item.athlete?.id}-${index}`} href={`/athletes/${item.athlete?.id}`} className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? 'bg-amber-400 text-sdark-950' : 'bg-white/5 text-slate-300'}`}>
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">{item.athlete?.fullName}</p>
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
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: 'blue' | 'violet' | 'amber' | 'green' }) {
  const tones = {
    blue: 'bg-sblue-400/10 text-sblue-300',
    violet: 'bg-violet-400/10 text-violet-300',
    amber: 'bg-amber-400/10 text-amber-300',
    green: 'bg-emerald-400/10 text-emerald-300',
  };
  return (
    <Card size="small" className="home-hero-metric border-white/10 bg-sdark-950/50">
      <Avatar shape="square" className={`mb-3 ${tones[tone]}`} icon={<Icon className="h-4 w-4" />} />
      <Statistic title={label} value={value} valueStyle={{ color: '#fff', fontSize: 24, fontWeight: 800 }} />
    </Card>
  );
}

function SectionHeading({ eyebrow, title, description, href, compact = false }: { eyebrow: string; title: string; description?: string; href: string; compact?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-sblue-400">{eyebrow}</p>
        <h2 id={`${title.toLowerCase().replace(/\s+/g, '-')}-heading`} className={`${compact ? 'text-2xl' : 'text-3xl'} mt-2 font-black tracking-tight text-white`}>{title}</h2>
        {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      </div>
      <Link href={href} className="hidden items-center gap-1 text-sm font-bold text-sblue-400 hover:text-sblue-300 sm:flex">
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
      <Card hoverable className="public-surface h-full">
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
          <p className="truncate text-base font-black text-white group-hover:text-sblue-300">{athlete.fullName}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{athlete.country?.code || '—'} · {athlete.federation?.name || 'Chưa cập nhật đơn vị'}</p>
          <p className="mt-2 truncate text-xs font-semibold text-slate-400">{athlete.categories?.[0]?.name || 'Chưa phân hạng'}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
        <SmallStat label="Trận" value={total} />
        <SmallStat label="Thắng" value={wins} accent />
        <SmallStat label="Huy chương" value={medals} />
      </div>
      </Card>
    </Link>
  );
}

function SmallStat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return <div><p className={`text-lg font-black ${accent ? 'text-emerald-400' : 'text-white'}`}>{value}</p><p className="text-[11px] font-semibold text-slate-600">{label}</p></div>;
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
    <div className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[150px_1fr_auto] sm:items-center">
      <div>
        <Tag className="m-0" color={match.status === 'RUNNING' ? 'error' : match.status === 'SCHEDULED' ? 'blue' : match.status === 'FINISHED' ? 'success' : 'warning'} icon={<StatusIcon className="h-3 w-3" />}>{status.label}</Tag>
        <p className="mt-2 text-xs text-slate-500">{viDate.format(new Date(match.startTime || match.matchDate))}</p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-500">{match.event?.name || match.category?.name}</p>
        <p className="mt-1 truncate text-sm font-bold text-white">{match.athlete1?.fullName || 'Chờ xác định'} <span className="mx-1.5 text-slate-600">vs</span> {match.athlete2?.fullName || 'Chờ xác định'}</p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <span className="inline-flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{match.fop || 'FOP —'}</span>
        {match.status === 'FINISHED' && <span className="text-lg font-black tabular-nums text-white">{match.athlete1Score ?? 0}–{match.athlete2Score ?? 0}</span>}
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
