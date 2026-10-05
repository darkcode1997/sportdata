'use client';

import { useParams, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton, Tabs } from 'antd';
import { Medal, UserRound } from 'lucide-react';
import { AthleteForm, ErrorMessage } from '@/components/cms/AthleteForm';
import { AthleteCompetitionHistory } from '@/components/cms/AthleteCompetitionHistory';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { fetcher } from '@/lib/api';
import { resolveCmsReturnTo } from '@/lib/cms-navigation';

export default function EditAthletePage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo');
  const returnTo = resolveCmsReturnTo(requestedReturnTo, '/cms/athletes');
  const { data, error, isLoading } = useSWR(id ? `/athletes/${id}` : null, fetcher);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CmsPageHeader backHref={returnTo} backLabel={requestedReturnTo ? 'Quay lại đăng ký thi đấu' : undefined} title="Chỉnh sửa vận động viên" description="Cập nhật hồ sơ và thông tin thi đấu." icon={<UserRound className="h-6 w-6" />} />
      {error ? <ErrorMessage message="Không thể tải hồ sơ vận động viên." /> : isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : (
        <Tabs
          size="large"
          items={[
            {
              key: 'profile',
              label: <span className="flex items-center gap-2"><UserRound className="h-4 w-4" />Hồ sơ VĐV</span>,
              children: <AthleteForm athleteId={id} initialData={data} returnTo={returnTo} />,
            },
            {
              key: 'competition-history',
              label: <span className="flex items-center gap-2"><Medal className="h-4 w-4" />Sự kiện & thành tích</span>,
              children: <AthleteCompetitionHistory athleteId={id} athlete={data} />,
            },
          ]}
        />
      )}
    </div>
  );
}
