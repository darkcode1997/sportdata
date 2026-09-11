'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Skeleton } from 'antd';
import { UserRound } from 'lucide-react';
import { AthleteForm, ErrorMessage } from '@/components/cms/AthleteForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';
import { fetcher } from '@/lib/api';

export default function EditAthletePage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR(id ? `/athletes/${id}` : null, fetcher);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CmsPageHeader backHref="/cms/athletes" title="Chỉnh sửa vận động viên" description="Cập nhật hồ sơ và thông tin thi đấu." icon={<UserRound className="h-6 w-6" />} />
      {error ? <ErrorMessage message="Không thể tải hồ sơ vận động viên." /> : isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : <AthleteForm athleteId={id} initialData={data} />}
    </div>
  );
}
