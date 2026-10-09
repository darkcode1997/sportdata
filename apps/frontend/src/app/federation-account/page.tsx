'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Alert, Button, Card, Empty, Spin, Statistic, Tag } from 'antd';
import { Building2, CalendarDays, Download, MapPin, TicketCheck, Users } from 'lucide-react';
import { getParticipantAccount, getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';
import { useSportDataToast } from '@/hooks/useSportDataToast';

type FederationProfile = {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  representativePosition?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  federation: {
    id: string;
    name: string;
    code?: string | null;
    type: string;
    country: { code: string; name: string };
    _count: { athletes: number; participatingEvents: number };
  };
  submissions: Array<{
    id: string;
    referenceCode: string;
    createdAt: string;
    event: { id: string; name: string; startDate: string; location?: string | null };
    registrations: Array<{ id: string; ticketCode: string; status: string; athlete: { fullName: string } }>;
  }>;
};

const authFetcher = (url: string) => participantApi.get(url).then((response) => response.data);

export default function FederationAccountPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const session = getParticipantAccount();
  const { data: profile, error, isLoading } = useSWR<FederationProfile>(getParticipantToken() ? '/participant-auth/federation/me' : null, authFetcher);
  const [downloading, setDownloading] = useState<string>();

  useEffect(() => {
    if (!getParticipantToken()) router.replace('/account/login');
    else if (session?.accountType && !['FEDERATION', 'TEAM_LEADER'].includes(session.accountType)) router.replace('/account');
  }, [router, session?.accountType]);

  useEffect(() => {
    if (error?.response?.status === 401 || error?.response?.status === 403) router.replace('/account/login');
  }, [error, router]);

  const downloadBatch = async (referenceCode: string) => {
    if (!profile) return;
    setDownloading(referenceCode);
    try {
      const response = await participantApi.post(
        `/participant-auth/submissions/${encodeURIComponent(referenceCode)}/tickets.pdf`,
        { contactEmail: profile.email },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sportdata-${referenceCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể tải bộ vé'));
    } finally {
      setDownloading(undefined);
    }
  };

  if (isLoading || !profile) return <main className="grid min-h-[60vh] place-items-center"><Spin size="large" /></main>;
  const approved = profile.verificationStatus === 'VERIFIED';

  return (
    <main className="federation-account-page min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sky-500/15 text-sky-400"><Building2 className="h-8 w-8" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-400">Tài khoản đơn vị</p>
              <h1 className="mt-1 text-3xl font-black text-white">{profile.federation.name}</h1>
              <p className="mt-1 text-sm text-slate-400">Đại diện: {profile.displayName} · {profile.representativePosition}</p>
            </div>
          </div>
          <Tag color={approved ? 'success' : profile.verificationStatus === 'REJECTED' ? 'error' : 'processing'}>
            {approved ? 'Đã được SportData duyệt' : profile.verificationStatus === 'REJECTED' ? 'Yêu cầu bị từ chối' : 'Chờ SportData duyệt'}
          </Tag>
        </header>
        <Link href="/account/email-preferences" className="mb-6 inline-block text-sm text-sky-400">Quản lý email sự kiện và tin tức →</Link>

        {!approved && (
          <Alert
            className="mb-6"
            showIcon
            type={profile.verificationStatus === 'REJECTED' ? 'error' : 'warning'}
            message={profile.verificationStatus === 'REJECTED' ? 'Tài khoản chưa được chấp thuận' : 'SportData đang xác minh người đại diện'}
            description="Bạn có thể xem thông tin tài khoản, nhưng chỉ được gửi danh sách VĐV sau khi SportData xác nhận quyền đại diện đơn vị."
          />
        )}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card><Statistic title="Vận động viên thuộc đơn vị" value={profile.federation._count.athletes} prefix={<Users className="h-5 w-5" />} /></Card>
          <Card><Statistic title="Sự kiện được mời" value={profile.federation._count.participatingEvents} prefix={<CalendarDays className="h-5 w-5" />} /></Card>
          <Card><Statistic title="Hồ sơ đã gửi" value={profile.submissions.length} prefix={<TicketCheck className="h-5 w-5" />} /></Card>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-2xl font-black text-white">Hồ sơ đăng ký theo đoàn</h2><p className="mt-1 text-sm text-slate-400">Mỗi VĐV vẫn có mã vé và QR độc lập.</p></div>
          {approved && <Link href="/events"><Button type="primary" size="large" icon={<Users className="h-4 w-4" />}>Chọn sự kiện để đăng ký đoàn</Button></Link>}
        </div>

        {profile.submissions.length ? (
          <div className="space-y-4">
            {profile.submissions.map((submission) => (
              <Card key={submission.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><strong className="text-base">{submission.event.name}</strong><Tag>{submission.referenceCode}</Tag></div>
                    <p className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{new Date(submission.event.startDate).toLocaleDateString('vi-VN')}</span>
                      {submission.event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{submission.event.location}</span>}
                      <span>{submission.registrations.length} VĐV</span>
                    </p>
                  </div>
                  <Button loading={downloading === submission.referenceCode} icon={<Download className="h-4 w-4" />} onClick={() => void downloadBatch(submission.referenceCode)}>Tải bộ vé PDF</Button>
                </div>
              </Card>
            ))}
          </div>
        ) : <Card><Empty description={approved ? 'Chưa có hồ sơ đăng ký theo đoàn' : 'Chưa thể gửi hồ sơ khi tài khoản đang chờ duyệt'} /></Card>}
      </div>
    </main>
  );
}
