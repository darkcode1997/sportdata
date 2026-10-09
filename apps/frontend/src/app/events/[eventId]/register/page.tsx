'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Image,
  Input,
  Result,
  Segmented,
  Select,
  Spin,
  Tag,
  Upload,
} from 'antd';
import { Download, FileImage, ImageIcon, Loader2, Plus, RefreshCw, Send, Trash2, UploadCloud, Users } from 'lucide-react';
import { RegistrationDisciplines, registrationCategoryLabel, type DisciplineEntry, type RegistrationCategory } from '@/components/RegistrationDisciplines';
import { CameraCaptureButton } from '@/components/CameraCaptureButton';
import { EventParticipationCard } from '@/components/EventParticipationCard';
import type { TicketDesign } from '@/lib/ticket-design';
import { PaymentCheckout } from '@/components/PaymentCheckout';
import { IdentityOcrReviewModal, type IdentityOcrFields, type IdentityOcrResult } from '@/components/IdentityOcrReviewModal';
import { useSportDataToast } from '@/hooks/useSportDataToast';
import { fetcher } from '@/lib/api';
import { getParticipantAccount, getParticipantToken, participantApi, participantError, type SportDataAccount } from '@/lib/participant-auth';
import type { ParticipationTicket } from '@/lib/ticket-types';
import { vietnamCountryId } from '@/lib/countries';
import { optimizeRegistrationMedia } from '@/lib/registration-media';

type RegistrationMode = 'INDIVIDUAL' | 'GROUP';
type IdentityType = 'CCCD' | 'PASSPORT';
type Country = { id: string; code: string; name: string };
type Federation = { id: string; name: string; countryId: string };
type Category = RegistrationCategory & {
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  minWeight?: number | null;
  maxWeight?: number | null;
};
type EventData = {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  location?: string | null;
  ticketBackgroundUrl?: string | null;
  ticketDesign?: TicketDesign | null;
  ticketThemePreset?: string | null;
  ticketLayout?: string | null;
  ticketPrimaryColor?: string | null;
  ticketSecondaryColor?: string | null;
  ticketAccentColor?: string | null;
  paymentMode?: 'FREE' | 'MANUAL' | 'ONLINE';
  paymentProviders?: Array<'MOMO' | 'VNPAY' | 'BANK_QR' | 'VISA'>;
  categories: Category[];
};
type AthleteDraft = {
  documentNumber?: string;
  phone?: string;
  key: string;
  fullName: string;
  birthDate: Dayjs | null;
  gender?: 'MALE' | 'FEMALE';
  countryId?: string;
  federationId?: string;
  entries: DisciplineEntry[];
  identityType: IdentityType;
  avatar?: File;
  cccdFront?: File;
  cccdBack?: File;
  passport?: File;
  identityOcr?: IdentityOcrResult & { userConfirmed: true };
};
type SubmissionResult = {
  hasExistingRegistrations?: boolean;
  referenceCode: string | null;
  ticketEmailSent?: boolean;
  ticketEmailQueued?: boolean;
  registrations: { id: string; categoryId: string; athleteIndex: number; athleteId: string; athleteName: string; ticketCode: string; status: string; paymentStatus: string; feeAmount: number; currency: string; paymentDueAt?: string | null }[];
};
type FederationSessionProfile = {
  email: string;
  displayName: string;
  phone?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  federation: { id: string; name: string; countryId: string };
};
type ParticipantSessionProfile = {
  email: string;
  displayName: string;
  phone?: string | null;
};
type MediaUploadReference = { id: string; token: string; expiresAt: string };

const emptyAthlete = (key: string): AthleteDraft => ({
  key,
  fullName: '',
  birthDate: null,
  identityType: 'CCCD',
  entries: [{}],
});

