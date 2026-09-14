'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Select, Spin } from 'antd';
import { fetcher } from '@/lib/api';

type AthleteOption = {
  id: string;
  fullName: string;
  country?: { id?: string; code?: string; name?: string } | null;
};

type RemoteAthleteSelectProps = {
  value?: string | string[];
  onChange?: (value: any) => void;
  mode?: 'multiple';
  eventId?: string;
  categoryId?: string;
  categoryIds?: string[];
  countryId?: string;
  initialOptions?: AthleteOption[];
  disabled?: boolean;
  placeholder?: string;
  autoSelectAll?: boolean;
  excludeIds?: string[];
  groupByCountry?: boolean;
  maxTagCount?: number | 'responsive';
  selectionLabel?: string;
  showPageControls?: boolean;
};

export function RemoteAthleteSelect({
  value,
  onChange,
  mode,
  eventId,
  categoryId,
  categoryIds = [],
  countryId,
  initialOptions = [],
  disabled,
  placeholder,
  autoSelectAll = false,
  excludeIds = [],
  groupByCountry = false,
  maxTagCount,
  selectionLabel = 'VĐV',
  showPageControls = false,
}: RemoteAthleteSelectProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [optionCache, setOptionCache] = useState<Record<string, AthleteOption>>(
    Object.fromEntries(initialOptions.map((athlete) => [athlete.id, athlete])),
  );
  const initializedKey = useRef('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const categoryIdsKey = categoryIds.join(',');

  useEffect(() => {
    setPage(1);
  }, [categoryId, categoryIdsKey, countryId, debouncedSearch, eventId]);

  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ limit: '50', page: String(page) });
    if (debouncedSearch) parameters.set('search', debouncedSearch);
    if (countryId) parameters.set('countryId', countryId);
    if (eventId && categoryId) {
      return `/events/${eventId}/categories/${categoryId}/eligible-athletes?${parameters}`;
    }
    if (categoryIdsKey) {
      parameters.set('categoryIds', categoryIdsKey);
      return `/athletes?${parameters}`;
    }
    if (eventId) {
      parameters.set('eventId', eventId);
      return `/athletes?${parameters}`;
    }
    return null;
  }, [categoryId, categoryIdsKey, countryId, debouncedSearch, eventId, page]);

  const { data, isLoading } = useSWR<any>(disabled ? null : endpoint, fetcher, {
    keepPreviousData: true,
  });
  const remoteAthletes: AthleteOption[] = data?.items || [];

  useEffect(() => {
    if (!remoteAthletes.length) return;
    setOptionCache((current) => ({
      ...current,
      ...Object.fromEntries(remoteAthletes.map((athlete) => [athlete.id, athlete])),
    }));
  }, [remoteAthletes]);

  useEffect(() => {
    if (!autoSelectAll || !endpoint || debouncedSearch || !remoteAthletes.length) return;
    if (initializedKey.current === endpoint) return;
    initializedKey.current = endpoint;
    const current = Array.isArray(value) ? value : [];
    if (!current.length && data?.total <= 50) {
      onChange?.(remoteAthletes.map((athlete) => athlete.id));
    }
  }, [autoSelectAll, data?.total, debouncedSearch, endpoint, onChange, remoteAthletes, value]);

  const excluded = new Set(excludeIds.filter(Boolean));
  const selectedIds = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const visibleAthletes = new Map<string, AthleteOption>();
  remoteAthletes.forEach((athlete) => visibleAthletes.set(athlete.id, athlete));
  Object.values(optionCache).forEach((athlete) => {
    if (selectedIds.has(athlete.id)) visibleAthletes.set(athlete.id, athlete);
  });
  initialOptions.forEach((athlete) => visibleAthletes.set(athlete.id, athlete));

  const flatOptions = Array.from(visibleAthletes.values())
    .filter((athlete) => !countryId || athlete.country?.id === countryId)
    .filter((athlete) => !excluded.has(athlete.id) || selectedIds.has(athlete.id))
    .map((athlete) => ({
      value: athlete.id,
      label: athlete.country?.code
        ? `${athlete.fullName} · ${athlete.country.code}`
        : athlete.fullName,
      countryLabel: [athlete.country?.name, athlete.country?.code].filter(Boolean).join(' · ') || 'Khác',
    }));
  const options: any[] = groupByCountry
    ? Array.from(new Set(flatOptions.map((option) => option.countryLabel))).map((countryLabel) => ({
        label: countryLabel,
        options: flatOptions
          .filter((option) => option.countryLabel === countryLabel)
          .map(({ countryLabel: _, ...option }) => option),
      }))
    : flatOptions.map(({ countryLabel: _, ...option }) => option);
  const selectedValues = Array.isArray(value) ? value : [];
  const visiblePageIds = remoteAthletes
    .map((athlete) => athlete.id)
    .filter((id) => !excluded.has(id));
  const selectedOnPage = visiblePageIds.filter((id) => selectedIds.has(id)).length;
  const totalPages = Math.max(1, data?.totalPages || 1);

  return (
    <div className="space-y-2">
      <Select
        mode={mode}
        allowClear
        showSearch
        filterOption={false}
        size="large"
        className="w-full"
        value={value || undefined}
        disabled={disabled || !endpoint}
        placeholder={placeholder}
        options={options}
        maxTagCount={mode === 'multiple' ? maxTagCount : undefined}
        maxTagTextLength={28}
        maxTagPlaceholder={mode === 'multiple'
          ? () => `Đã chọn ${selectedValues.length.toLocaleString()} ${selectionLabel}`
          : undefined}
        onSearch={setSearch}
        onChange={onChange}
        notFoundContent={isLoading ? <Spin size="small" /> : 'Không tìm thấy VĐV phù hợp'}
      />
      {showPageControls && mode === 'multiple' && endpoint && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>{(data?.total || 0).toLocaleString()} VĐV phù hợp</span>
          <span className="text-slate-600">·</span>
          <button
            type="button"
            className="text-sky-400 disabled:text-slate-600"
            disabled={!visiblePageIds.length || selectedOnPage === visiblePageIds.length}
            onClick={() => onChange?.(Array.from(new Set([...selectedValues, ...visiblePageIds])))}
          >
            Chọn trang này
          </button>
          <button
            type="button"
            className="text-slate-400 disabled:text-slate-600"
            disabled={!selectedOnPage}
            onClick={() => {
              const pageIds = new Set(visiblePageIds);
              onChange?.(selectedValues.filter((id) => !pageIds.has(id)));
            }}
          >
            Bỏ chọn trang
          </button>
          <span className="ml-auto">Trang {page}/{totalPages}</span>
          <button
            type="button"
            className="text-sky-400 disabled:text-slate-600"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Trước
          </button>
          <button
            type="button"
            className="text-sky-400 disabled:text-slate-600"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
}
