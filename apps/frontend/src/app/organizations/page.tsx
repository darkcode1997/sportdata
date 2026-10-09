'use client';

import { ToastNotice } from '@/components/ToastNotice';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Empty, Input, Select, Skeleton, Tag } from 'antd';
import { ArrowRight, Building2, CalendarDays, Flag, Search, Users } from 'lucide-react';
import { fetcher } from '@/lib/api';

type Country = {
  id: string;
  code: string;
  name: string;
  flagUrl?: string | null;
  _count?: { athletes?: number; federations?: number; teams?: number; entries?: number };
};

type Organization = {
  id: string;
  code?: string | null;
  name: string;
  type: string;
  countryId: string;
  country: Country;
  _count?: { athletes?: number; organizedEvents?: number; participatingEvents?: number };
};

const typeLabels: Record<string, string> = {
  INTERNATIONAL_FEDERATION: 'Liên đoàn quốc tế',
  NATIONAL_FEDERATION: 'Liên đoàn quốc gia',
  SPORTS_CENTER: 'Trung tâm thể thao',
  CLUB: 'Câu lạc bộ',
  SCHOOL: 'Trường học',
  ACADEMY: 'Học viện',
  OTHER: 'Đơn vị khác',
};

export default function OrganizationsDirectoryPage() {
  const [search, setSearch] = useState('');
  const [countryId, setCountryId] = useState('');
  const [type, setType] = useState('');
  const organizationsQuery = useSWR<Organization[]>('/federations', fetcher);
  const countriesQuery = useSWR<Country[]>('/countries', fetcher);
  const organizations = useMemo(
    () => Array.isArray(organizationsQuery.data) ? organizationsQuery.data : [],
    [organizationsQuery.data],
  );
  const countries = useMemo(
    () => Array.isArray(countriesQuery.data) ? countriesQuery.data : [],
    [countriesQuery.data],
  );

  const filteredOrganizations = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return organizations.filter((organization) => {
      const searchable = [organization.name, organization.code, organization.country?.name, organization.country?.code]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('vi');
      return (!countryId || organization.countryId === countryId)
        && (!type || organization.type === type)
        && (!keyword || searchable.includes(keyword));
    });
  }, [countryId, organizations, search, type]);

  const loading = organizationsQuery.isLoading || countriesQuery.isLoading;
  const error = organizationsQuery.error || countriesQuery.error;

  return (
    <main className="directory-page min-h-screen pb-20">
      <div className="container-set mx-auto px-4 pt-10 sm:px-6 lg:px-8">
        <header className="directory-hero">
          <div>
            <span className="directory-eyebrow"><Building2 className="h-4 w-4" /> Mạng lưới thể thao</span>
            <h1>Liên đoàn, đơn vị và quốc gia</h1>
            <p>Tra cứu các tổ chức đang điều hành, tham gia và đóng góp dữ liệu cho hệ sinh thái sự kiện thể thao.</p>
          </div>
          <div className="directory-hero-stats">
            <div><strong>{organizations.length}</strong><span>Đơn vị</span></div>
            <div><strong>{countries.length}</strong><span>Quốc gia</span></div>
          </div>
        </header>

        <section className="directory-country-strip" aria-labelledby="countries-heading">
          <div className="directory-strip-heading">
            <div><span className="directory-eyebrow"><Flag className="h-4 w-4" /> Quốc gia</span><h2 id="countries-heading">Hệ sinh thái đang kết nối</h2></div>
            {countryId && <Button type="link" onClick={() => setCountryId('')}>Hiển thị tất cả</Button>}
          </div>
          <div className="directory-country-list">
            {countries.map((country) => (
              <button
                key={country.id}
                type="button"
                className={countryId === country.id ? 'is-active' : ''}
                onClick={() => setCountryId((current) => current === country.id ? '' : country.id)}
              >
                <span className="directory-country-flag">
                  {country.flagUrl ? (
                    // Flags are configured by administrators.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={country.flagUrl} alt={`Cờ ${country.name}`} />
                  ) : country.code.slice(0, 2)}
                </span>
                <span><strong>{country.name}</strong><small>{country._count?.federations || 0} đơn vị · {country._count?.athletes || 0} VĐV</small></span>
              </button>
            ))}
          </div>
        </section>

        <div className="directory-toolbar directory-toolbar-organizations">
          <Input
            allowClear
            size="large"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            prefix={<Search className="h-4 w-4" />}
            placeholder="Tìm tên hoặc mã đơn vị"
          />
          <Select
            size="large"
            value={countryId}
            onChange={setCountryId}
            options={[{ value: '', label: 'Tất cả quốc gia' }, ...countries.map((country) => ({ value: country.id, label: `${country.code} · ${country.name}` }))]}
          />
          <Select
            size="large"
            value={type}
            onChange={setType}
            options={[{ value: '', label: 'Tất cả loại đơn vị' }, ...Object.entries(typeLabels).map(([value, label]) => ({ value, label }))]}
          />
        </div>

        {error && <ToastNotice showIcon type="error" message="Không thể tải mạng lưới đơn vị thể thao" />}

        {loading ? (
          <div className="directory-grid">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton.Node key={index} active className="directory-skeleton" />)}
          </div>
        ) : filteredOrganizations.length ? (
          <section className="directory-grid" aria-label="Danh sách đơn vị thể thao">
            {filteredOrganizations.map((organization) => (
              <article key={organization.id} className="directory-card organization-card">
                <div className="directory-card-heading">
                  <span className="directory-card-logo"><Building2 className="h-7 w-7" /></span>
                  <div>
                    <Tag color="cyan">{organization.code || organization.country?.code || 'ORG'}</Tag>
                    <h2>{organization.name}</h2>
                  </div>
                </div>
                <p className="organization-type">{typeLabels[organization.type] || 'Đơn vị thể thao'} · {organization.country?.name}</p>
                <div className="directory-card-metrics">
                  <span><CalendarDays className="h-4 w-4" /><strong>{organization._count?.organizedEvents || 0}</strong> sự kiện tổ chức</span>
                  <span><Users className="h-4 w-4" /><strong>{organization._count?.athletes || 0}</strong> VĐV</span>
                </div>
                <div className="organization-actions">
                  <Link href={`/events?organizerId=${organization.id}`} className="directory-card-action">Sự kiện tổ chức <ArrowRight className="h-4 w-4" /></Link>
                  <Link href={`/events?countryId=${organization.countryId}`} className="organization-country-link">Sự kiện {organization.country?.name}</Link>
                </div>
              </article>
            ))}
          </section>
        ) : !error ? (
          <div className="directory-empty"><Empty description="Không tìm thấy đơn vị phù hợp" /></div>
        ) : null}
      </div>
    </main>
  );
}