function DocumentPicker({
  label,
  file,
  required,
  facingMode = 'environment',
  allowPdf = true,
  onChange,
  reading,
}: {
  label: string;
  file?: File;
  required?: boolean;
  facingMode?: 'user' | 'environment';
  allowPdf?: boolean;
  onChange: (file?: File) => void;
  reading?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>();
  const isImage = Boolean(file?.type.startsWith('image/'));

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="registration-document-picker">
      <label className="registration-document-label mb-2 block text-sm font-semibold text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {file && (
        <div className={`registration-document-preview ${facingMode === 'user' ? 'is-portrait' : ''}`}>
          {isImage && previewUrl ? (
            <Image
              alt={`${label} đã chọn`}
              className="registration-document-image"
              preview={{ mask: 'Xem ảnh' }}
              src={previewUrl}
            />
          ) : (
            <div className="registration-document-pdf">
              <FileImage className="h-9 w-9" />
              <strong>Tệp PDF đã chọn</strong>
              <span>Có thể thay thế hoặc xóa tệp bên dưới</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        <Upload
          accept={allowPdf ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp'}
          maxCount={1}
          showUploadList={false}
          beforeUpload={(selectedFile) => {
            onChange(selectedFile as File);
            return false;
          }}
        >
          <Button icon={file ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}>
            {file ? (isImage ? 'Thay ảnh' : 'Thay tệp') : (allowPdf ? 'Chọn ảnh / PDF' : 'Chọn ảnh')}
          </Button>
        </Upload>
        <CameraCaptureButton facingMode={facingMode} onCapture={(capturedFile) => onChange(capturedFile)} />
        {file && (
          <Button danger icon={<Trash2 className="h-4 w-4" />} onClick={() => onChange(undefined)}>
            Xóa
          </Button>
        )}
        {reading && <span className="flex items-center gap-2 self-center text-xs text-sky-400"><Loader2 className="h-4 w-4 animate-spin" /> Đang đọc giấy tờ...</span>}
      </div>
      {!file && (
        <div className="registration-document-empty mt-2">
          <ImageIcon className="h-5 w-5" />
          <span>Ảnh sẽ hiển thị tại đây sau khi chọn hoặc chụp</span>
        </div>
      )}
    </div>
  );
}

export default function GuestEventRegistrationPage() {
  const router = useRouter();
  const toast = useSportDataToast();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const nextKey = useRef(2);
  const [mode, setMode] = useState<RegistrationMode>('INDIVIDUAL');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [athletes, setAthletes] = useState<AthleteDraft[]>([emptyAthlete('athlete-1')]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string>();
  const [result, setResult] = useState<SubmissionResult>();
  const [ocrReview, setOcrReview] = useState<{ athleteKey: string; result: IdentityOcrResult }>();
  const [ocrReadingKey, setOcrReadingKey] = useState<string>();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sessionAccount, setSessionAccount] = useState<SportDataAccount | null>(null);
  const isFederationAccount = Boolean(getParticipantToken() && sessionAccount?.accountType === 'FEDERATION');
  const isAthleteAccount = Boolean(getParticipantToken() && sessionAccount?.accountType !== 'FEDERATION' && sessionAccount);
  const { data: event, isLoading } = useSWR<EventData>(eventId ? `/events/${eventId}` : null, fetcher);
  const { data: countries = [] } = useSWR<Country[]>('/countries', fetcher);
  const { data: federations = [] } = useSWR<Federation[]>('/federations', fetcher);
  const defaultCountryId = useMemo(() => vietnamCountryId(countries), [countries]);
  const { data: federationProfile } = useSWR<FederationSessionProfile>(
    isFederationAccount ? '/participant-auth/federation/me' : null,
    (url: string) => participantApi.get(url).then((response) => response.data),
  );
  const { data: participantProfile } = useSWR<ParticipantSessionProfile>(
    isAthleteAccount ? '/participant-auth/me' : null,
    (url: string) => participantApi.get(url).then((response) => response.data),
  );

  useEffect(() => {
    if (!defaultCountryId || federationProfile) return;
    setAthletes((current) => current.map((athlete) => (
      athlete.countryId ? athlete : { ...athlete, countryId: defaultCountryId }
    )));
  }, [defaultCountryId, federationProfile]);

  useEffect(() => {
    const syncSession = () => {
      setSessionAccount(getParticipantToken() ? getParticipantAccount() : null);
    };
    syncSession();
    window.addEventListener('participant-session-change', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('participant-session-change', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get('mode');
    if (requestedMode === 'group' || isFederationAccount) setMode('GROUP');
  }, [isFederationAccount]);

  useEffect(() => {
    if (!federationProfile) return;
    setMode('GROUP');
    setContactName(federationProfile.displayName);
    setContactEmail(federationProfile.email);
    setContactPhone(federationProfile.phone || '');
    setOrganizationName(federationProfile.federation.name);
    setAthletes((current) => current.map((athlete) => ({
      ...athlete,
      countryId: federationProfile.federation.countryId,
      federationId: federationProfile.federation.id,
    })));
  }, [federationProfile]);

  useEffect(() => {
    if (!participantProfile || isFederationAccount) return;
    setContactName(participantProfile.displayName);
    setContactEmail(participantProfile.email);
    setContactPhone(participantProfile.phone || '');
  }, [isFederationAccount, participantProfile]);

  const activeAthletes = useMemo(
    () => mode === 'INDIVIDUAL' ? athletes.slice(0, 1) : athletes,
    [athletes, mode],
  );

  const updateAthlete = (key: string, patch: Partial<AthleteDraft>) => {
    setSubmissionError(undefined);
    setAthletes((current) => current.map((athlete) => athlete.key === key ? { ...athlete, ...patch } : athlete));
  };

  const selectIdentityFile = async (
    athleteKey: string,
    file: File | undefined,
    fileField: 'cccdFront' | 'cccdBack' | 'passport',
    mediaType: 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT',
  ) => {
    if (!file) {
      updateAthlete(athleteKey, { [fileField]: undefined, ...(fileField !== 'cccdBack' ? { identityOcr: undefined } : {}) });
      return;
    }
    let optimizedFile: File;
    try {
      optimizedFile = await optimizeRegistrationMedia(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tối ưu tệp đã chọn.');
      return;
    }
    updateAthlete(athleteKey, { [fileField]: optimizedFile, ...(fileField !== 'cccdBack' ? { identityOcr: undefined } : {}) });
    if (mediaType === 'CCCD_BACK') return;
    if (!optimizedFile.type.startsWith('image/')) {
      toast.warning('OCR cần ảnh JPG, PNG hoặc WebP. Tệp PDF vẫn có thể gửi để CMS kiểm duyệt thủ công.');
      return;
    }
    const form = new FormData();
    form.append('type', mediaType);
    form.append('file', optimizedFile);
    setOcrReadingKey(athleteKey);
    if (isFederationAccount && federationProfile?.verificationStatus !== 'VERIFIED') {
      toast.warning('Tài khoản đơn vị phải được SportData duyệt trước khi gửi danh sách vận động viên.');
      setOcrReadingKey(undefined);
      return;
    }
    try {
      const response = await participantApi.post<IdentityOcrResult>('/participant-auth/ocr/preview', form);
      if (response.data.status === 'COMPLETED') {
        setOcrReview({ athleteKey, result: response.data });
      } else if (response.data.message) {
        toast.warning(response.data.message);
      }
    } catch (requestError) {
      toast.error(participantError(requestError, 'Không thể đọc dữ liệu giấy tờ'));
    } finally {
      setOcrReadingKey(undefined);
    }
  };

  const confirmGuestOcr = async (fields: IdentityOcrFields, applyToProfile: boolean) => {
    if (!ocrReview) return;
    const patch: Partial<AthleteDraft> = {
      identityOcr: { ...ocrReview.result, fields, userConfirmed: true },
      documentNumber: fields.documentNumber,
    };
    if (applyToProfile) {
      if (fields.fullName) patch.fullName = fields.fullName;
      if (fields.dateOfBirth && dayjs(fields.dateOfBirth).isValid()) patch.birthDate = dayjs(fields.dateOfBirth);
      const normalizedSex = fields.sex?.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedSex === 'nam' || normalizedSex === 'male' || normalizedSex === 'm') patch.gender = 'MALE';
      if (normalizedSex === 'nu' || normalizedSex === 'female' || normalizedSex === 'f') patch.gender = 'FEMALE';
    }
    updateAthlete(ocrReview.athleteKey, patch);
    setOcrReview(undefined);
  };

  const downloadSubmissionPdf = async (submission: SubmissionResult) => {
    if (!submission.referenceCode) return;
    setDownloadingPdf(true);
    try {
      const response = await participantApi.post(
        `/participant-auth/submissions/${encodeURIComponent(submission.referenceCode)}/tickets.pdf`,
        { contactEmail },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sportdata-${submission.referenceCode}-A6.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      toast.error(participantError(requestError, 'Chưa thể tải PDF vé. Vui lòng kiểm tra trạng thái duyệt của tất cả hồ sơ.'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const submit = async () => {
    setSubmissionError(undefined);
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      toast.error('Vui lòng nhập đủ người liên hệ, email và số điện thoại.');
      return;
    }
    if (mode === 'GROUP' && !organizationName.trim()) {
      toast.error('Vui lòng nhập tên đội, CLB hoặc đơn vị đăng ký.');
      return;
    }
    const missingIndex = activeAthletes.findIndex((athlete) => (
      !athlete.fullName.trim()
      || !athlete.documentNumber?.trim()
      || !athlete.birthDate
      || !athlete.gender
      || !athlete.countryId
      || !athlete.entries.length
      || athlete.entries.some((entry) => !entry.categoryId)
    ));
    if (missingIndex >= 0) {
      const message = `Vận động viên ${missingIndex + 1} chưa đủ họ tên, số giấy tờ, ngày sinh, giới tính, quốc gia hoặc nội dung thi đấu.`;
      setSubmissionError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      for (const athlete of activeAthletes) {
        await participantApi.post('/participant-auth/identity/check', {
          fullName: athlete.fullName, birthDate: athlete.birthDate!.format('YYYY-MM-DD'),
          gender: athlete.gender, countryId: athlete.countryId, federationId: athlete.federationId,
          identityType: athlete.identityType, documentNumber: athlete.documentNumber,
          phone: athlete.phone || contactPhone,
        });
      }
      const missingMediaIndex = activeAthletes.findIndex((athlete) => (
        !athlete.avatar
        || (athlete.identityType === 'CCCD' ? !athlete.cccdFront || !athlete.cccdBack : !athlete.passport)
      ));
      if (missingMediaIndex >= 0) {
        const message = `Vận động viên ${missingMediaIndex + 1} chưa đủ ảnh đại diện hoặc giấy tờ định danh.`;
        setSubmissionError(message);
        toast.error(message);
        return;
      }
      const uploadMedia = async (file: File, type: 'AVATAR' | 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT') => {
        const optimizedFile = await optimizeRegistrationMedia(file);
        const upload = new FormData();
        upload.append('type', type);
        upload.append('file', optimizedFile);
        const response = await participantApi.post<MediaUploadReference>('/participant-auth/media-uploads', upload);
        return response.data;
      };
      const athletesWithUploads = [];
      for (const athlete of activeAthletes) {
        const [avatar, cccdFront, cccdBack, passport] = await Promise.all([
          athlete.avatar ? uploadMedia(athlete.avatar, 'AVATAR') : undefined,
          athlete.cccdFront ? uploadMedia(athlete.cccdFront, 'CCCD_FRONT') : undefined,
          athlete.cccdBack ? uploadMedia(athlete.cccdBack, 'CCCD_BACK') : undefined,
          athlete.passport ? uploadMedia(athlete.passport, 'PASSPORT') : undefined,
        ]);
        athletesWithUploads.push({
          fullName: athlete.fullName,
          documentNumber: athlete.documentNumber,
          phone: athlete.phone || undefined,
          birthDate: athlete.birthDate!.format('YYYY-MM-DD'),
          gender: athlete.gender,
          countryId: athlete.countryId,
          federationId: athlete.federationId || undefined,
          categoryIds: athlete.entries.map((entry) => entry.categoryId),
          identityType: athlete.identityType,
          identityOcr: athlete.identityOcr,
          mediaUploads: { avatar, cccdFront, cccdBack, passport },
        });
      }
      const endpoint = isFederationAccount
        ? '/participant-auth/federation/registrations'
        : isAthleteAccount
          ? '/participant-auth/assisted-registrations'
          : '/participant-auth/guest-registrations';
      const response = await participantApi.post<SubmissionResult>(endpoint, {
        eventId,
        type: mode,
        contactName,
        contactEmail,
        contactPhone,
        organizationName: mode === 'GROUP' ? organizationName : undefined,
        athletes: athletesWithUploads,
      });
      const payableRegistration = response.data.registrations.length === 1
        ? response.data.registrations[0]
        : undefined;
      if (payableRegistration?.paymentStatus === 'PENDING' && payableRegistration.feeAmount > 0) {
        toast.success('Đã tiếp nhận hồ sơ. Đang mở mã QR thanh toán; vé A6 sẽ được phát hành sau khi hồ sơ được duyệt.');
        router.push(`/tickets/${encodeURIComponent(payableRegistration.ticketCode)}?payment=1`);
        return;
      }
      const allTicketsIssued = response.data.registrations.every((registration) => (
        registration.status === 'CONFIRMED'
        && (registration.paymentStatus === 'PAID' || registration.paymentStatus === 'NOT_REQUIRED')
      ));
      toast.success(allTicketsIssued
        ? response.data.ticketEmailSent
          ? 'Hồ sơ đã được duyệt. Bộ vé A6 đã được gửi về email và đang được tải xuống.'
          : response.data.ticketEmailQueued
            ? 'Hồ sơ đã được duyệt. Bộ vé A6 đã sẵn sàng và sẽ được gửi về email.'
            : 'Hồ sơ đã được duyệt. Bộ vé A6 đã sẵn sàng để tải.'
        : 'Đã tiếp nhận hồ sơ. Vé A6 sẽ được phát hành và gửi email sau khi hồ sơ được duyệt.');
      setResult(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (allTicketsIssued && response.data.referenceCode && !response.data.hasExistingRegistrations) await downloadSubmissionPdf(response.data);
    } catch (requestError) {
      const message = participantError(requestError, 'Không thể gửi hồ sơ đăng ký');
      setSubmissionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !event) return <main className="grid min-h-[60vh] place-items-center"><Spin size="large" /></main>;
  if (result) {
    const allTicketsIssued = result.registrations.every((registration) => (
      registration.status === 'CONFIRMED'
      && (registration.paymentStatus === 'PAID' || registration.paymentStatus === 'NOT_REQUIRED')
    ));
    return (
      <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12">
        <Card>
          <Result
            status="success"
            title="Đã tiếp nhận hồ sơ đăng ký"
            subTitle={result.referenceCode ? `Mã hồ sơ ${result.referenceCode}. Vé được phát hành khi giấy tờ và thanh toán đã hoàn tất.` : 'Các hồ sơ đã có tại sự kiện. Mở từng vé bên dưới để xem trạng thái hoặc tiếp tục thanh toán.'}
            extra={[
              ...(allTicketsIssued && result.referenceCode && !result.hasExistingRegistrations ? [
                <Button key="pdf" type="primary" loading={downloadingPdf} icon={<Download className="h-4 w-4" />} onClick={() => void downloadSubmissionPdf(result)}>
                  {result.registrations.length > 1 ? `Tải bộ ${result.registrations.length} vé PDF` : 'Tải vé PDF'}
                </Button>,
              ] : []),
              <Link key="event" href={`/events/${eventId}`}><Button>Quay lại sự kiện</Button></Link>,
            ]}
          />
          {!allTicketsIssued ? (
            <Alert
              className="mb-6"
              showIcon
              type="info"
              message="Đang chờ phát hành vé"
              description="Bạn có thể hoàn tất thanh toán và theo dõi từng hồ sơ bên dưới. Khi được duyệt, vé A6 và mã QR check-in mới xuất hiện, đồng thời được gửi về email đăng ký."
            />
          ) : result.registrations.length > 1 && (
            <Alert className="mb-6" showIcon type="info" message="Mỗi nội dung đăng ký có một vé và QR riêng" description="Bộ PDF gồm danh sách đăng ký và vé riêng cho từng nội dung thi đấu của mỗi VĐV." />
          )}
          <div className="mx-auto max-w-3xl space-y-7">
            {result.registrations.map((registration) => {
              const athlete = activeAthletes[registration.athleteIndex];
              const category = event.categories.find((item) => item.id === registration.categoryId);
              const country = countries.find((item) => item.id === athlete?.countryId);
              const federation = federations.find((item) => item.id === athlete?.federationId);
              const ticket: ParticipationTicket = {
                ticketCode: registration.ticketCode,
                status: registration.status,
                paymentStatus: registration.paymentStatus,
                feeAmount: registration.feeAmount,
                currency: registration.currency,
                paymentDueAt: registration.paymentDueAt,
                event: {
                  id: event.id,
                  name: event.name,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  location: event.location,
                  ticketBackgroundUrl: event.ticketBackgroundUrl,
                  ticketDesign: event.ticketDesign,
                  ticketThemePreset: event.ticketThemePreset,
                  ticketLayout: event.ticketLayout,
                  ticketPrimaryColor: event.ticketPrimaryColor,
                  ticketSecondaryColor: event.ticketSecondaryColor,
                  ticketAccentColor: event.ticketAccentColor,
                  paymentMode: event.paymentMode,
                  paymentProviders: event.paymentProviders,
                },
                sport: category?.sport || null,
                category: { ...category, name: category?.name || 'Hạng đấu đang cập nhật' },
                athlete: {
                  id: registration.athleteId,
                  fullName: registration.athleteName,
                  birthDate: athlete?.birthDate?.format('YYYY-MM-DD'),
                  gender: athlete?.gender,
                  country,
                  federation,
                  avatarUrl: `/api/participant-auth/avatar/${registration.athleteId}`,
                },
              };
              const ticketIssued = registration.status === 'CONFIRMED'
                && (registration.paymentStatus === 'PAID' || registration.paymentStatus === 'NOT_REQUIRED');
              return (
                <div key={registration.id}>
                  {category && <h3 className="mb-3 font-semibold">{registrationCategoryLabel(category)}</h3>}
                  <PaymentCheckout ticket={ticket} />
                  {ticketIssued ? (
                    <EventParticipationCard ticket={ticket} />
                  ) : (
                    <Card size="small" className="border-sky-500/20">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <strong>{registration.athleteName}</strong>
                          <p className="mt-1 text-sm text-slate-500">{category?.name || 'Hạng đấu đang cập nhật'} · Mã hồ sơ {registration.ticketCode}</p>
                        </div>
                        <Tag color={registration.status === 'REJECTED' ? 'error' : 'processing'}>
                          {registration.status === 'REJECTED' ? 'Hồ sơ bị từ chối' : 'Chờ duyệt hồ sơ'}
                        </Tag>
                      </div>
                    </Card>
                  )}
                  <div className="mt-3 flex justify-end">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tickets/${encodeURIComponent(registration.ticketCode)}`} target="_blank">
                        <Button>{ticketIssued ? 'Xem vé' : 'Theo dõi hồ sơ'}</Button>
                      </Link>
                      {registration.paymentStatus === 'PENDING' && registration.feeAmount > 0 ? (
                        <Link href={`/tickets/${encodeURIComponent(registration.ticketCode)}?payment=1`}><Button type="primary">Thanh toán {new Intl.NumberFormat('vi-VN').format(registration.feeAmount)} {registration.currency}</Button></Link>
                      ) : null}
                      {ticketIssued ? (
                        <Button href={`/api/participant-auth/tickets/${encodeURIComponent(registration.ticketCode)}/pdf`} icon={<Download className="h-4 w-4" />}>Tải PDF riêng</Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="guest-registration-page mx-auto min-h-screen max-w-6xl px-4 py-10">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-400">
          {isFederationAccount
            ? 'Đăng ký bằng tài khoản liên đoàn / CLB'
            : isAthleteAccount
              ? 'Đăng ký hộ bằng tài khoản SportData'
              : 'Đăng ký không cần tài khoản'}
        </p>
        <h1 className="mt-2 text-3xl font-black text-white">{event.name}</h1>
        <p className="mt-2 text-slate-400">
          {isAthleteAccount
            ? 'Tài khoản của bạn là người liên hệ. Mỗi VĐV được đăng ký hộ có hồ sơ, giấy tờ và vé riêng.'
            : 'Đăng ký cá nhân hoặc gửi danh sách cho đội/CLB. Mọi giấy tờ đều chuyển sang trạng thái chờ xác thực.'}
        </p>
      </div>

      {isFederationAccount && (
        <Alert
          className="mb-6"
          showIcon
          type={federationProfile?.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
          message={federationProfile?.verificationStatus === 'VERIFIED' ? `Đăng ký với tư cách ${federationProfile.federation.name}` : 'Tài khoản đơn vị đang chờ SportData duyệt'}
          description="Thông tin đơn vị và người liên hệ được lấy từ tài khoản; mỗi vận động viên vẫn cần đủ hồ sơ và giấy tờ."
        />
      )}
      {isAthleteAccount && (
        <Alert
          className="mb-6"
          showIcon
          type="info"
          message={`Bạn đang đăng ký hộ với tài khoản ${participantProfile?.displayName || sessionAccount?.displayName || 'SportData'}`}
          description="Hồ sơ VĐV được tạo độc lập, không thay đổi thông tin VĐV cá nhân của bạn. Vé và email xác nhận sẽ được quản lý bằng tài khoản đang đăng nhập."
        />
      )}
      <Card className="mb-6" title="Hình thức đăng ký">
        <Segmented
          block
          value={mode}
          onChange={(value) => setMode(value as RegistrationMode)}
          options={[
            { value: 'INDIVIDUAL', label: isAthleteAccount ? 'Một VĐV khác' : 'Một vận động viên', icon: <FileImage className="h-4 w-4" />, disabled: isFederationAccount },
            { value: 'GROUP', label: 'Danh sách đội / CLB', icon: <Users className="h-4 w-4" /> },
          ]}
        />
      </Card>

      <Card className="mb-6" title="Người liên hệ hồ sơ">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-2 block text-sm font-semibold">Họ tên người liên hệ *</label><Input disabled={isFederationAccount || isAthleteAccount} size="large" value={contactName} onChange={(event) => setContactName(event.target.value)} /></div>
          <div><label className="mb-2 block text-sm font-semibold">Email *</label><Input disabled={isFederationAccount || isAthleteAccount} size="large" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></div>
          <div><label className="mb-2 block text-sm font-semibold">Số điện thoại *</label><Input disabled={isFederationAccount} size="large" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} /></div>
          {mode === 'GROUP' && <div><label className="mb-2 block text-sm font-semibold">Đội / CLB / đơn vị *</label><Input disabled={isFederationAccount} size="large" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} /></div>}
        </div>
      </Card>

      <div className="space-y-6">
        {activeAthletes.map((athlete, index) => {
          const availableFederations = federations.filter((item) => item.countryId === athlete.countryId);
          return (
            <Card
              key={athlete.key}
              title={`Vận động viên ${index + 1}`}
              extra={mode === 'GROUP' && activeAthletes.length > 1
                ? <Button danger type="text" icon={<Trash2 className="h-4 w-4" />} onClick={() => setAthletes((current) => current.filter((item) => item.key !== athlete.key))}>Xóa</Button>
                : undefined}
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div><label className="mb-2 block text-sm font-semibold">Loại giấy tờ *</label><Select className="w-full" size="large" value={athlete.identityType} onChange={(value) => updateAthlete(athlete.key, { identityType: value, documentNumber: '', identityOcr: undefined })} options={[{ value: 'CCCD', label: 'CCCD' }, { value: 'PASSPORT', label: 'Hộ chiếu' }]} /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-sm font-semibold">Số {athlete.identityType === 'CCCD' ? 'CCCD' : 'hộ chiếu'} *</label><Input size="large" maxLength={30} value={athlete.documentNumber} placeholder={athlete.identityType === 'CCCD' ? '12 chữ số theo CCCD' : 'Số hộ chiếu theo giấy tờ'} onChange={(event) => updateAthlete(athlete.key, { documentNumber: event.target.value })} /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-sm font-semibold">Họ và tên theo giấy tờ *</label><Input size="large" value={athlete.fullName} onChange={(event) => updateAthlete(athlete.key, { fullName: event.target.value })} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Ngày sinh *</label><DatePicker className="w-full" size="large" format="DD/MM/YYYY" value={athlete.birthDate} disabledDate={(date) => date.isAfter(dayjs(), 'day')} onChange={(value) => updateAthlete(athlete.key, { birthDate: value })} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Số điện thoại VĐV</label><Input size="large" type="tel" maxLength={30} value={athlete.phone} placeholder="Để trống nếu dùng số liên hệ" onChange={(event) => updateAthlete(athlete.key, { phone: event.target.value })} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Giới tính *</label><Select className="w-full" size="large" value={athlete.gender} onChange={(value) => updateAthlete(athlete.key, { gender: value })} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Quốc gia *</label><Select disabled={isFederationAccount} showSearch optionFilterProp="label" className="w-full" size="large" value={athlete.countryId} onChange={(value) => updateAthlete(athlete.key, { countryId: value, federationId: undefined })} options={countries.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Đơn vị / CLB</label><Select allowClear showSearch optionFilterProp="label" disabled={isFederationAccount || !athlete.countryId} className="w-full" size="large" value={athlete.federationId} onChange={(value) => updateAthlete(athlete.key, { federationId: value })} placeholder="Để trống nếu đăng ký tự do" options={availableFederations.map((item) => ({ value: item.id, label: item.name }))} /></div>
              </div>

              <RegistrationDisciplines categories={event.categories || []} entries={athlete.entries} existingRegistrations={[]}
                onChange={(entries) => updateAthlete(athlete.key, { entries })} />

              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 font-bold">Ảnh và giấy tờ xác minh</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <DocumentPicker label="Ảnh đại diện" required facingMode="user" allowPdf={false} file={athlete.avatar} onChange={(file) => updateAthlete(athlete.key, { avatar: file })} />
                  <div className="text-sm text-slate-400">Tải lên {athlete.identityType === 'CCCD' ? 'CCCD hai mặt' : 'hộ chiếu'} khớp với số giấy tờ đã nhập ở trên.</div>
                  {athlete.identityType === 'CCCD' ? (
                    <>
                      <DocumentPicker label="CCCD mặt trước" required file={athlete.cccdFront} reading={ocrReadingKey === athlete.key} onChange={(file) => void selectIdentityFile(athlete.key, file, 'cccdFront', 'CCCD_FRONT')} />
                      <DocumentPicker label="CCCD mặt sau" required file={athlete.cccdBack} onChange={(file) => updateAthlete(athlete.key, { cccdBack: file })} />
                    </>
                  ) : (
                    <DocumentPicker label="Hộ chiếu" required file={athlete.passport} reading={ocrReadingKey === athlete.key} onChange={(file) => void selectIdentityFile(athlete.key, file, 'passport', 'PASSPORT')} />
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {mode === 'GROUP' && athletes.length < 30 && (
        <Button className="mt-5" size="large" icon={<Plus className="h-4 w-4" />} onClick={() => setAthletes((current) => [...current, {
          ...emptyAthlete(`athlete-${nextKey.current++}`),
          ...(federationProfile
            ? { countryId: federationProfile.federation.countryId, federationId: federationProfile.federation.id }
            : { countryId: defaultCountryId }),
        }])}>Thêm vận động viên</Button>
      )}
      <p className="mt-6 text-sm text-slate-500">Lệ phí được tính riêng cho từng nội dung thi đấu. Mỗi nội dung có thanh toán và vé riêng sau khi giấy tờ và lệ phí được xác nhận.</p>
      {submissionError && <Alert className="mt-6" type="error" showIcon message={submissionError} />}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link href={`/events/${eventId}`}><Button size="large">Hủy</Button></Link>
        <Button type="primary" size="large" loading={submitting}
          icon={<Send className="h-4 w-4" />} onClick={submit}>Gửi {activeAthletes.length} hồ sơ · {activeAthletes.reduce((count, athlete) => count + athlete.entries.filter((entry) => entry.categoryId).length, 0)} nội dung</Button>
      </div>
      <IdentityOcrReviewModal
        open={Boolean(ocrReview)}
        result={ocrReview?.result}
        applyLabel="Điền họ tên, ngày sinh và giới tính vào hồ sơ VĐV này"
        onCancel={() => setOcrReview(undefined)}
        onConfirm={confirmGuestOcr}
      />
    </main>
  );
}
