'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Spin } from 'antd';
import { StaffEventRegistration } from '@/components/StaffEventRegistration';
import { getParticipantToken, participantApi } from '@/lib/participant-auth';

export default function EventStaffRegistrationPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const { data, error } = useSWR<any>(ready && getParticipantToken() ? '/participant-auth/me' : null, url => participantApi.get(url).then(response => response.data));
  if (!ready || (!data && !error && getParticipantToken())) return <main className="grid min-h-[60vh] place-items-center"><Spin /></main>;
  if (!data) return <main className="mx-auto max-w-xl px-4 py-12"><Link href={`/account/login?next=${encodeURIComponent(`/events/${eventId}/staff`)}`} className="text-sky-400">Đăng nhập tài khoản SportData để đăng ký nhiệm vụ →</Link></main>;
  if (data.accountType === 'FEDERATION') return <main className="mx-auto max-w-xl px-4 py-12"><p>Nhân sự chuyên môn đăng ký bằng tài khoản cá nhân riêng.</p><Link href={`/events/${eventId}/register`}>Đăng ký danh sách đoàn →</Link></main>;
  return <StaffEventRegistration eventId={eventId} accountType={data.accountType} />;
}
