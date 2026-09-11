'use client';

import { UserPlus } from 'lucide-react';
import { AthleteForm } from '@/components/cms/AthleteForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

export default function NewAthletePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <CmsPageHeader backHref="/cms/athletes" title="Thêm vận động viên" description="Tạo hồ sơ mới để sử dụng trong lịch thi đấu và bảng thành tích." icon={<UserPlus className="h-6 w-6" />} />
      <AthleteForm />
    </div>
  );
}
