'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Select, Spin } from 'antd';
import { fetcher } from '@/lib/api';

type AthleteOption = {
  id: string;
  fullName: string;
  country?: { code?: string; name?: string } | null;
};

type RemoteAthleteSelectProps = {
  value?: string | string[];
  onChange?: (value: any) => void;
  mode?: 'multiple';
  eventId?: string;
  categoryId?: string;
  categoryIds?: string[];
  initialOptions?: AthleteOption[];
  disabled?: boolean;
  placeholder?: string;
  autoSelectAll?: boolean;
  excludeIds?: string[];
};

export function RemoteAthleteSelect({
  value,
  onChange,
  mode,
  eventId,
  categoryId,
  categoryIds = [],
  initialOptions = [],
  disabled,
  placeholder,
  autoSelectAll = false,
  excludeIds = [],
}: RemoteAthleteSelectProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [optionCache, setOptionCache] = useState<Record<string, AthleteOption>>(
    Object.fromEntries(initialOptions.map((athlete) => [athlete.id, athlete])),
  );
  const initializedKey = useRef('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const endpoint = useMemo(() => {
    const parameters = new URLSearchParams({ limit: '50', page: '1' });
    if (debouncedSearch) parameters.set('search', debouncedSearch);
    if (eventId && categoryId) {
      return `/events/${eventId}/categories/${categoryId}/eligible-athletes?${parameters}`;
    }
    if (categoryIds.length) {
      parameters.set('categoryIds', categoryIds.join(','));
      return `/athletes?${parameters}`;
    }
    if (eventId) {
      parameters.set('eventId', eventId);
      return `/athletes?${parameters}`;
    }
    return null;
  }, [categoryId, categoryIds, debouncedSearch, eventId]);

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
  const options = Object.values(optionCache)
    .filter((athlete) => !excluded.has(athlete.id) || selectedIds.has(athlete.id))
    .map((athlete) => ({
      value: athlete.id,
      label: athlete.country?.code
        ? `${athlete.fullName} · ${athlete.country.code}`
        : athlete.fullName,
    }));

  return (
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
      onSearch={setSearch}
      onChange={onChange}
      notFoundContent={isLoading ? <Spin size="small" /> : 'Không tìm thấy VĐV phù hợp'}
    />
  );
}
