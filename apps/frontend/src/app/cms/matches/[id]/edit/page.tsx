'use client';

import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { Swords } from 'lucide-react';
import { MatchForm } from '@/components/cms/MatchForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { ErrorMessage } from '@/components/cms/AthleteForm';
import { fetcher } from '@/lib/api';
import { resolveCmsReturnTo } from '@/lib/cms-navigation';

export default function EditMatchPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = resolveCmsReturnTo(requestedReturnTo, '/cms/matches');
  const { data, error, isLoading } = useSWR(id ? `/matches/${id}` : null, fetcher);
  return <div className="mx-auto max-w-5xl space-y-6"><CmsPageHeader backHref={returnTo} backLabel={requestedReturnTo ? 'Quay lại sự kiện' : undefined} title="Chỉnh sửa trận đấu" description="Cập nhật lịch, trạng thái, tỷ số và người chiến thắng." icon={<Swords className="h-6 w-6" />} />{error ? <ErrorMessage message="Không thể tải trận đấu." /> : isLoading ? <Skeleton active paragraph={{ rows: 10 }} /> : <MatchForm matchId={id} initialData={data} returnTo={returnTo} />}</div>;
}
