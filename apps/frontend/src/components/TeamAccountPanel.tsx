'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Card, Empty, Spin, Tag } from 'antd';
import { Download, Users } from 'lucide-react';
import { participantApi, participantError } from '@/lib/participant-auth';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type TeamProfile = {
  email: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  federation: { name: string };
  submissions: Array<{
    id: string;
    referenceCode: string;
    event: { name: string };
    registrations: Array<{ id: string }>;
  }>;
};

export function TeamAccountPanel() {
  const { data: profile, error, isLoading } = useSWR<TeamProfile>('/participant-auth/team/me', (url: string) => participantApi.get(url).then(({ data }) => data));
  const [downloading, setDownloading] = useState<string>();
  const toast = useSportDataToast();
  const downloadBatch = async (referenceCode: string) => {
    if (!profile) return;
    setDownloading(referenceCode);
    try {
      const { data } = await participantApi.post(`/participant-auth/submissions/${encodeURIComponent(referenceCode)}/tickets.pdf`, { contactEmail: profile.email }, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sportdata-${referenceCode}.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể tải bộ thẻ'));
    } finally {
      setDownloading(undefined);
    }
  };

  if (isLoading) return <Card className="mb-6"><Spin /></Card>;
  if (error || !profile) return <Card className="mb-6">Không thể tải thông tin đoàn. Vui lòng thử lại.</Card>;
  const approved = profile.verificationStatus === 'VERIFIED';
  return (
    <Card className="mb-6" title={`Trưởng đoàn · ${profile.federation.name}`} extra={<Tag color={approved ? 'success' : 'warning'}>{approved ? 'Đã duyệt đại diện đơn vị' : profile.verificationStatus === 'REJECTED' ? 'Đã từ chối' : 'Chờ duyệt đại diện đơn vị'}</Tag>}>
      <p className="mb-4 text-slate-400">Quản lý hồ sơ đăng ký và bộ thẻ của đoàn trong Tài khoản SportData.</p>
      {approved && <Link href="/events"><Button className="mb-4" type="primary" icon={<Users className="h-4 w-4" />}>Chọn sự kiện để đăng ký đoàn</Button></Link>}
      {profile.submissions.length ? <div className="space-y-3">{profile.submissions.map((submission) => (
        <div key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
          <div><strong>{submission.event.name}</strong><p className="text-sm text-slate-400">{submission.referenceCode} · {submission.registrations.length} thẻ</p></div>
          <Button loading={downloading === submission.referenceCode} icon={<Download className="h-4 w-4" />} onClick={() => void downloadBatch(submission.referenceCode)}>Tải bộ thẻ PDF</Button>
        </div>
      ))}</div> : <Empty description="Chưa có hồ sơ đăng ký theo đoàn" />}
    </Card>
  );
}
