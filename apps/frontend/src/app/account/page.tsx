'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Avatar, Button, Card, Empty, Image as AntImage, Segmented, Spin, Tag, Upload } from 'antd';
import { CreditCard, Download, Eye, FileCheck2, FileText, ImagePlus, ScanText, TicketCheck, UploadCloud, UserRound } from 'lucide-react';
import { CameraCaptureButton } from '@/components/CameraCaptureButton';
import { EventParticipationCard } from '@/components/EventParticipationCard';
import { IdentityOcrReviewModal, type IdentityOcrFields, type IdentityOcrResult } from '@/components/IdentityOcrReviewModal';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { clearParticipantSession, getParticipantAccount, getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';
import type { ParticipationTicket, TicketStatistics } from '@/lib/ticket-types';

type MediaType = 'AVATAR' | 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT';
type UploadRequestOption = Parameters<NonNullable<ComponentProps<typeof Upload>['customRequest']>>[0];
type Profile = {
  id: string;
  email: string;
  displayName: string;
  phone?: string | null;
  createdAt: string;
  athlete: {
    id: string;
    fullName: string;
    birthDate?: string | null;
    gender: string;
    weight?: number | null;
    photoUrl?: string | null;
    country: { name: string; code: string };
    federation?: { name: string } | null;
    media: {
      type: MediaType;
      mimeType: string;
      size: number;
      verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | null;
      verificationNote?: string | null;
      ocrStatus?: 'NOT_REQUESTED' | 'PENDING' | 'COMPLETED' | 'FAILED';
      ocrProvider?: string | null;
      ocrConfidence?: number | null;
      ocrData?: { userConfirmed?: boolean; confirmedFields?: IdentityOcrFields; message?: string } | null;
      updatedAt: string;
    }[];
  };
};
type MediaAsset = { url: string; mimeType: string };
type Registration = {
  id: string;
  ticketCode: string;
  status: string;
  paymentStatus: string;
  feeAmount: number;
  currency: string;
  createdAt: string;
  event: {
    id: string;
    name: string;
    startDate: string;
    endDate?: string;
    location?: string;
    sport?: { id: string; name: string };
    ticketBackgroundSize?: number | null;
    ticketThemePreset?: string | null;
    ticketLayout?: string | null;
    ticketPrimaryColor?: string | null;
    ticketSecondaryColor?: string | null;
    ticketAccentColor?: string | null;
  };
  category: { id: string; name: string; sport?: { id: string; name: string } };
  athlete: {
    id: string;
    fullName: string;
    birthDate?: string | null;
    gender?: string;
    weight?: number | null;
    country?: { code?: string; name?: string } | null;
    federation?: { name?: string } | null;
    statistics?: Array<TicketStatistics & { eventId?: string | null; sportId: string; categoryId?: string | null }>;
  };
};

const authFetcher = (url: string) => participantApi.get(url).then((response) => response.data);
const mediaLabels: Record<MediaType, string> = {
  AVATAR: 'Ảnh đại diện',
  CCCD_FRONT: 'CCCD mặt trước',
  CCCD_BACK: 'CCCD mặt sau',
  PASSPORT: 'Hộ chiếu (nếu có)',
};

function aggregateStatistics(items: TicketStatistics[] = []): TicketStatistics {
  return items.reduce((total, item) => ({
    totalWins: total.totalWins + item.totalWins,
    totalLosses: total.totalLosses + item.totalLosses,
    totalDraws: total.totalDraws + item.totalDraws,
    totalMatches: total.totalMatches + item.totalMatches,
    goldMedals: total.goldMedals + item.goldMedals,
    silverMedals: total.silverMedals + item.silverMedals,
    bronzeMedals: total.bronzeMedals + item.bronzeMedals,
  }), {
    totalWins: 0,
    totalLosses: 0,
    totalDraws: 0,
    totalMatches: 0,
    goldMedals: 0,
    silverMedals: 0,
    bronzeMedals: 0,
  });
}

function registrationTicket(registration: Registration): ParticipationTicket {
  const sport = registration.category.sport || registration.event.sport;
  const sportStatistics = (registration.athlete.statistics || [])
    .filter((item) => !sport?.id || item.sportId === sport.id);
  const overallStatistics = sportStatistics.filter((item) => !item.eventId);
  return {
    ticketCode: registration.ticketCode,
    status: registration.status,
    paymentStatus: registration.paymentStatus,
    isValid: registration.status === 'CONFIRMED',
    issuedAt: registration.createdAt,
    event: {
      ...registration.event,
      ticketBackgroundUrl: registration.event.ticketBackgroundSize
        ? `/api/events/${registration.event.id}/ticket-background`
        : null,
    },
    sport,
    category: registration.category,
    athlete: {
      ...registration.athlete,
      avatarUrl: `/api/participant-auth/avatar/${registration.athlete.id}`,
    },
    achievements: {
      event: aggregateStatistics(sportStatistics.filter((item) => item.eventId === registration.event.id)),
      career: aggregateStatistics(overallStatistics.length ? overallStatistics : sportStatistics),
    },
  };
}

export default function ParticipantAccountPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const [tab, setTab] = useState<'profile' | 'tickets'>('profile');
  const [mediaAssets, setMediaAssets] = useState<Partial<Record<MediaType, MediaAsset>>>({});
  const [ocrReview, setOcrReview] = useState<{ type: MediaType; result: IdentityOcrResult }>();
  const [confirmingOcr, setConfirmingOcr] = useState(false);
  const sessionAccount = getParticipantAccount();
  const isAthleteAccount = sessionAccount?.accountType !== 'FEDERATION';
  const { data: profile, error, isLoading, mutate } = useSWR<Profile>(getParticipantToken() && isAthleteAccount ? '/participant-auth/me' : null, authFetcher);
  const { data: registrations = [], mutate: mutateRegistrations } = useSWR<Registration[]>(getParticipantToken() && isAthleteAccount ? '/participant-auth/registrations' : null, authFetcher);
  const mediaItems = useMemo(() => profile?.athlete.media || [], [profile?.athlete.media]);
  const uploadedTypes = useMemo(() => new Set(mediaItems.map((item) => item.type)), [mediaItems]);
  const mediaByType = useMemo(() => new Map(mediaItems.map((item) => [item.type, item])), [mediaItems]);
  const cccdComplete = uploadedTypes.has('CCCD_FRONT') && uploadedTypes.has('CCCD_BACK');
  const identityComplete = cccdComplete || uploadedTypes.has('PASSPORT');
  const identityVerified = (
    mediaByType.get('CCCD_FRONT')?.verificationStatus === 'VERIFIED'
    && mediaByType.get('CCCD_BACK')?.verificationStatus === 'VERIFIED'
  ) || mediaByType.get('PASSPORT')?.verificationStatus === 'VERIFIED';
  const identityRejected = mediaItems.some((item) => item.type !== 'AVATAR' && item.verificationStatus === 'REJECTED');

  useEffect(() => {
    if (!getParticipantToken()) router.replace('/account/login');
    else if (sessionAccount?.accountType === 'FEDERATION') router.replace('/federation-account');
  }, [router, sessionAccount?.accountType]);

  useEffect(() => {
    if (error?.response?.status === 401) {
      clearParticipantSession();
      router.replace('/account/login');
    }
  }, [error, router]);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];

    const loadMedia = async () => {
      const entries = await Promise.all(mediaItems.map(async (item) => {
        try {
          const response = await participantApi.get(`/participant-auth/me/media/${item.type}`, { responseType: 'blob' });
          const url = URL.createObjectURL(response.data);
          objectUrls.push(url);
          return [item.type, { url, mimeType: item.mimeType }] as const;
        } catch {
          return null;
        }
      }));
      if (!cancelled) {
        setMediaAssets(Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))));
      }
    };

    void loadMedia();
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaItems]);

  const upload = async (type: MediaType, file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await participantApi.post<{ ocr?: IdentityOcrResult }>(`/participant-auth/me/media/${type}`, form);
      if (type !== 'AVATAR' && response.data.ocr?.status === 'COMPLETED') {
        setOcrReview({ type, result: response.data.ocr });
        toast.success('Đã đọc dữ liệu. Vui lòng kiểm tra và xác nhận thông tin trên giấy tờ.');
      } else if (type !== 'AVATAR' && response.data.ocr?.message) {
        toast.warning(response.data.ocr.message);
      } else {
        toast.success(`Đã cập nhật ${mediaLabels[type].toLowerCase()}.`);
      }
      await Promise.all([mutate(), mutateRegistrations()]);
    } catch (requestError) {
      toast.error(participantError(requestError, 'Tải tệp thất bại'));
    }
  };

  const confirmOcr = async (fields: IdentityOcrFields, applyToProfile: boolean) => {
    if (!ocrReview) return;
    setConfirmingOcr(true);
    try {
      await participantApi.patch(`/participant-auth/me/media/${ocrReview.type}/ocr-confirm`, { ...fields, applyToProfile });
      setOcrReview(undefined);
      toast.success('Đã lưu thông tin bạn xác nhận. Giấy tờ vẫn chờ CMS/eKYC xác thực.');
      await mutate();
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể xác nhận dữ liệu OCR'));
    } finally {
      setConfirmingOcr(false);
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
    <main className="participant-account-page min-h-screen px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar
              size={72}
              icon={<UserRound />}
              src={mediaAssets.AVATAR?.url}
            />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-sky-400">Tài khoản SportData</p>
              <h1 className="text-3xl font-black text-white">{profile.displayName}</h1>
              <p className="text-slate-400">{profile.email}</p>
            </div>
          </div>
        </header>

        <Segmented
          className="mb-6"
          value={tab}
          onChange={(value) => setTab(value as typeof tab)}
          options={[
            { value: 'profile', label: 'Thông tin & giấy tờ', icon: <CreditCard className="h-4 w-4" /> },
            { value: 'tickets', label: `Vé & hồ sơ đã đăng ký (${registrations.length})`, icon: <TicketCheck className="h-4 w-4" /> },
          ]}
        />

        {tab === 'profile' ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
            <Card title="Thông tin chi tiết tài khoản">
              <dl className="space-y-4 text-sm">
                <div><dt className="text-slate-500">Họ và tên</dt><dd className="font-semibold text-slate-100">{profile.athlete.fullName}</dd></div>
                <div><dt className="text-slate-500">Email</dt><dd className="break-all font-semibold text-slate-100">{profile.email}</dd></div>
                <div><dt className="text-slate-500">Số điện thoại</dt><dd className="font-semibold text-slate-100">{profile.phone || 'Chưa cập nhật'}</dd></div>
                <div><dt className="text-slate-500">Ngày sinh</dt><dd className="font-semibold text-slate-100">{profile.athlete.birthDate ? new Date(profile.athlete.birthDate).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}</dd></div>
                <div><dt className="text-slate-500">Giới tính</dt><dd className="font-semibold text-slate-100">{profile.athlete.gender === 'FEMALE' ? 'Nữ' : profile.athlete.gender === 'MALE' ? 'Nam' : 'Khác'}</dd></div>
                <div><dt className="text-slate-500">Quốc gia</dt><dd className="font-semibold text-slate-100">{profile.athlete.country.name}</dd></div>
                <div><dt className="text-slate-500">Ngày tạo tài khoản</dt><dd className="font-semibold text-slate-100">{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</dd></div>
                <div className="border-t border-white/10 pt-4">
                  <dt className="text-slate-500">Đơn vị/CLB tham gia</dt>
                  <dd className="font-semibold text-slate-100">{profile.athlete.federation?.name || 'Chưa liên kết'}</dd>
                </div>
                <div><dt className="text-slate-500">Cân nặng đăng ký</dt><dd className="font-semibold text-slate-100">{profile.athlete.weight ? `${profile.athlete.weight} kg` : 'Chưa cập nhật'}</dd></div>
              </dl>
            </Card>
            <Card
              title="Ảnh và giấy tờ xác minh"
              extra={identityVerified
                ? <Tag color="success">Đã xác thực</Tag>
                : identityRejected
                  ? <Tag color="error">Cần tải lại</Tag>
                  : identityComplete
                    ? <Tag color="processing">Chờ xác thực</Tag>
                    : <Tag color="warning">Thiếu giấy tờ</Tag>}
            >
              <p className="mb-5 text-sm text-slate-400">Tải lên không đồng nghĩa đã xác thực. CCCD hai mặt hoặc hộ chiếu phải được OCR/CMS đối chiếu trước khi hồ sơ được duyệt.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(mediaLabels) as MediaType[]).map((type) => {
                  const asset = mediaAssets[type];
                  const media = mediaByType.get(type);
                  const isPdf = asset?.mimeType === 'application/pdf';
                  return (
                    <div key={type} className="overflow-hidden rounded-xl border border-white/10">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                        <span className="font-semibold text-slate-100">{mediaLabels[type]}</span>
                        {!uploadedTypes.has(type)
                          ? <Tag>Chưa tải lên</Tag>
                          : type === 'AVATAR'
                            ? <Tag color="blue">Đã tải lên</Tag>
                            : media?.verificationStatus === 'VERIFIED'
                              ? <Tag color="success" icon={<FileCheck2 className="h-3 w-3" />}>Đã xác thực</Tag>
                              : media?.verificationStatus === 'REJECTED'
                                ? <Tag color="error">Bị từ chối</Tag>
                                : media?.ocrData?.userConfirmed
                                  ? <Tag color="cyan" icon={<ScanText className="h-3 w-3" />}>Đã xác nhận OCR</Tag>
                                  : media?.ocrStatus === 'COMPLETED'
                                    ? <Tag color="blue">Đã đọc OCR</Tag>
                                    : <Tag color="processing">Chờ xác thực</Tag>}
                      </div>
                      <div className="grid h-44 place-items-center bg-black/20">
                        {asset && !isPdf ? (
                          <div className="h-full w-full [&_.ant-image]:block [&_.ant-image]:h-full [&_.ant-image]:w-full">
                            <AntImage
                              src={asset.url}
                              alt={mediaLabels[type]}
                              className="!h-44 !w-full object-contain"
                              preview={{ mask: <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Xem ảnh</span> }}
                            />
                          </div>
                        ) : asset && isPdf ? (
                          <div className="text-center">
                            <FileText className="mx-auto mb-2 h-10 w-10 text-sky-400" />
                            <Button href={asset.url} target="_blank" icon={<Eye className="h-4 w-4" />}>Mở tệp PDF</Button>
                          </div>
                        ) : (
                          <div className="text-center text-slate-500">
                            {type === 'AVATAR' ? <UserRound className="mx-auto mb-2 h-10 w-10" /> : <CreditCard className="mx-auto mb-2 h-10 w-10" />}
                            <span className="text-sm">Chưa tải lên</span>
                          </div>
                        )}
                      </div>
                      {media?.verificationStatus === 'REJECTED' && media.verificationNote && (
                        <p className="px-4 pt-3 text-xs text-red-400">Lý do: {media.verificationNote}</p>
                      )}
                      <div className="flex flex-wrap gap-2 p-4">
                        <Upload accept={type === 'AVATAR' ? 'image/*' : 'image/*,application/pdf'} showUploadList={false} customRequest={customUpload(type)}>
                          <Button icon={type === 'AVATAR' ? <ImagePlus className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}>Chọn tệp</Button>
                        </Upload>
                        <CameraCaptureButton
                          facingMode={type === 'AVATAR' ? 'user' : 'environment'}
                          onCapture={(file) => upload(type, file)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        ) : registrations.length ? (
          <div className="mx-auto max-w-4xl space-y-7">
            {registrations.map((registration) => (
              <div key={registration.id}>
                <EventParticipationCard ticket={registrationTicket(registration)} />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2">
                  <p className="text-xs text-slate-500">
                    Thanh toán: {registration.paymentStatus === 'NOT_REQUIRED'
                      ? 'Miễn phí · Không cần thanh toán'
                      : registration.paymentStatus === 'PAID'
                        ? 'Đã thanh toán'
                        : registration.paymentStatus === 'FAILED'
                          ? 'Thanh toán chưa thành công'
                          : 'Chờ thanh toán'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/tickets/${encodeURIComponent(registration.ticketCode)}`} target="_blank">
                      <Button icon={<Eye className="h-4 w-4" />}>Xem vé</Button>
                    </Link>
                    <Button href={`/api/participant-auth/tickets/${encodeURIComponent(registration.ticketCode)}/pdf`} icon={<Download className="h-4 w-4" />}>Tải PDF</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card><Empty description="Bạn chưa có vé tham dự nào" /></Card>
        )}
      </div>
      <IdentityOcrReviewModal
        open={Boolean(ocrReview)}
        result={ocrReview?.result}
        loading={confirmingOcr}
        onCancel={() => setOcrReview(undefined)}
        onConfirm={confirmOcr}
      />
    </main>
  );
}
