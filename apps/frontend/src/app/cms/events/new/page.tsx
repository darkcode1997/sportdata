'use client';

import { CalendarPlus } from 'lucide-react';
import { EventForm } from '@/components/cms/EventForm';
import { CmsPageHeader } from '@/components/cms/CmsPageHeader';

export default function NewEventPage() {
  return <div className="mx-auto max-w-5xl space-y-6"><CmsPageHeader backHref="/cms/events" title="Tạo sự kiện" description="Thiết lập giải đấu, thời gian và trạng thái công khai." icon={<CalendarPlus className="h-6 w-6" />} /><EventForm /></div>;
}
