'use client';

import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { CalendarDays } from 'lucide-react';
import { EventForm } from '@/components/cms/EventForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { ErrorMessage } from '@/components/cms/AthleteForm';
import { fetcher } from '@/lib/api';
import { resolveCmsReturnTo } from '@/lib/cms-navigation';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = resolveCmsReturnTo(requestedReturnTo, '/cms/events');
  const { data, error, isLoading } = useSWR(
    id ? `/events/${id}/admin-detail` : null,
    fetcher,
  );
  return <div className="mx-auto max-w-5xl space-y-6"><CmsPageHeader backHref={returnTo} backLabel={requestedReturnTo ? 'Quay lại sự kiện' : undefined} title="Chỉnh sửa sự kiện" description="Cập nhật nội dung và lịch công khai." icon={<CalendarDays className="h-6 w-6" />} />{error ? <ErrorMessage message="Không thể tải sự kiện." /> : isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : <EventForm eventId={id} initialData={data} returnTo={returnTo} />}</div>;
}
