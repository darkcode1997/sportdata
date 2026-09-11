'use client';

import { Swords } from 'lucide-react';
import { MatchForm } from '@/components/cms/MatchForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

export default function NewMatchPage() {
  return <div className="mx-auto max-w-5xl space-y-6"><CmsPageHeader backHref="/cms/matches" title="Tạo trận đấu" description="Xếp lịch, chọn vận động viên và cập nhật kết quả." icon={<Swords className="h-6 w-6" />} /><MatchForm /></div>;
}
