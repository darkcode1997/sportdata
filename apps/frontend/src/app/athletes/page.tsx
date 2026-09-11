'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Card, Empty, Input, Select, Skeleton, Tag } from 'antd';
import {
  Search,
  Filter,
  Users,
  Trophy,
  Swords,
  MapPin,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import { calculateAge, cn } from '@/lib/utils';

interface Country {
  id?: string;
  code?: string;
  name?: string;
  flagUrl?: string | null;
}

interface Federation {
  id?: string;
  name?: string;
}

interface Stat {
  totalWins?: number;
  totalLosses?: number;
  totalMatches?: number;
  goldMedals?: number;
  silverMedals?: number;
  bronzeMedals?: number;
}

interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender?: 'MALE' | 'FEMALE' | 'MIXED';
  birthDate?: string | null;
  weight?: number | null;
  height?: number | null;
  country?: Country | null;
  federation?: Federation | null;
  photoUrl?: string | null;
  categories?: { id: string; name: string; sport?: { id: string; name: string } }[];
  statistics?: Stat[];
}

interface Sport {
  id: string;
  name: string;
  code: string;
}

interface Category {
  id: string;
  name: string;
  sportId: string;
  gender?: string;
}

export default function AthletesPage() {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.append('search', search);
    if (countryFilter) p.append('countryId', countryFilter);
    if (sportFilter) p.append('sportId', sportFilter);
    if (categoryFilter) p.append('categoryId', categoryFilter);
    if (genderFilter) p.append('gender', genderFilter);
    p.append('limit', '50');
    return `/athletes?${p.toString()}`;
  }, [search, countryFilter, sportFilter, categoryFilter, genderFilter]);

  const { data: sports } = useSWR<{ data?: Sport[] } | Sport[]>('/sports', fetcher);
  const { data: countries } = useSWR<{ data?: Country[] } | Country[]>('/countries', fetcher);
  const { data: categories } = useSWR<{ data?: Category[] } | Category[]>(
    sportFilter ? `/categories?sportId=${sportFilter}` : null,
    fetcher
  );
  const { data, isLoading } = useSWR<{ data?: Athlete[]; items?: Athlete[] } | Athlete[]>(
    query,
    fetcher
  );

  const athletes = useMemo(() => {
    return (Array.isArray(data) ? data : data?.data || data?.items || []) as Athlete[];
  }, [data]);
  const sportsList = (Array.isArray(sports) ? sports : sports?.data || []) as Sport[];
  const countriesList = (Array.isArray(countries) ? countries : countries?.data || []) as Country[];
  const catsList = (Array.isArray(categories) ? categories : categories?.data || []) as Category[];

  const hasFilters = search || countryFilter || sportFilter || categoryFilter || genderFilter;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Vận động viên</h1>
        <p className="text-slate-400">Tra cứu hồ sơ, quốc gia thi đấu và thành tích của từng vận động viên.</p>
      </div>

      <Card className="public-surface" styles={{ body: { padding: 16 } }}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <Input
              size="large"
              allowClear
              prefix={<Search className="h-4 w-4 text-slate-400" />}
              placeholder="Tìm theo tên vận động viên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
            <Select
              size="large"
              value={countryFilter}
              onChange={setCountryFilter}
              className="min-w-[165px]"
              options={[
                { value: '', label: 'Tất cả quốc gia' },
                ...countriesList.map((country) => ({
                  value: country.id || country.code || '',
                  label: `${country.code ? `${country.code} · ` : ''}${country.name}`,
                })),
              ]}
            />
            <Select
              size="large"
              value={sportFilter}
              onChange={(value) => {
                setSportFilter(value);
                setCategoryFilter('');
              }}
              className="min-w-[165px]"
              options={[
                { value: '', label: 'Tất cả bộ môn' },
                ...sportsList.map((sport) => ({ value: sport.id, label: sport.name })),
              ]}
            />
            {sportFilter && (
              <Select
                size="large"
                value={categoryFilter}
                onChange={setCategoryFilter}
                className="min-w-[165px]"
                options={[
                  { value: '', label: 'Tất cả hạng đấu' },
                  ...catsList.map((category) => ({ value: category.id, label: category.name })),
                ]}
              />
            )}
            <Select
              size="large"
              value={genderFilter}
              onChange={setGenderFilter}
              className="min-w-[145px]"
              options={[
                { value: '', label: 'Mọi giới tính' },
                { value: 'MALE', label: 'Nam' },
                { value: 'FEMALE', label: 'Nữ' },
                { value: 'MIXED', label: 'Hỗn hợp' },
              ]}
            />
            {hasFilters && (
              <Button
                size="large"
                onClick={() => {
                  setSearch('');
                  setCountryFilter('');
                  setSportFilter('');
                  setCategoryFilter('');
                  setGenderFilter('');
                }}
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="public-surface min-h-64">
              <Skeleton active avatar paragraph={{ rows: 4 }} />
            </Card>
          ))}
        </div>
      ) : athletes.length === 0 ? (
        <Card className="public-surface">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không tìm thấy vận động viên. Hãy thử thay đổi từ khóa hoặc bộ lọc." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {athletes.map((a) => (
            <AthleteCard key={a.id} athlete={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function AthleteCard({ athlete }: { athlete: Athlete }) {
  const stat = athlete.statistics?.[0];
  const totalMedals = (stat?.goldMedals || 0) + (stat?.silverMedals || 0) + (stat?.bronzeMedals || 0);
  const winRate =
    stat && stat.totalMatches ? Math.round((stat.totalWins / stat.totalMatches) * 100) : 0;
  const age = calculateAge(athlete.birthDate);

  return (
    <Link href={`/athletes/${athlete.id}`} className="group block h-full">
      <Card hoverable className="public-surface h-full overflow-hidden" styles={{ body: { padding: 0 } }}>
      <div className="relative h-28 bg-gradient-to-br from-sblue-600/30 via-sdark-800 to-sdark-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,166,240,0.15),transparent_60%)]" />
        {athlete.country?.flagUrl && (
          <div className="absolute top-3 right-3 overflow-hidden rounded-md border border-sdark-700">
            <Image
              src={athlete.country.flagUrl}
              alt={athlete.country.code || athlete.country.name || ''}
              width={36}
              height={24}
              className="w-9 h-6 object-cover"
            />
          </div>
        )}
      </div>
      <div className="px-4 pb-4 -mt-10 flex-1 flex flex-col relative">
        <div className="w-20 h-20 rounded-2xl bg-sdark-800 border-4 border-sdark-900 overflow-hidden shadow-xl mx-auto relative z-10">
          {athlete.photoUrl ? (
            <Image
              src={athlete.photoUrl}
              alt={athlete.fullName}
              fill
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sblue-500 to-sblue-700 flex items-center justify-center text-xl font-bold text-white">
              {athlete.fullName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
          )}
        </div>
        <div className="mt-3 text-center">
          <h3 className="font-bold text-white group-hover:text-sblue-400 transition-colors">
            {athlete.fullName}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
            {athlete.country?.name && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {athlete.country.name}
              </span>
            )}
            {age > 0 && <span>· {age} tuổi</span>}
            {athlete.weight && <span>· {athlete.weight}kg</span>}
          </div>
          {athlete.federation?.name && (
            <div className="mt-1 text-xs text-slate-500 flex items-center justify-center gap-1">
              <Building2 className="w-3 h-3" />
              <span className="truncate">{athlete.federation.name}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-sdark-700/70 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1">
              <Swords className="w-3.5 h-3.5 text-slate-400" />
              {stat?.totalMatches ?? 0}
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Trận
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-400">{stat?.totalWins ?? 0}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Thắng
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-sblue-400">{winRate}%</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Tỷ lệ thắng
            </div>
          </div>
        </div>

        {totalMedals > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {stat?.goldMedals ? (
              <span className="inline-flex items-center gap-1 sd-chip bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                <Trophy className="w-3 h-3" />
                {stat.goldMedals}
              </span>
            ) : null}
            {stat?.silverMedals ? (
              <span className="inline-flex items-center gap-1 sd-chip bg-slate-400/15 text-slate-300 border border-slate-400/30">
                <Trophy className="w-3 h-3" />
                {stat.silverMedals}
              </span>
            ) : null}
            {stat?.bronzeMedals ? (
              <span className="inline-flex items-center gap-1 sd-chip bg-amber-600/15 text-amber-500 border border-amber-600/30">
                <Trophy className="w-3 h-3" />
                {stat.bronzeMedals}
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-center text-xs text-slate-500 group-hover:text-sblue-400 transition-colors">
          Xem hồ sơ <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
      </Card>
    </Link>
  );
}
