'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Alert, Button, Card, Empty, Select, Skeleton, Spin, Tag } from 'antd';
import { Radio, TicketCheck, Trophy } from 'lucide-react';
import { MatchCard } from '@/components/MatchCard';
import { fetcher } from '@/lib/api';
import { getParticipantAccount, getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';

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

interface ScheduleDate {
  date: string;
  count: number;
}

interface ScheduleSummary {
  dates: ScheduleDate[];
  total: number;
  liveMatch?: {
    id: string;
    date: string;
    categoryId: string;
    sportId: string;
  } | null;
}

interface MatchPage {
  items: Match[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}

interface EventFop {
  id: string;
  name: string;
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
  fops?: EventFop[];
  _count?: { matches?: number; athletes?: number };
  registrationEnabled?: boolean;
  registrationOpenAt?: string | null;
  registrationCloseAt?: string | null;
  registrationFee?: number;
  registrationCurrency?: string;
  paymentMode?: string;
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

function getRegistrationState(event: EventData) {
  const now = Date.now();
  const starts = new Date(event.startDate).getTime();
  const openAt = event.registrationOpenAt ? new Date(event.registrationOpenAt).getTime() : 0;
  const closeAt = event.registrationCloseAt ? new Date(event.registrationCloseAt).getTime() : starts;
  if (!event.registrationEnabled) return { open: false, label: 'Sự kiện chưa mở đăng ký' };
  if (now < openAt) return { open: false, label: `Mở đăng ký từ ${new Date(openAt).toLocaleString('vi-VN')}` };
  if (now > closeAt) return { open: false, label: 'Đã hết thời gian đăng ký' };
  return { open: true, label: `Nhận đăng ký đến ${new Date(closeAt).toLocaleString('vi-VN')}` };
}

export default function EventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { data: eventResponse, isLoading: eventLoading } = useSWR<EventData>(
    eventId ? `/events/${eventId}` : null,
    fetcher,
  );
  const { data: scheduleSummary, isLoading: summaryLoading } = useSWR<ScheduleSummary>(
    eventId ? `/matches/event/${eventId}/schedule-summary` : null,
    fetcher,
  );

  const event = eventResponse || (eventId === demoEvent.id ? demoEvent : undefined);
  const dateGroups = useMemo(() => scheduleSummary?.dates || [], [scheduleSummary?.dates]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [selectedSportId, setSelectedSportId] = useState<string>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedFopId, setSelectedFopId] = useState<string>();
  const [registrationCategoryId, setRegistrationCategoryId] = useState<string>();
  const [registrationMessage, setRegistrationMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [hasParticipantSession, setHasParticipantSession] = useState(false);
  const [participantAccountType, setParticipantAccountType] = useState<'ATHLETE' | 'FEDERATION'>('ATHLETE');

  useEffect(() => {
    const account = getParticipantAccount();
    setHasParticipantSession(Boolean(getParticipantToken()));
    if (account?.accountType === 'FEDERATION') setParticipantAccountType('FEDERATION');
  }, []);

  useEffect(() => {
    if (!dateGroups.length) return;
    if (!selectedDate || !dateGroups.some((group) => group.date === selectedDate)) {
      setSelectedDate(dateGroups[0].date);
    }
  }, [dateGroups, selectedDate]);

  const getMatchesKey = useCallback((pageIndex: number, previousPage: MatchPage | null) => {
    if (!eventId || !selectedDate) return null;
    if (previousPage && !previousPage.meta.hasMore) return null;

    const query = new URLSearchParams({
      eventId,
      date: selectedDate,
      pagination: 'cursor',
      limit: '50',
    });
    if (pageIndex > 0 && previousPage?.meta.nextCursor) {
      query.set('cursor', previousPage.meta.nextCursor);
    }
    if (selectedSportId) query.set('sportId', selectedSportId);
    if (selectedCategoryId) query.set('categoryId', selectedCategoryId);
    if (selectedFopId) query.set('fopId', selectedFopId);
    return `/matches?${query}`;
  }, [eventId, selectedCategoryId, selectedDate, selectedFopId, selectedSportId]);

  const {
    data: matchPages,
    isLoading: matchesLoading,
    isValidating: matchesValidating,
    setSize,
  } = useSWRInfinite<MatchPage>(getMatchesKey, fetcher, {
    persistSize: false,
    revalidateFirstPage: false,
  });
  const activeMatches = useMemo(() => {
    const uniqueMatches = new Map<string, Match>();
    matchPages?.forEach((page) => page.items.forEach((match) => uniqueMatches.set(match.id, match)));
    return Array.from(uniqueMatches.values());
  }, [matchPages]);
  const lastPage = matchPages?.[matchPages.length - 1];
  const hasMore = Boolean(lastPage?.meta.hasMore);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !matchesValidating) {
        setSize((currentSize) => currentSize + 1);
      }
    }, { rootMargin: '500px 0px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, matchesValidating, setSize]);

  const eventSports = event?.sports?.length ? event.sports : event?.sport ? [event.sport] : [];
  const eventCategories = useMemo<EventCategory[]>(() => {
    if (event?.categories?.length) return event.categories;
    const categoryMap = new Map<string, EventCategory>();
    activeMatches.forEach((match) => {
      const category = match.category;
      if (category) categoryMap.set(category.id, category);
    });
    return Array.from(categoryMap.values());
  }, [activeMatches, event?.categories]);
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

  const totalMatches = event?._count?.matches ?? scheduleSummary?.total ?? 0;
  const liveMatchTarget = scheduleSummary?.liveMatch;
  const [pendingLiveMatchId, setPendingLiveMatchId] = useState<string>();
  const hasLiveMatches = Boolean(liveMatchTarget);
  const loading = eventLoading
    || summaryLoading
    || Boolean(dateGroups.length && !selectedDate)
    || Boolean(selectedDate && !matchPages && matchesLoading);

  useEffect(() => {
    if (!pendingLiveMatchId || loading || matchesValidating) return;
    const liveMatchElement = document.getElementById(`match-${pendingLiveMatchId}`);
    if (!liveMatchElement) {
      if (hasMore) setSize((currentSize) => currentSize + 1);
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      liveMatchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      liveMatchElement.focus({ preventScroll: true });
      setPendingLiveMatchId(undefined);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [activeMatches, hasMore, loading, matchesValidating, pendingLiveMatchId, setSize]);

  const scrollToLiveMatch = () => {
    if (!liveMatchTarget) return;
    const targetIsVisible = activeMatches.some((match) => match.id === liveMatchTarget.id);

    if (!targetIsVisible) {
      setSelectedDate(liveMatchTarget.date);
      setSelectedSportId(undefined);
      setSelectedCategoryId(undefined);
      setSelectedFopId(undefined);
      setSize(1);
    }
    setPendingLiveMatchId(liveMatchTarget.id);
  };

  const registrationState = event ? getRegistrationState(event) : { open: false, label: '' };

  const register = async () => {
    if (!registrationCategoryId) {
      setRegistrationMessage({ type: 'error', text: 'Vui lòng chọn hạng đấu.' });
      return;
    }
    if (!getParticipantToken()) {
      setRegistrationMessage({ type: 'error', text: 'Vui lòng đăng nhập để dùng hồ sơ đã lưu, hoặc chọn đăng ký không cần tài khoản.' });
      return;
    }
    setRegistrationSubmitting(true);
    setRegistrationMessage(undefined);
    try {
      const { data } = await participantApi.post('/participant-auth/registrations', {
        eventId,
        categoryId: registrationCategoryId,
      });
      setRegistrationMessage({
        type: 'success',
        text: data.status === 'CONFIRMED'
          ? `Đăng ký đã được xác nhận. Mã vé: ${data.ticketCode}`
          : `Đã tiếp nhận hồ sơ ${data.ticketCode}. Giấy tờ đang chờ xác thực trước khi vé có hiệu lực.`,
      });
    } catch (requestError) {
      setRegistrationMessage({ type: 'error', text: participantError(requestError, 'Không thể đăng ký') });
    } finally {
      setRegistrationSubmitting(false);
    }
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
          <div className="mt-3 text-xs font-black tracking-[0.16em] text-sky-400">LỊCH THI ĐẤU</div>
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

        <Card className="mt-7 border-sky-400/20" title={<span className="flex items-center gap-2"><TicketCheck className="h-5 w-5 text-sky-400" />Đăng ký tham dự</span>} extra={<Tag color={registrationState.open ? 'success' : 'default'}>{registrationState.label}</Tag>}>
          {hasParticipantSession && participantAccountType === 'FEDERATION' ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-sky-400/20 bg-sky-500/5 p-4">
              <div><strong className="block">Đăng ký với tài khoản liên đoàn / CLB</strong><span className="mt-1 block text-sm text-slate-400">Gửi danh sách VĐV; thông tin đơn vị được khóa theo tài khoản đã duyệt.</span></div>
              <Link href={`/events/${eventId}/register?mode=group`}><Button type="primary" size="large">Đăng ký danh sách VĐV</Button></Link>
            </div>
          ) : hasParticipantSession ? (
            <div className="grid items-end gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Dùng hồ sơ tài khoản · Hạng đấu / nội dung</label>
                <Select
                  showSearch
                  optionFilterProp="label"
                  size="large"
                  className="w-full"
                  value={registrationCategoryId}
                  onChange={setRegistrationCategoryId}
                  placeholder="Chọn hạng đấu phù hợp"
                  options={eventCategories.map((category) => ({ value: category.id, label: categoryLabel(category) }))}
                />
              </div>
              <Button type="primary" size="large" disabled={!registrationState.open} loading={registrationSubmitting} onClick={register}>
                Gửi hồ sơ từ tài khoản
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400">
              <span>Bạn có thể đăng ký sự kiện mà không cần tài khoản SportData.</span>
              <Link href={`/account/login?next=${encodeURIComponent(`/events/${eventId}`)}`}><Button size="small">Đăng nhập để dùng hồ sơ đã lưu</Button></Link>
            </div>
          )}
          {participantAccountType !== 'FEDERATION' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href={`/events/${eventId}/register?mode=individual`}><Button block size="large" disabled={!registrationState.open}>Đăng ký không cần tài khoản</Button></Link>
              <Link href={`/events/${eventId}/register?mode=group`}><Button block size="large" disabled={!registrationState.open}>Đăng ký danh sách đội / CLB</Button></Link>
            </div>
          )}
          {registrationMessage && (
            <Alert
              className="mt-4"
              showIcon
              type={registrationMessage.type}
              message={registrationMessage.text}
              action={registrationMessage.type === 'success' ? <Link href="/account"><Button size="small">Xem vé</Button></Link> : undefined}
            />
          )}
        </Card>

        <div className="schedule-day-tabs mt-7 flex flex-wrap justify-center gap-2">
          {dateGroups.map((group) => {
            const active = group.date === (selectedDate || dateGroups[0]?.date);
            return (
              <Button
                key={group.date}
                type={active ? 'primary' : 'default'}
                shape="round"
                className={active ? 'schedule-day-active' : 'schedule-day-button'}
                onClick={() => {
                  setPendingLiveMatchId(undefined);
                  setSize(1);
                  setSelectedDate(group.date);
                }}
              >
                {group.date} ({group.count.toLocaleString()})
              </Button>
            );
          })}
        </div>

        <div className="schedule-filter-bar mt-4 grid gap-3 sm:grid-cols-3">
          <Select
            allowClear
            size="large"
            placeholder="Tất cả bộ môn"
            value={selectedSportId}
            onChange={(value) => {
              setPendingLiveMatchId(undefined);
              setSize(1);
              setSelectedSportId(value);
              setSelectedCategoryId(undefined);
            }}
            options={eventSports.map((sport) => ({ value: sport.id, label: sport.name }))}
          />
          <Select
            allowClear
            showSearch
            size="large"
            optionFilterProp="label"
            placeholder="Tất cả hạng cân / nội dung"
            value={selectedCategoryId}
            onChange={(value) => {
              setPendingLiveMatchId(undefined);
              setSize(1);
              setSelectedCategoryId(value);
            }}
            options={filteredCategories.map((category) => ({
              value: category.id,
              label: categoryLabel(category),
            }))}
          />
          <Select
            allowClear
            showSearch
            size="large"
            optionFilterProp="label"
            placeholder="Tất cả sân / FOP"
            value={selectedFopId}
            onChange={(value) => {
              setPendingLiveMatchId(undefined);
              setSize(1);
              setSelectedFopId(value);
            }}
            options={(event?.fops || []).map((fop) => ({ value: fop.id, label: fop.name }))}
          />
        </div>

        <main className="mt-5 space-y-5">
          {loading ? (
            <ScheduleSkeleton />
          ) : activeMatches.length ? (
            <>
              {activeMatches.map((match) => (
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
              ))}
              <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center py-3">
                {matchesValidating ? (
                  <Spin size="small" />
                ) : !hasMore ? (
                  <span className="text-xs font-medium text-slate-500">
                    Đã hiển thị toàn bộ {activeMatches.length.toLocaleString()} trận
                  </span>
                ) : null}
              </div>
            </>
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
          TRỰC TIẾP
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
