'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Button, Card, Empty, Select, Skeleton, Tag } from 'antd';
import { Radio, Trophy } from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';
import { fetcher } from '@/lib/api';

interface Sport {
  id: string;
  name: string;
  code: string;
}

interface EventCategory {
  id: string;
  name: string;
  sportId?: string;
  sport?: Sport | null;
  discipline?: string | null;
  uniform?: string | null;
  beltLevel?: string | null;
}

interface MatchAthlete {
  id: string;
  fullName: string;
  photoUrl?: string | null;
  country?: { code?: string; name?: string; flagUrl?: string | null } | null;
  federation?: { id?: string; name?: string } | null;
}

interface Match {
  id: string;
  eventId: string;
  categoryId: string;
  matchNumber?: number | null;
  fop?: string | null;
  matchDate: string;
  startTime?: string | null;
  athlete1?: MatchAthlete | null;
  athlete2?: MatchAthlete | null;
  athlete1Score?: number;
  athlete2Score?: number;
  athlete1Advantages?: number;
  athlete2Advantages?: number;
  athlete1Penalties?: number;
  athlete2Penalties?: number;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'CANCELLED';
  matchType?: string;
  winnerId?: string | null;
  winMethod?: string | null;
  notes?: string | null;
  category?: EventCategory | null;
}

interface CategoryGroup {
  id: string;
  name: string;
  matches: Match[];
}

interface DateGroup {
  date: string;
  count: number;
  categories: CategoryGroup[];
}

interface EventData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location?: string | null;
  sport?: Sport;
  sports?: Sport[];
  categories?: EventCategory[];
  _count?: { matches?: number; athletes?: number };
}

const demoEvent: EventData = {
  id: 'ev-jjau-001',
  name: '5TH JJAU REGIONAL CHAMPIONSHIP SOUTHEAST ASIA',
  startDate: '2026-08-21T00:00:00.000Z',
  endDate: '2026-08-23T23:59:59.999Z',
  location: 'Hà Nội, Việt Nam',
  sport: { id: 'sport-jj', name: 'Ju-Jitsu', code: 'JJ' },
  _count: { matches: 1378 },
};

const disciplineLabels: Record<string, string> = {
  NEWAZA: 'Newaza',
  FIGHTING: 'Fighting',
  CONTACT: 'Contact',
  FULL_CONTACT: 'Full Contact',
  DUO: 'Duo',
  SHOW: 'Show',
};

const beltLabels: Record<string, string> = {
  WHITE: 'Đai trắng',
  BLUE: 'Đai xanh',
  PURPLE: 'Đai tím',
  BROWN: 'Đai nâu',
  BLACK: 'Đai đen',
  OPEN: 'Mở rộng',
};

function categoryLabel(category: EventCategory) {
  const details = [
    category.discipline ? disciplineLabels[category.discipline] || category.discipline : null,
    category.uniform ? (category.uniform === 'NO_GI' ? 'No-Gi' : 'Gi') : null,
    category.beltLevel ? beltLabels[category.beltLevel] || category.beltLevel : null,
  ].filter(Boolean);
  return details.length ? `${category.name} · ${details.join(' · ')}` : category.name;
}

