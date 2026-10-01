'use client';

import { useEffect, useState } from 'react';
import { Avatar, QRCode } from 'antd';
import { CalendarDays, MapPin, Medal, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import type { ParticipationTicket } from '@/lib/ticket-types';

const statusMeta: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'THẺ HỢP LỆ', className: 'bg-emerald-500 text-white' },
  SUBMITTED: { label: 'CHỜ XÁC NHẬN', className: 'bg-amber-400 text-slate-950' },
  REJECTED: { label: 'KHÔNG HỢP LỆ', className: 'bg-red-500 text-white' },
  CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-slate-500 text-white' },
};

export function EventParticipationCard({ ticket }: { ticket: ParticipationTicket }) {
  const [verificationUrl, setVerificationUrl] = useState(`/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  const status = statusMeta[ticket.status] || statusMeta.SUBMITTED;
  const statistics = ticket.achievements?.career;
  const medalCount = statistics
    ? statistics.goldMedals + statistics.silverMedals + statistics.bronzeMedals
    : 0;

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  }, [ticket.ticketCode]);

  return (
    <article className="event-pass-card relative overflow-hidden rounded-[28px] border border-slate-200 bg-white text-slate-950 shadow-2xl shadow-black/20">
      <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-sky-500 via-blue-700 to-red-500" />
      <div className="grid gap-0 lg:grid-cols-[1fr_210px]">
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-700 text-white shadow-lg shadow-sky-500/25">
                <Trophy className="h-6 w-6" />
              </span>
              <div>
                <strong className="block text-lg font-black tracking-tight">SPORTDATA</strong>
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Thẻ tham dự sự kiện</span>
              </div>
            </div>
            <span className={`rounded-full px-4 py-2 text-[11px] font-black tracking-wider ${status.className}`}>
              {status.label}
            </span>
          </div>

          <div className="mt-7 grid gap-6 sm:grid-cols-[120px_1fr]">
            <Avatar
              shape="square"
              size={120}
              src={ticket.athlete.avatarUrl}
              icon={<UserRound className="h-10 w-10" />}
              className="!rounded-2xl !border-4 !border-slate-100 !bg-slate-200"
            />
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                {ticket.sport?.name || 'Sự kiện thể thao'}
              </p>
              <h2 className="mt-1 truncate text-2xl font-black uppercase tracking-tight sm:text-3xl">
                {ticket.athlete.fullName}
              </h2>
              <p className="mt-2 font-bold text-slate-700">{ticket.category.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {ticket.athlete.federation?.name || 'Vận động viên tự do'}
                {ticket.athlete.country?.name ? ` · ${ticket.athlete.country.name}` : ''}
              </p>
            </div>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-5">
            <h3 className="line-clamp-2 text-lg font-black">{ticket.event.name}</h3>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sky-600" />{new Date(ticket.event.startDate).toLocaleDateString('vi-VN')}</span>
              <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-600" />{ticket.event.location || 'Địa điểm cập nhật sau'}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                {statistics?.totalMatches || 0} trận · {statistics?.totalWins || 0} thắng
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <Medal className="h-3.5 w-3.5" /> {medalCount} huy chương
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border-t border-dashed border-slate-300 bg-slate-50 p-6 text-center lg:border-l lg:border-t-0">
          <QRCode value={verificationUrl} size={152} bordered={false} bgColor="#f8fafc" color="#07111f" />
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Quét để xác thực
          </div>
          <code className="mt-2 text-xs font-black tracking-wider text-slate-800">{ticket.ticketCode}</code>
          <p className="mt-2 text-[10px] leading-4 text-slate-500">Thông tin giấy tờ định danh không được công khai.</p>
        </div>
      </div>
    </article>
  );
}
