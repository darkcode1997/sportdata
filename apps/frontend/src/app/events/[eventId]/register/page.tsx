'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import dayjs, { type Dayjs } from 'dayjs';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Image,
  Input,
  InputNumber,
  Result,
  Segmented,
  Select,
  Spin,
  Upload,
} from 'antd';
import { Download, FileImage, ImageIcon, Loader2, Plus, RefreshCw, Send, Trash2, UploadCloud, Users } from 'lucide-react';
import { CameraCaptureButton } from '@/components/CameraCaptureButton';
import { EventParticipationCard } from '@/components/EventParticipationCard';
import { IdentityOcrReviewModal, type IdentityOcrFields, type IdentityOcrResult } from '@/components/IdentityOcrReviewModal';
import { fetcher } from '@/lib/api';
import { getParticipantAccount, getParticipantToken, participantApi, participantError } from '@/lib/participant-auth';
import type { ParticipationTicket } from '@/lib/ticket-types';

type RegistrationMode = 'INDIVIDUAL' | 'GROUP';
type IdentityType = 'CCCD' | 'PASSPORT';
type Country = { id: string; code: string; name: string };
type Federation = { id: string; name: string; countryId: string };
type Category = {
  id: string;
  name: string;
  gender: string;
  minAge?: number | null;
  maxAge?: number | null;
  minWeight?: number | null;
  maxWeight?: number | null;
  sport?: { name: string } | null;
};
type EventData = { id: string; name: string; startDate: string; endDate?: string; location?: string | null; categories: Category[] };
type AthleteDraft = {
  key: string;
  fullName: string;
  birthDate: Dayjs | null;
  gender?: 'MALE' | 'FEMALE';
  countryId?: string;
  federationId?: string;
  categoryId?: string;
  weight?: number;
  identityType: IdentityType;
  avatar?: File;
  cccdFront?: File;
  cccdBack?: File;
  passport?: File;
  identityOcr?: IdentityOcrResult & { userConfirmed: true };
};
type SubmissionResult = {
  referenceCode: string;
  registrations: { id: string; athleteId: string; athleteName: string; ticketCode: string; status: string }[];
};
type FederationSessionProfile = {
  email: string;
  displayName: string;
  phone?: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  federation: { id: string; name: string; countryId: string };
};

