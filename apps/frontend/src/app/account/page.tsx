'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Alert, Spin } from 'antd';
import { AthleteAccountPage } from '@/components/AthleteAccountPage';
import { PersonalAccountPage } from '@/components/PersonalAccountPage';
import { getParticipantToken, setParticipantSession, participantApi } from '@/lib/participant-auth';
const authFetcher = (url: string) => participantApi.get(url).then(response => response.data);

export default function ParticipantAccountPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { data: profile, error, mutate } = useSWR<any>(ready && getParticipantToken() ? '/participant-auth/me' : null, authFetcher);
  useEffect(() => { setReady(true); if (!getParticipantToken()) router.replace('/account/login'); }, [router]);
  useEffect(() => {
    if (!profile) return;
    const token = getParticipantToken();
    if (token) setParticipantSession(token, { id: profile.id, email: profile.email, displayName: profile.displayName, accountType: profile.accountType, verificationStatus: profile.verificationStatus, federationId: profile.federationId });
    if (profile.accountType === 'FEDERATION') router.replace('/federation-account');
  }, [profile, router]);
  if (error) return <main className="mx-auto max-w-xl px-4 py-12"><Alert type="error" showIcon message="Không thể tải tài khoản SportData" /><Link href="/account/login">Đăng nhập lại</Link></main>;
  if (!profile || profile.accountType === 'FEDERATION') return <main className="grid min-h-[60vh] place-items-center"><Spin size="large" /></main>;
  return profile.accountType === 'ATHLETE' ? <AthleteAccountPage /> : <PersonalAccountPage profile={profile} refresh={() => mutate()} />;
}
