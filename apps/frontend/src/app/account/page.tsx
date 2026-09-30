'use client';

import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Alert, Avatar, Button, Card, Empty, Segmented, Spin, Tag, Upload } from 'antd';
import { Camera, CreditCard, FileCheck2, ImagePlus, LogOut, TicketCheck, UploadCloud, UserRound } from 'lucide-react';
import { clearParticipantSession, getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';

type MediaType = 'AVATAR' | 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT';
type UploadRequestOption = Parameters<NonNullable<ComponentProps<typeof Upload>['customRequest']>>[0];
type Profile = {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  athlete: {
    id: string;
    fullName: string;
    birthDate?: string | null;
    gender: string;
    weight?: number | null;
    photoUrl?: string | null;
    country: { name: string; code: string };
    federation?: { name: string } | null;
    media: { type: MediaType; size: number; updatedAt: string }[];
  };
};
type Registration = {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: string;
  feeAmount: number;
  currency: string;
  createdAt: string;
  event: { id: string; name: string; startDate: string; location?: string; sport?: { name: string } };
  category: { name: string };
};

const authFetcher = (url: string) => participantApi.get(url).then((response) => response.data);
const mediaLabels: Record<MediaType, string> = {
  AVATAR: 'Ảnh đại diện',
  CCCD_FRONT: 'CCCD mặt trước',
  CCCD_BACK: 'CCCD mặt sau',
  PASSPORT: 'Hộ chiếu (nếu có)',
};

export default function ParticipantAccountPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'tickets'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string }>();
  const [avatarVersion, setAvatarVersion] = useState(0);
  const cameraInputs = useRef<Partial<Record<MediaType, HTMLInputElement | null>>>({});
  const { data: profile, error, isLoading, mutate } = useSWR<Profile>(getParticipantToken() ? '/participant-auth/me' : null, authFetcher);
  const { data: registrations = [], mutate: mutateRegistrations } = useSWR<Registration[]>(getParticipantToken() ? '/participant-auth/registrations' : null, authFetcher);
  const uploadedTypes = useMemo(() => new Set(profile?.athlete.media.map((item) => item.type) || []), [profile]);

  useEffect(() => {
    if (!getParticipantToken()) router.replace('/account/login');
  }, [router]);

  useEffect(() => {
    if (error?.response?.status === 401) {
      clearParticipantSession();
      router.replace('/account/login');
    }
  }, [error, router]);

  const upload = async (type: MediaType, file: File) => {
    setMessage(undefined);
    const form = new FormData();
    form.append('file', file);
    try {
      await participantApi.post(`/participant-auth/me/media/${type}`, form);
      setMessage({ type: 'success', text: `Đã cập nhật ${mediaLabels[type].toLowerCase()}.` });
      if (type === 'AVATAR') setAvatarVersion((version) => version + 1);
      await Promise.all([mutate(), mutateRegistrations()]);
    } catch (requestError) {
      setMessage({ type: 'error', text: participantError(requestError, 'Tải tệp thất bại') });
    }
  };

  const customUpload = (type: MediaType) => async (options: UploadRequestOption) => {
    await upload(type, options.file as File);
    options.onSuccess?.({});
  };

  if (isLoading || !profile) {
    return <main className="grid min-h-[60vh] place-items-center"><Spin size="large" /></main>;
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              size={72}
              icon={<UserRound />}
              src={profile.athlete.photoUrl ? `${profile.athlete.photoUrl}?v=${avatarVersion}` : undefined}
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">Tài khoản vận động viên</p>
              <h1 className="text-3xl font-black text-white">{profile.displayName}</h1>
              <p className="text-slate-400">{profile.email}</p>
            </div>
          </div>
          <Button icon={<LogOut className="h-4 w-4" />} onClick={() => { clearParticipantSession(); router.replace('/'); }}>
            Đăng xuất
          </Button>
        </header>

        {message && <Alert className="mb-5" showIcon type={message.type} message={message.text} closable />}
        <Segmented
          className="mb-6"
          value={tab}
          onChange={(value) => setTab(value as typeof tab)}
          options={[
            { value: 'profile', label: 'Hồ sơ & giấy tờ', icon: <CreditCard className="h-4 w-4" /> },
            { value: 'tickets', label: `Vé tham dự (${registrations.length})`, icon: <TicketCheck className="h-4 w-4" /> },
          ]}
        />

        {tab === 'profile' ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <Card title="Thông tin thi đấu">
              <dl className="space-y-4 text-sm">
                <div><dt className="text-slate-500">Họ và tên</dt><dd className="font-semibold text-slate-100">{profile.athlete.fullName}</dd></div>
                <div><dt className="text-slate-500">Ngày sinh</dt><dd className="font-semibold text-slate-100">{profile.athlete.birthDate ? new Date(profile.athlete.birthDate).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</dd></div>
                <div><dt className="text-slate-500">Quốc gia</dt><dd className="font-semibold text-slate-100">{profile.athlete.country.name}</dd></div>
                <div><dt className="text-slate-500">Đơn vị</dt><dd className="font-semibold text-slate-100">{profile.athlete.federation?.name || 'Vận động viên tự do'}</dd></div>
                <div><dt className="text-slate-500">Cân nặng</dt><dd className="font-semibold text-slate-100">{profile.athlete.weight ? `${profile.athlete.weight} kg` : 'Chưa cập nhật'}</dd></div>
              </dl>
            </Card>
            <Card title="Ảnh và giấy tờ xác minh" extra={<Tag color={uploadedTypes.has('CCCD_FRONT') && uploadedTypes.has('CCCD_BACK') ? 'success' : 'warning'}>{uploadedTypes.has('CCCD_FRONT') && uploadedTypes.has('CCCD_BACK') ? 'Đủ CCCD' : 'Thiếu CCCD'}</Tag>}>
              <p className="mb-5 text-sm text-slate-400">CCCD chỉ phục vụ xác minh đăng ký, không hiển thị công khai. Có thể chọn ảnh hoặc mở máy ảnh trên điện thoại.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(mediaLabels) as MediaType[]).map((type) => (
                  <div key={type} className="rounded-xl border border-white/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{mediaLabels[type]}</span>
                      {uploadedTypes.has(type) ? <Tag color="success" icon={<FileCheck2 className="h-3 w-3" />}>Đã có</Tag> : <Tag>Chưa có</Tag>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Upload accept={type === 'AVATAR' ? 'image/*' : 'image/*,application/pdf'} showUploadList={false} customRequest={customUpload(type)}>
                        <Button icon={type === 'AVATAR' ? <ImagePlus className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}>Chọn tệp</Button>
                      </Upload>
                      <input
                        ref={(element) => { cameraInputs.current[type] = element; }}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        capture={type === 'AVATAR' ? 'user' : 'environment'}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void upload(type, file);
                          event.target.value = '';
                        }}
                      />
                      <Button icon={<Camera className="h-4 w-4" />} onClick={() => cameraInputs.current[type]?.click()}>Máy ảnh</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : registrations.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {registrations.map((registration) => (
              <Card key={registration.id} className="overflow-hidden" title={registration.event.name} extra={<Tag color={registration.status === 'CONFIRMED' ? 'success' : 'processing'}>{registration.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Chờ xử lý'}</Tag>}>
                <p className="text-sm text-slate-400">{registration.event.sport?.name} · {registration.category.name}</p>
                <p className="mt-2 text-sm text-slate-300">{new Date(registration.event.startDate).toLocaleDateString('vi-VN')} · {registration.event.location || 'Địa điểm cập nhật sau'}</p>
                <div className="my-5 rounded-xl border border-dashed border-sky-400/50 bg-sky-400/5 p-5 text-center">
                  <TicketCheck className="mx-auto mb-2 h-8 w-8 text-sky-400" />
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Mã vé tham dự</p>
                  <strong className="mt-1 block text-xl tracking-wider text-white">{registration.ticketCode}</strong>
                </div>
                <p className="text-xs text-slate-500">Thanh toán: {registration.paymentStatus === 'NOT_REQUIRED' ? 'Miễn phí · Không cần thanh toán' : 'Chờ thanh toán'}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card><Empty description="Bạn chưa có vé tham dự nào" /></Card>
        )}
      </div>
    </main>
  );
}
