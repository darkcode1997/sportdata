'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { CalendarDays } from 'lucide-react';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { EventWorkspace } from '@/components/cms/EventWorkspace';
import { ErrorMessage } from '@/components/cms/AthleteForm';
import { fetcher } from '@/lib/api';

export default function EventWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, error, isLoading, mutate } = useSWR<any>(
    id ? `/events/${id}/admin-detail` : null,
    fetcher,
  );

  return (
    <div className="space-y-6">
      <CmsPageHeader
        backHref="/cms/events"
        title={event?.name || 'Quản lý sự kiện'}
        description="Đăng ký, vé A6, payment, trận đấu và thể thức được quản lý tập trung theo sự kiện."
        icon={<CalendarDays className="h-6 w-6" />}
      />
      {error ? (
        <ErrorMessage message="Không thể tải workspace sự kiện." />
      ) : isLoading || !event ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <EventWorkspace event={event} onRefresh={() => mutate()} />
      )}
    </div>
  );
}
