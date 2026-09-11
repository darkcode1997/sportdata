'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Alert, Button, Card, Empty, Input, Segmented, Select, Skeleton, Tag } from 'antd';
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  RotateCcw,
  Search,
  Trophy,
  Users,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import { formatDateRange } from '@/lib/utils';

interface Sport {
  id: string;
  name: string;
  code: string;
}

interface SportResponse {
  data?: Sport[];
  items?: Sport[];
}

interface EventData {
  id: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  location?: string | null;
  sportId?: string | null;
  sport?: Sport | null;
  sports?: Sport[];
  totalMatches?: number;
  days?: number;
  _count?: { matches?: number; athletes?: number };
}

interface EventResponse {
  data?: EventData[];
  items?: EventData[];
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week';

const dateOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'tomorrow', label: 'Ngày mai' },
  { value: 'week', label: '7 ngày tới' },
];

const sportColors: Record<string, string> = {
  BOX: '#ef4444',
  JIU: '#38bdf8',
  JJA: '#38bdf8',
  JJAU: '#38bdf8',
  JUD: '#f43f5e',
  KAR: '#facc15',
  TKD: '#22c55e',
  WUS: '#e11d48',
  MMA: '#f97316',
  KIK: '#8b5cf6',
};

function unwrapItems<T>(response?: T[] | { data?: T[]; items?: T[] }) {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  return response.items || response.data || [];
}