const emptyAthlete = (key: string): AthleteDraft => ({
  key,
  fullName: '',
  birthDate: null,
  identityType: 'CCCD',
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
  const [error, setError] = useState('');
  const [result, setResult] = useState<SubmissionResult>();
  const [ocrReview, setOcrReview] = useState<{ athleteKey: string; result: IdentityOcrResult }>();
  const [ocrReadingKey, setOcrReadingKey] = useState<string>();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const sessionAccount = getParticipantAccount();
  const isFederationAccount = Boolean(getParticipantToken() && sessionAccount?.accountType === 'FEDERATION');
  const { data: event, isLoading } = useSWR<EventData>(eventId ? `/events/${eventId}` : null, fetcher);
  const { data: countries = [] } = useSWR<Country[]>('/countries', fetcher);
  const { data: federations = [] } = useSWR<Federation[]>('/federations', fetcher);
  const { data: federationProfile } = useSWR<FederationSessionProfile>(
    isFederationAccount ? '/participant-auth/federation/me' : null,
    (url: string) => participantApi.get(url).then((response) => response.data),
  );

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

  const activeAthletes = useMemo(
    () => mode === 'INDIVIDUAL' ? athletes.slice(0, 1) : athletes,
    [athletes, mode],
  );

  const updateAthlete = (key: string, patch: Partial<AthleteDraft>) => {
    setAthletes((current) => current.map((athlete) => athlete.key === key ? { ...athlete, ...patch } : athlete));
  };

  const selectIdentityFile = async (
    athleteKey: string,
    file: File | undefined,
    fileField: 'cccdFront' | 'cccdBack' | 'passport',
    mediaType: 'CCCD_FRONT' | 'CCCD_BACK' | 'PASSPORT',
  ) => {
    updateAthlete(athleteKey, { [fileField]: file, ...(fileField !== 'cccdBack' ? { identityOcr: undefined } : {}) });
    if (!file || mediaType === 'CCCD_BACK') return;
    if (!file.type.startsWith('image/')) {
      setError('OCR cần ảnh JPG, PNG hoặc WebP. Tệp PDF vẫn có thể gửi để CMS kiểm duyệt thủ công.');
      return;
    }
    const form = new FormData();
    form.append('type', mediaType);
    form.append('file', file);
    setOcrReadingKey(athleteKey);
    setError('');
    if (isFederationAccount && federationProfile?.verificationStatus !== 'VERIFIED') {
      setError('Tài khoản đơn vị phải được SportData duyệt trước khi gửi danh sách vận động viên.');
      return;
    }
    try {
      const response = await participantApi.post<IdentityOcrResult>('/participant-auth/ocr/preview', form);
      if (response.data.status === 'COMPLETED') {
        setOcrReview({ athleteKey, result: response.data });
      } else {
        setError(response.data.message || 'Không đọc được giấy tờ. Bạn vẫn có thể nhập tay và gửi CMS kiểm duyệt.');
      }
    } catch (requestError) {
      setError(participantError(requestError, 'Không thể đọc dữ liệu giấy tờ'));
    } finally {
      setOcrReadingKey(undefined);
    }
  };

  const confirmGuestOcr = async (fields: IdentityOcrFields, applyToProfile: boolean) => {
    if (!ocrReview) return;
    const patch: Partial<AthleteDraft> = {
      identityOcr: { ...ocrReview.result, fields, userConfirmed: true },
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
      link.download = `sportdata-${submission.referenceCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(participantError(requestError, 'Đăng ký thành công nhưng chưa thể tải PDF. Hãy bấm Tải bộ vé PDF để thử lại.'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!contactName.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError('Vui lòng nhập đủ người liên hệ, email và số điện thoại.');
      return;
    }
    if (mode === 'GROUP' && !organizationName.trim()) {
      setError('Vui lòng nhập tên đội, CLB hoặc đơn vị đăng ký.');
      return;
    }
    const missingIndex = activeAthletes.findIndex((athlete) => (
      !athlete.fullName.trim()
      || !athlete.birthDate
      || !athlete.gender
      || !athlete.countryId
      || !athlete.categoryId
      || !athlete.avatar
      || (athlete.identityType === 'CCCD' ? !athlete.cccdFront || !athlete.cccdBack : !athlete.passport)
    ));
    if (missingIndex >= 0) {
      setError(`Vận động viên ${missingIndex + 1} chưa đủ thông tin, ảnh đại diện hoặc giấy tờ định danh.`);
      return;
    }

    const formData = new FormData();
    formData.append('payload', JSON.stringify({
      eventId,
      type: mode,
      contactName,
      contactEmail,
      contactPhone,
      organizationName: mode === 'GROUP' ? organizationName : undefined,
      athletes: activeAthletes.map((athlete) => ({
        fullName: athlete.fullName,
        birthDate: athlete.birthDate!.format('YYYY-MM-DD'),
        gender: athlete.gender,
        countryId: athlete.countryId,
        federationId: athlete.federationId || undefined,
        categoryId: athlete.categoryId,
        weight: athlete.weight,
        identityType: athlete.identityType,
        identityOcr: athlete.identityOcr,
      })),
    }));
    activeAthletes.forEach((athlete, index) => {
      if (athlete.avatar) formData.append(`athlete_${index}_avatar`, athlete.avatar);
      if (athlete.cccdFront) formData.append(`athlete_${index}_cccdFront`, athlete.cccdFront);
      if (athlete.cccdBack) formData.append(`athlete_${index}_cccdBack`, athlete.cccdBack);
      if (athlete.passport) formData.append(`athlete_${index}_passport`, athlete.passport);
    });

    setSubmitting(true);
    try {
      const endpoint = isFederationAccount ? '/participant-auth/federation/registrations' : '/participant-auth/guest-registrations';
      const response = await participantApi.post<SubmissionResult>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await downloadSubmissionPdf(response.data);
    } catch (requestError) {
      setError(participantError(requestError, 'Không thể gửi hồ sơ đăng ký'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !event) return <main className="grid min-h-[60vh] place-items-center"><Spin size="large" /></main>;
  if (result) {
    return (
      <main className="mx-auto min-h-[70vh] max-w-4xl px-4 py-12">
        <Card>
          <Result
            status="success"
            title="Đã tiếp nhận hồ sơ đăng ký"
            subTitle={`Mã hồ sơ ${result.referenceCode}. Thẻ tham dự đã được tạo ở trạng thái chờ xác nhận và có hiệu lực sau khi CMS duyệt.`}
            extra={[
              <Button key="pdf" type="primary" loading={downloadingPdf} icon={<Download className="h-4 w-4" />} onClick={() => void downloadSubmissionPdf(result)}>
                {result.registrations.length > 1 ? `Tải bộ ${result.registrations.length} vé PDF` : 'Tải vé PDF'}
              </Button>,
              <Link key="event" href={`/events/${eventId}`}><Button>Quay lại sự kiện</Button></Link>,
            ]}
          />
          {result.registrations.length > 1 && (
            <Alert className="mb-6" showIcon type="info" message="Mỗi vận động viên có một vé và QR riêng" description="PDF đầu tiên là danh sách đoàn, sau đó mỗi VĐV có một trang vé độc lập để in, gửi hoặc check-in riêng." />
          )}
          <div className="mx-auto max-w-3xl space-y-7">
            {result.registrations.map((registration, index) => {
              const athlete = activeAthletes[index];
              const category = event.categories.find((item) => item.id === athlete?.categoryId);
              const country = countries.find((item) => item.id === athlete?.countryId);
              const federation = federations.find((item) => item.id === athlete?.federationId);
              const ticket: ParticipationTicket = {
                ticketCode: registration.ticketCode,
                status: registration.status,
                event: {
                  id: event.id,
                  name: event.name,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  location: event.location,
                },
                sport: category?.sport || null,
                category: { id: category?.id, name: category?.name || 'Hạng đấu đang cập nhật' },
                athlete: {
                  id: registration.athleteId,
                  fullName: registration.athleteName,
                  birthDate: athlete?.birthDate?.format('YYYY-MM-DD'),
                  gender: athlete?.gender,
                  weight: athlete?.weight,
                  country,
                  federation,
                  avatarUrl: `/api/participant-auth/avatar/${registration.athleteId}`,
                },
              };
              return (
                <div key={registration.id}>
                  <EventParticipationCard ticket={ticket} />
                  <div className="mt-3 flex justify-end">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/tickets/${encodeURIComponent(registration.ticketCode)}`} target="_blank"><Button>Xem vé</Button></Link>
                      <Button href={`/api/participant-auth/tickets/${encodeURIComponent(registration.ticketCode)}/pdf`} icon={<Download className="h-4 w-4" />}>Tải PDF riêng</Button>
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
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-400">Đăng ký không cần tài khoản</p>
        <h1 className="mt-2 text-3xl font-black text-white">{event.name}</h1>
        <p className="mt-2 text-slate-400">Đăng ký cá nhân hoặc gửi danh sách cho đội/CLB. Mọi giấy tờ đều chuyển sang trạng thái chờ xác thực.</p>
      </div>

      {error && <Alert className="mb-6" showIcon closable type="error" message={error} onClose={() => setError('')} />}
      {isFederationAccount && (
        <Alert
          className="mb-6"
          showIcon
          type={federationProfile?.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}
          message={federationProfile?.verificationStatus === 'VERIFIED' ? `Đăng ký với tư cách ${federationProfile.federation.name}` : 'Tài khoản đơn vị đang chờ SportData duyệt'}
          description="Thông tin đơn vị và người liên hệ được lấy từ tài khoản; mỗi vận động viên vẫn cần đủ hồ sơ và giấy tờ."
        />
      )}
      <Card className="mb-6" title="Hình thức đăng ký">
        <Segmented
          block
          value={mode}
          onChange={(value) => setMode(value as RegistrationMode)}
          options={[
            { value: 'INDIVIDUAL', label: 'Một vận động viên', icon: <FileImage className="h-4 w-4" />, disabled: isFederationAccount },
            { value: 'GROUP', label: 'Danh sách đội / CLB', icon: <Users className="h-4 w-4" /> },
          ]}
        />
      </Card>

      <Card className="mb-6" title="Người liên hệ hồ sơ">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-2 block text-sm font-semibold">Họ tên người liên hệ *</label><Input disabled={isFederationAccount} size="large" value={contactName} onChange={(event) => setContactName(event.target.value)} /></div>
          <div><label className="mb-2 block text-sm font-semibold">Email *</label><Input disabled={isFederationAccount} size="large" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></div>
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
                <div className="lg:col-span-2"><label className="mb-2 block text-sm font-semibold">Họ và tên theo giấy tờ *</label><Input size="large" value={athlete.fullName} onChange={(event) => updateAthlete(athlete.key, { fullName: event.target.value })} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Ngày sinh *</label><DatePicker className="w-full" size="large" format="DD/MM/YYYY" value={athlete.birthDate} disabledDate={(date) => date.isAfter(dayjs(), 'day')} onChange={(value) => updateAthlete(athlete.key, { birthDate: value })} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Giới tính *</label><Select className="w-full" size="large" value={athlete.gender} onChange={(value) => updateAthlete(athlete.key, { gender: value })} options={[{ value: 'MALE', label: 'Nam' }, { value: 'FEMALE', label: 'Nữ' }]} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Quốc gia *</label><Select disabled={isFederationAccount} showSearch optionFilterProp="label" className="w-full" size="large" value={athlete.countryId} onChange={(value) => updateAthlete(athlete.key, { countryId: value, federationId: undefined })} options={countries.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Đơn vị / CLB</label><Select allowClear showSearch optionFilterProp="label" disabled={isFederationAccount || !athlete.countryId} className="w-full" size="large" value={athlete.federationId} onChange={(value) => updateAthlete(athlete.key, { federationId: value })} placeholder="Để trống nếu đăng ký tự do" options={availableFederations.map((item) => ({ value: item.id, label: item.name }))} /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-sm font-semibold">Hạng đấu / nội dung *</label><Select showSearch optionFilterProp="label" className="w-full" size="large" value={athlete.categoryId} onChange={(value) => updateAthlete(athlete.key, { categoryId: value })} options={(event.categories || []).map((category) => ({ value: category.id, label: `${category.sport?.name ? `${category.sport.name} · ` : ''}${category.name}` }))} /></div>
                <div><label className="mb-2 block text-sm font-semibold">Cân nặng hiện tại (kg)</label><InputNumber className="w-full" size="large" min={1} max={500} step={0.1} value={athlete.weight} onChange={(value) => updateAthlete(athlete.key, { weight: value ?? undefined })} /></div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-6">
                <h3 className="mb-4 font-bold">Ảnh và giấy tờ xác minh</h3>
                <div className="grid gap-5 md:grid-cols-2">
                  <DocumentPicker label="Ảnh đại diện" required facingMode="user" allowPdf={false} file={athlete.avatar} onChange={(file) => updateAthlete(athlete.key, { avatar: file })} />
                  <div><label className="mb-2 block text-sm font-semibold">Loại giấy tờ *</label><Select className="w-full" size="large" value={athlete.identityType} onChange={(value) => updateAthlete(athlete.key, { identityType: value })} options={[{ value: 'CCCD', label: 'CCCD hai mặt' }, { value: 'PASSPORT', label: 'Hộ chiếu' }]} /></div>
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
          ...(federationProfile ? { countryId: federationProfile.federation.countryId, federationId: federationProfile.federation.id } : {}),
        }])}>Thêm vận động viên</Button>
      )}
      <p className="mt-6 text-sm text-slate-500">Ảnh tải lên được chuyển sang trạng thái chờ xác thực. Vé chỉ có hiệu lực sau khi giấy tờ được đối chiếu.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Link href={`/events/${eventId}`}><Button size="large">Hủy</Button></Link>
        <Button type="primary" size="large" loading={submitting} icon={<Send className="h-4 w-4" />} onClick={submit}>Gửi {mode === 'GROUP' ? `${activeAthletes.length} hồ sơ` : 'hồ sơ'}</Button>
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