function normalizeDateGroups(payload: unknown): DateGroup[] {
  if (!payload || typeof payload !== 'object') return [];
  const response = payload as { dates?: unknown; data?: unknown };
  const source = response.dates ?? response.data ?? payload;

  if (Array.isArray(source)) {
    return source.filter((group): group is DateGroup => Boolean(group && typeof group.date === 'string'));
  }
  if (!source || typeof source !== 'object') return [];

  return Object.entries(source as Record<string, unknown>)
    .map(([date, categoryMap]): DateGroup | null => {
      if (!categoryMap || typeof categoryMap !== 'object' || Array.isArray(categoryMap)) return null;
      const categories = Object.entries(categoryMap as Record<string, unknown>)
        .map(([categoryName, rawMatches]): CategoryGroup | null => {
          const matches = Array.isArray(rawMatches) ? rawMatches as Match[] : [];
          if (!matches.length) return null;
          return {
            id: matches[0].category?.id || matches[0].categoryId || categoryName,
            name: matches[0].category?.name || categoryName,
            matches,
          };
        })
        .filter((group): group is CategoryGroup => group !== null);

      return {
        date,
        count: categories.reduce((total, category) => total + category.matches.length, 0),
        categories,
      };
    })
    .filter((group): group is DateGroup => group !== null)
    .sort((left, right) => left.date.localeCompare(right.date));
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { data: eventResponse, isLoading: eventLoading } = useSWR<EventData>(
    eventId ? `/events/${eventId}` : null,
    fetcher,
  );
  const { data: groupedResponse, isLoading: matchesLoading } = useSWR<unknown>(
    eventId ? `/matches/event/${eventId}/grouped` : null,
    fetcher,
  );

  const event = eventResponse || (eventId === demoEvent.id ? demoEvent : undefined);
  const dateGroups = useMemo(() => normalizeDateGroups(groupedResponse), [groupedResponse]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedSportId, setSelectedSportId] = useState<string>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();

  useEffect(() => {
    if (!dateGroups.length) return;
    if (!selectedDate || !dateGroups.some((group) => group.date === selectedDate)) {
      setSelectedDate(dateGroups[0].date);
    }
  }, [dateGroups, selectedDate]);

  const activeGroup = dateGroups.find((group) => group.date === selectedDate) || dateGroups[0];
  const eventSports = event?.sports?.length ? event.sports : event?.sport ? [event.sport] : [];
  const eventCategories = useMemo<EventCategory[]>(() => {
    if (event?.categories?.length) return event.categories;
    const categoryMap = new Map<string, EventCategory>();
    dateGroups.forEach((group) => group.categories.forEach((category) => {
      const sample = category.matches[0]?.category;
      categoryMap.set(category.id, sample || { id: category.id, name: category.name });
    }));
    return Array.from(categoryMap.values());
  }, [event?.categories, dateGroups]);
  const filteredCategories = useMemo(
    () => eventCategories.filter((category) => (
      !selectedSportId || category.sportId === selectedSportId || category.sport?.id === selectedSportId
    )),
    [eventCategories, selectedSportId],
  );

  useEffect(() => {
    if (selectedCategoryId && !filteredCategories.some((category) => category.id === selectedCategoryId)) {
      setSelectedCategoryId(undefined);
    }
  }, [filteredCategories, selectedCategoryId]);

  const activeMatches = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.categories
      .flatMap((category) => category.matches.map((match) => ({
        ...match,
        category: match.category || { id: category.id, name: category.name },
      })))
      .filter((match) => (
        (!selectedSportId || match.category?.sportId === selectedSportId || match.category?.sport?.id === selectedSportId)
        && (!selectedCategoryId || match.categoryId === selectedCategoryId)
      ))
      .sort((left, right) => {
        const leftTime = new Date(left.startTime || left.matchDate).getTime();
        const rightTime = new Date(right.startTime || right.matchDate).getTime();
        return leftTime - rightTime || (left.matchNumber || 0) - (right.matchNumber || 0);
      });
  }, [activeGroup, selectedSportId, selectedCategoryId]);

  const totalMatches = event?._count?.matches ?? dateGroups.reduce((sum, group) => sum + group.count, 0);
  const liveMatchTarget = useMemo(() => {
    const visibleLiveMatch = activeMatches.find((match) => match.status === 'RUNNING');
    if (visibleLiveMatch) {
      return { id: visibleLiveMatch.id, date: activeGroup?.date };
    }

    return dateGroups
      .flatMap((group) => group.categories.flatMap((category) => category.matches
        .filter((match) => match.status === 'RUNNING')
        .map((match) => ({ ...match, date: group.date }))))
      .sort((left, right) => {
        const dateOrder = left.date.localeCompare(right.date);
        if (dateOrder) return dateOrder;
        const leftTime = new Date(left.startTime || left.matchDate).getTime();
        const rightTime = new Date(right.startTime || right.matchDate).getTime();
        return leftTime - rightTime || (left.matchNumber || 0) - (right.matchNumber || 0);
      })
      .map((match) => ({ id: match.id, date: match.date }))[0];
  }, [activeGroup?.date, activeMatches, dateGroups]);
  const [pendingLiveMatchId, setPendingLiveMatchId] = useState<string>();
  const hasLiveMatches = Boolean(liveMatchTarget);
  const loading = eventLoading || matchesLoading;

  useEffect(() => {
    if (!pendingLiveMatchId || loading) return;
    const liveMatchElement = document.getElementById(`match-${pendingLiveMatchId}`);
    if (!liveMatchElement) return;

    const animationFrame = requestAnimationFrame(() => {
      liveMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      liveMatchElement.focus({ preventScroll: true });
      setPendingLiveMatchId(undefined);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [activeMatches, loading, pendingLiveMatchId]);

  const scrollToLiveMatch = () => {
    if (!liveMatchTarget) return;
    const targetIsVisible = activeMatches.some((match) => match.id === liveMatchTarget.id);

    if (!targetIsVisible) {
      setSelectedDate(liveMatchTarget.date);
      setSelectedSportId(undefined);
      setSelectedCategoryId(undefined);
    }
    setPendingLiveMatchId(liveMatchTarget.id);
  };

  return (
    <div className="schedule-page min-h-screen pb-20">
      <div className="mx-auto w-full max-w-[990px] px-3 pt-8 sm:px-3 sm:pt-10">
        <header className="text-center">
          <Link href="/" className="schedule-brand" aria-label="SportData - Trang chủ">
            <span className="schedule-brand-symbol">S</span>
            <span className="text-left">
              <strong>SPORTDATA</strong>
              <small>event technology</small>
            </span>
          </Link>
          <div className="mt-3 text-xs font-black tracking-[0.16em] text-sky-400">MATCH SCHEDULE</div>
          <h1 className="mx-auto mt-5 max-w-4xl text-xl font-black uppercase leading-tight text-slate-100 sm:text-2xl lg:text-[1.7rem]">
            {event?.name || 'Lịch thi đấu'}
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            <span>{totalMatches.toLocaleString()} total matches</span>
            <span className="mx-2 text-slate-600">·</span>
            <span>{dateGroups.length || 1} days</span>
            {(event?._count?.athletes ?? 0) > 0 && (
              <>
                <span className="mx-2 text-slate-600">·</span>
                <span>{event?._count?.athletes?.toLocaleString()} athletes</span>
              </>
            )}
          </p>
          {eventSports.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {eventSports.map((sport) => <Tag color="blue" key={sport.id}>{sport.name}</Tag>)}
            </div>
          )}
        </header>

        <div className="schedule-day-tabs mt-7 flex flex-wrap justify-center gap-2">
          {dateGroups.map((group) => {
            const active = group.date === (selectedDate || dateGroups[0]?.date);
            return (
              <Button
                key={group.date}
                type={active ? 'primary' : 'default'}
                shape="round"
                className={active ? 'schedule-day-active' : 'schedule-day-button'}
                onClick={() => setSelectedDate(group.date)}
              >
                {group.date} ({group.count.toLocaleString()})
              </Button>
            );
          })}
        </div>

        <div className="schedule-filter-bar mt-4 grid gap-3 sm:grid-cols-2">
          <Select
            allowClear
            size="large"
            placeholder="Tất cả bộ môn"
            value={selectedSportId}
            onChange={(value) => setSelectedSportId(value)}
            options={eventSports.map((sport) => ({ value: sport.id, label: sport.name }))}
          />
          <Select
            allowClear
            showSearch
            size="large"
            optionFilterProp="label"
            placeholder="Tất cả hạng cân / nội dung"
            value={selectedCategoryId}
            onChange={(value) => setSelectedCategoryId(value)}
            options={filteredCategories.map((category) => ({
              value: category.id,
              label: categoryLabel(category),
            }))}
          />
        </div>

        <main className="mt-5 space-y-5">
          {loading ? (
            <ScheduleSkeleton />
          ) : activeMatches.length ? (
            activeMatches.map((match) => (
              <MatchCard
                key={match.id}
                id={match.id}
                eventId={match.eventId}
                categoryId={match.categoryId}
                categoryName={match.category?.name}
                matchNumber={match.matchNumber}
                fop={match.fop}
                matchDate={match.matchDate}
                startTime={match.startTime}
                athlete1={match.athlete1}
                athlete2={match.athlete2}
                athlete1Score={match.athlete1Score}
                athlete2Score={match.athlete2Score}
                athlete1Advantages={match.athlete1Advantages}
                athlete2Advantages={match.athlete2Advantages}
                athlete1Penalties={match.athlete1Penalties}
                athlete2Penalties={match.athlete2Penalties}
                status={match.status}
                matchType={match.matchType}
                winnerId={match.winnerId}
                winMethod={match.winMethod}
                notes={match.notes}
              />
            ))
          ) : (
            <Card className="schedule-empty-card">
              <Empty
                image={<Trophy className="mx-auto h-12 w-12 text-slate-600" />}
                description="Chưa có trận đấu trong ngày này."
              />
            </Card>
          )}
        </main>
      </div>

      {hasLiveMatches && (
        <button
          type="button"
          className="schedule-live-float"
          onClick={scrollToLiveMatch}
          aria-label="Cuộn đến trận đang thi đấu"
          title="Xem trận đang thi đấu"
        >
          <Radio className="h-3.5 w-3.5" />
          LIVE
        </button>
      )}
    </div>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={index} className="schedule-match-card" styles={{ body: { padding: 20 } }}>
          <Skeleton active paragraph={{ rows: 2 }} />
        </Card>
      ))}
    </div>
  );
}
