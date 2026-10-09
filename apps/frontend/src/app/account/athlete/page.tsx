'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Alert, Spin } from 'antd';
import { AthleteAccountPage } from '@/components/AthleteAccountPage';
import { getParticipantToken, participantApi } from '@/lib/participant-auth';

export default function AthleteProfilePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const { data, error } = useSWR<any>(ready && getParticipantToken() ? '/participant-auth/me' : null, url => participantApi.get(url).then(response => response.data));
  if (!ready || (!data && !error && getParticipantToken())) return <main className="grid min-h-[60vh] place-items-center"><Spin /></main>;
  if (!data?.athlete || data.athlete.isArchived) return <main className="mx-auto max-w-xl px-4 py-12"><Alert showIcon type="info" message="Bạn chưa có hồ sơ vận động viên đang hoạt động" /><Link className="mt-4 block text-sky-400" href="/account">Đăng ký hồ sơ VĐV trong tài khoản →</Link></main>;
  return <AthleteAccountPage />;
}