function dayRange(filter: DateFilter) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (filter === 'tomorrow') {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else if (filter === 'week') {
    end.setDate(end.getDate() + 7);
  }
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function matchesDateFilter(event: EventData, filter: DateFilter) {
  if (filter === 'all') return true;
  const { start, end } = dayRange(filter);
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  eventEnd.setHours(23, 59, 59, 999);
  return eventStart <= end && eventEnd >= start;
}

function eventStatus(event: EventData) {
  const now = new Date();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  end.setHours(23, 59, 59, 999);
  if (now < start) return { label: 'Sắp diễn ra', color: 'processing' as const };
  if (now <= end) return { label: 'Đang diễn ra', color: 'error' as const };
  return { label: 'Đã kết thúc', color: 'default' as const };
}

function eventDays(event: EventData) {
  if (event.days) return event.days;
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function eventSports(event: EventData) {
  if (event.sports?.length) return event.sports;
  return event.sport ? [event.sport] : [];
}

function sportAccent(code?: string) {
  return sportColors[(code || '').toUpperCase()] || '#38bdf8';
}

export default function EventsPage() {
  const [sportId, setSportId] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const { data: sportResponse, isLoading: sportsLoading } = useSWR<Sport[] | SportResponse>(
    '/sports',
    fetcher,
  );
  const {
    data: eventResponse,
    error,
    isLoading: eventsLoading,
    mutate,
  } = useSWR<EventData[] | EventResponse>('/events?isPublished=true&limit=100', fetcher);

  const sports = useMemo(() => unwrapItems(sportResponse), [sportResponse]);
  const allEvents = useMemo(() => unwrapItems(eventResponse), [eventResponse]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const requestedId = parameters.get('sportId');
    const requestedCode = parameters.get('sportCode');
    if (requestedId) {
      setSportId(requestedId);
      return;
    }
    if (requestedCode && sports.length) {
      const matchingSport = sports.find(
        (sport) => sport.code.toUpperCase() === requestedCode.toUpperCase(),
      );
      if (matchingSport) setSportId(matchingSport.id);
    }
  }, [sports]);

  const filteredEvents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('vi');
    return allEvents.filter((event) => {
      const sportsForEvent = eventSports(event);
      const hasSport = !sportId
        || event.sportId === sportId
        || sportsForEvent.some((sport) => sport.id === sportId);
      const searchable = [
        event.name,
        event.description,
        event.location,
        ...sportsForEvent.map((sport) => `${sport.name} ${sport.code}`),
      ].filter(Boolean).join(' ').toLocaleLowerCase('vi');
      return hasSport
        && (!normalizedSearch || searchable.includes(normalizedSearch))
        && matchesDateFilter(event, dateFilter);
    });
  }, [allEvents, dateFilter, search, sportId]);

  const selectedSport = sports.find((sport) => sport.id === sportId);
  const hasFilters = Boolean(sportId || search || dateFilter !== 'all');
  const isLoading = (eventsLoading && !eventResponse) || (sportsLoading && !sportResponse);

  const selectSport = (id: string) => {
    setSportId(id);
    const url = new URL(window.location.href);
    url.searchParams.delete('sportCode');
    if (id) url.searchParams.set('sportId', id);
    else url.searchParams.delete('sportId');
    window.history.replaceState({}, '', url.toString());
  };

  const clearFilters = () => {
    setSearch('');
    setDateFilter('all');
    selectSport('');
  };

  return (
    <main className="schedule-page schedule-index-page min-h-screen pb-20">
      <div className="container-set mx-auto px-4 pt-7 sm:px-6 lg:px-8">
        <header className="schedule-heading">
          <div>
            <span className="schedule-eyebrow">
              <CalendarDays className="h-4 w-4" />
              Lịch thi đấu
            </span>
            <h1>Sự kiện thể thao</h1>
            <p>Theo dõi lịch giải, địa điểm và toàn bộ nội dung thi đấu.</p>
          </div>
          <div className="schedule-heading-stat">
            <strong>{allEvents.length}</strong>
            <span>Sự kiện công khai</span>
          </div>
        </header>

        <Card className="schedule-filter-card" styles={{ body: { padding: 0 } }}>
          <div className="schedule-sport-filter">
            <div className="schedule-filter-label">
              <Trophy className="h-4 w-4" />
              Bộ môn
            </div>
            <div className="schedule-sport-list" role="group" aria-label="Lọc theo bộ môn">
              <button
                type="button"
                className={`schedule-sport-pill ${!sportId ? 'is-active' : ''}`}
                onClick={() => selectSport('')}
                aria-pressed={!sportId}
              >
                <span className="schedule-sport-mark is-all"><Trophy className="h-4 w-4" /></span>
                <span>Tất cả</span>
              </button>
              {sports.map((sport) => {
                const active = sport.id === sportId;
                return (
                  <button
                    type="button"
                    key={sport.id}
                    className={`schedule-sport-pill ${active ? 'is-active' : ''}`}
                    onClick={() => selectSport(sport.id)}
                    aria-pressed={active}
                    style={{ '--sport-accent': sportAccent(sport.code) } as CSSProperties}
                  >
                    <span className="schedule-sport-mark">{sport.code.slice(0, 3)}</span>
                    <span>{sport.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-filter-toolbar">
            <Segmented
              block
              value={dateFilter}
              options={dateOptions}
              onChange={(value) => setDateFilter(value as DateFilter)}
              className="schedule-date-segmented"
            />
            <Input
              allowClear
              size="large"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              prefix={<Search className="h-4 w-4" />}
              placeholder="Tìm tên giải hoặc địa điểm"
              className="schedule-search"
            />
            <Select
              size="large"
              value={sportId}
              onChange={selectSport}
              className="schedule-sport-select"
              options={[
                { value: '', label: 'Tất cả bộ môn' },
                ...sports.map((sport) => ({ value: sport.id, label: sport.name })),
              ]}
            />
            {hasFilters && (
              <Button
                size="large"
                type="text"
                icon={<RotateCcw className="h-4 w-4" />}
                onClick={clearFilters}
                className="schedule-reset-button"
              >
                Đặt lại
              </Button>
            )}
          </div>
        </Card>

        <section className="schedule-results" aria-labelledby="schedule-results-title">
          <div className="schedule-results-heading">
            <div>
              <h2 id="schedule-results-title">
                {selectedSport ? `Giải đấu ${selectedSport.name}` : 'Tất cả sự kiện'}
              </h2>
              <p>{filteredEvents.length} sự kiện phù hợp</p>
            </div>
            {selectedSport && <Tag color="blue">{selectedSport.code}</Tag>}
          </div>

          {error && (
            <Alert
              showIcon
              type="error"
              message="Không thể tải lịch thi đấu"
              description="Vui lòng kiểm tra kết nối và thử lại."
              action={<Button onClick={() => mutate()}>Thử lại</Button>}
            />
          )}

          {isLoading ? (
            <div className="schedule-event-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="schedule-event-skeleton">
                  <Skeleton active paragraph={{ rows: 3 }} />
                </Card>
              ))}
            </div>
          ) : filteredEvents.length ? (
            <div className="schedule-event-list">
              {filteredEvents.map((event) => <EventRow key={event.id} event={event} />)}
            </div>
          ) : !error ? (
            <Card className="schedule-empty-card">
              <Empty
                image={<CalendarDays className="mx-auto h-12 w-12 text-slate-600" />}
                description="Không có sự kiện phù hợp với bộ lọc hiện tại."
              >
                <Button type="primary" onClick={clearFilters}>Xóa bộ lọc</Button>
              </Empty>
            </Card>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function EventRow({ event }: { event: EventData }) {
  const sports = eventSports(event);
  const primarySport = event.sport || sports[0];
  const status = eventStatus(event);
  const start = new Date(event.startDate);
  const totalMatches = event._count?.matches ?? event.totalMatches ?? 0;
  const totalAthletes = event._count?.athletes ?? 0;
  const accent = sportAccent(primarySport?.code);
  const month = new Intl.DateTimeFormat('vi-VN', { month: 'short' })
    .format(start)
    .replace('thg ', 'THG ')
    .toUpperCase();

  return (
    <Link
      href={`/events/${event.id}`}
      className="schedule-event-link"
      style={{ '--event-accent': accent } as CSSProperties}
    >
      <Card className="schedule-event-card" styles={{ body: { padding: 0 } }}>
        <div className="schedule-date-block">
          <span>{month}</span>
          <strong>{String(start.getDate()).padStart(2, '0')}</strong>
          <small>{start.getFullYear()}</small>
        </div>

        <div className="schedule-event-main">
          <div className="schedule-event-tags">
            {sports.map((sport) => (
              <span className="schedule-event-sport" key={sport.id}>{sport.code}</span>
            ))}
            <Tag bordered={false} color={status.color}>{status.label}</Tag>
          </div>
          <h3>{event.name}</h3>
          {event.description && <p>{event.description}</p>}
          <div className="schedule-event-meta">
            <span><CalendarDays className="h-4 w-4" />{formatDateRange(event.startDate, event.endDate)}</span>
            <span><Clock3 className="h-4 w-4" />{eventDays(event)} ngày</span>
            {event.location && <span><MapPin className="h-4 w-4" />{event.location}</span>}
          </div>
        </div>

        <div className="schedule-event-summary">
          <div className="schedule-event-metrics">
            <div><Trophy className="h-4 w-4" /><strong>{totalMatches.toLocaleString('vi-VN')}</strong><span>trận đấu</span></div>
            <div><Users className="h-4 w-4" /><strong>{totalAthletes.toLocaleString('vi-VN')}</strong><span>VĐV</span></div>
          </div>
          <span className="schedule-event-action">
            Xem lịch chi tiết
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
