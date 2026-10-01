'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Alert, Button, Card, Descriptions, Result, Skeleton, Statistic, Tag } from 'antd';
import { ArrowLeft, CheckCircle2, Medal, Printer, ShieldCheck, Swords, Trophy } from 'lucide-react';
import { EventParticipationCard } from '@/components/EventParticipationCard';
import { fetcher } from '@/lib/api';
import type { ParticipationTicket, TicketStatistics } from '@/lib/ticket-types';

const statusLabels: Record<string, { label: string; color: string }> = {
  CONFIRMED: { label: 'Thẻ hợp lệ', color: 'success' },
  SUBMITTED: { label: 'Đang chờ xác nhận', color: 'processing' },
  REJECTED: { label: 'Hồ sơ bị từ chối', color: 'error' },
  CANCELLED: { label: 'Thẻ đã hủy', color: 'default' },
};

const genderLabels: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  MIXED: 'Hỗn hợp',
};

const disciplineLabels: Record<string, string> = {
  NEWAZA: 'Newaza · Địa chiến',
  FIGHTING: 'Fighting',
  CONTACT: 'Contact',
  FULL_CONTACT: 'Full Contact',
  DUO: 'Duo',
  SHOW: 'Show',
};

function medalTotal(statistics?: TicketStatistics) {
  return statistics
    ? statistics.goldMedals + statistics.silverMedals + statistics.bronzeMedals
    : 0;
}

export default function TicketVerificationPage() {
  const params = useParams<{ ticketCode: string }>();
  const ticketCode = decodeURIComponent(params.ticketCode || '').toUpperCase();
  const { data: ticket, error, isLoading } = useSWR<ParticipationTicket>(
    ticketCode ? `/participant-auth/tickets/${encodeURIComponent(ticketCode)}` : null,
    fetcher,
  );

  if (isLoading) {
    return (
      <main className="ticket-verification-page mx-auto min-h-[80vh] max-w-5xl px-4 py-10">
        <Skeleton active paragraph={{ rows: 12 }} />
      </main>
    );
  }

  if (error || !ticket) {
    return (
      <main className="ticket-verification-page grid min-h-[75vh] place-items-center px-4">
        <Result
          status="404"
          title="Không tìm thấy thẻ tham dự"
          subTitle="Mã QR hoặc mã vé không tồn tại. Vui lòng kiểm tra lại với ban tổ chức SportData."
          extra={<Link href="/events"><Button type="primary">Xem sự kiện</Button></Link>}
        />
      </main>
    );
  }

  const status = statusLabels[ticket.status] || statusLabels.SUBMITTED;
  const career = ticket.achievements?.career;
  const eventPerformance = ticket.achievements?.event;
  const weightRange = [
    ticket.category.minWeight != null ? `từ ${ticket.category.minWeight} kg` : '',
    ticket.category.maxWeight != null ? `đến ${ticket.category.maxWeight} kg` : '',
  ].filter(Boolean).join(' ');

  return (
    <main className="ticket-verification-page min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="ticket-page-controls mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/events">
            <Button icon={<ArrowLeft className="h-4 w-4" />}>Sự kiện</Button>
          </Link>
          <Button type="primary" icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            In / lưu PDF thẻ
          </Button>
        </div>

        <Alert
          className="ticket-page-controls mb-6"
          showIcon
          type={ticket.isValid ? 'success' : ticket.status === 'REJECTED' ? 'error' : 'warning'}
          icon={ticket.isValid ? <CheckCircle2 className="h-5 w-5" /> : undefined}
          message={ticket.isValid ? 'Thẻ tham dự hợp lệ' : status.label}
          description={ticket.isValid
            ? 'Thông tin thẻ đã được SportData xác nhận và có thể dùng để check-in sự kiện.'
            : 'Thẻ chỉ có hiệu lực check-in sau khi hồ sơ được SportData xác nhận.'}
        />

        <EventParticipationCard ticket={ticket} />

        <div className="ticket-details mt-7 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <Card title="Thông tin vận động viên" extra={<Tag color={status.color}>{status.label}</Tag>}>
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Họ và tên">{ticket.athlete.fullName}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{ticket.athlete.birthDate ? new Date(ticket.athlete.birthDate).toLocaleDateString('vi-VN') : '—'}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{genderLabels[ticket.athlete.gender || ''] || ticket.athlete.gender || '—'}</Descriptions.Item>
              <Descriptions.Item label="Quốc gia">{ticket.athlete.country?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Đơn vị / CLB">{ticket.athlete.federation?.name || 'Vận động viên tự do'}</Descriptions.Item>
              <Descriptions.Item label="Cân nặng hiện tại">{ticket.athlete.weight ? `${ticket.athlete.weight} kg` : '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="Nội dung thi đấu">
            <Descriptions column={1} size="small" colon={false}>
              <Descriptions.Item label="Bộ môn">{ticket.sport?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Hạng đấu">{ticket.category.name}</Descriptions.Item>
              <Descriptions.Item label="Nội dung">{disciplineLabels[ticket.category.discipline || ''] || ticket.category.discipline || '—'}</Descriptions.Item>
              <Descriptions.Item label="Giới tính hạng">{genderLabels[ticket.category.gender || ''] || ticket.category.gender || '—'}</Descriptions.Item>
              <Descriptions.Item label="Hạng cân">{weightRange || 'Không giới hạn'}</Descriptions.Item>
              <Descriptions.Item label="Đai">{ticket.category.beltLevel || '—'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <Card className="ticket-details mt-6" title="Thành tích thi đấu" extra={<Trophy className="h-5 w-5 text-amber-400" />}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Statistic title="Tổng số trận" value={career?.totalMatches || 0} prefix={<Swords className="h-4 w-4" />} />
            <Statistic title="Số trận thắng" value={career?.totalWins || 0} valueStyle={{ color: '#10b981' }} />
            <Statistic title="Thành tích tại sự kiện" value={eventPerformance?.totalWins || 0} suffix="trận thắng" />
            <Statistic title="Tổng huy chương" value={medalTotal(career)} prefix={<Medal className="h-4 w-4" />} valueStyle={{ color: '#f59e0b' }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Tag color="gold">Vàng: {career?.goldMedals || 0}</Tag>
            <Tag color="default">Bạc: {career?.silverMedals || 0}</Tag>
            <Tag color="orange">Đồng: {career?.bronzeMedals || 0}</Tag>
            <Tag>Hòa: {career?.totalDraws || 0}</Tag>
            <Tag color="red">Thua: {career?.totalLosses || 0}</Tag>
          </div>
        </Card>

        <div className="ticket-page-controls mt-6 flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-slate-400">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          <p>Trang xác thực chỉ công khai thông tin phục vụ thi đấu. Ảnh CCCD, hộ chiếu, email và số điện thoại không được hiển thị qua mã QR.</p>
        </div>
      </div>
    </main>
  );
}
