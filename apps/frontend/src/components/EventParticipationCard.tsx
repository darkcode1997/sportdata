'use client';

import { useEffect, useState } from 'react';
import { Avatar, QRCode } from 'antd';
import { CalendarDays, MapPin, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import type { ParticipationTicket } from '@/lib/ticket-types';

const statusMeta: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'VÉ HỢP LỆ', className: 'bg-emerald-600 text-white' },
  SUBMITTED: { label: 'CHỜ XÁC NHẬN', className: 'bg-amber-400 text-slate-950' },
  REJECTED: { label: 'KHÔNG HỢP LỆ', className: 'bg-red-600 text-white' },
  CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-slate-600 text-white' },
};

export function EventParticipationCard({ ticket }: { ticket: ParticipationTicket }) {
  const [verificationUrl, setVerificationUrl] = useState(`/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  const status = statusMeta[ticket.status] || statusMeta.SUBMITTED;
  const backgroundUrl = ticket.event.ticketBackgroundUrl || undefined;

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  }, [ticket.ticketCode]);

  return (
    <article
      className="event-pass-card relative mx-auto aspect-[105/148] w-full max-w-[420px] overflow-hidden rounded-[20px] border border-slate-300 bg-slate-100 bg-cover bg-center text-slate-950 shadow-2xl shadow-black/25"
      style={backgroundUrl ? { backgroundImage: `url("${backgroundUrl}")` } : undefined}
    >
      {!backgroundUrl && (
        <>
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-sky-100 via-white to-orange-100" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-r from-sky-900 to-slate-950" />
        </>
      )}
      <div className="relative flex h-full flex-col p-4 sm:p-5">
        <header className="rounded-xl bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sky-700">
                <Trophy className="h-4 w-4" />
                <strong className="text-sm font-black tracking-[0.12em]">SPORTDATA</strong>
              </div>
              <h2 className="mt-1 line-clamp-2 text-sm font-black uppercase leading-tight sm:text-base">
                {ticket.event.name}
              </h2>
            </div>
            <span className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-black tracking-wide ${status.className}`}>
              {status.label}
            </span>
          </div>
        </header>

        <div className="mt-3 rounded-xl bg-white/95 py-2 text-center shadow-sm backdrop-blur-sm">
          <p className="text-xl font-black tracking-[0.12em] text-sky-800 sm:text-2xl">VẬN ĐỘNG VIÊN</p>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_1fr] gap-3">
          <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-white/80 bg-white/95 p-2 shadow-sm">
            <Avatar
              shape="square"
              size={130}
              src={ticket.athlete.avatarUrl}
              icon={<UserRound className="h-10 w-10" />}
              className="!h-auto !max-h-[145px] !w-auto !max-w-full !rounded-lg !bg-slate-200"
            />
          </div>
          <div className="flex min-h-[150px] flex-col items-center justify-center rounded-xl bg-white/95 p-2 shadow-sm">
            <QRCode value={verificationUrl} size={124} bordered={false} bgColor="#ffffff" color="#07111f" />
            <div className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Quét để xác thực
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-sky-700 px-3 py-2 text-center text-white shadow-sm">
          <p className="line-clamp-2 text-sm font-black uppercase leading-tight sm:text-base">{ticket.category.name}</p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-100">{ticket.sport?.name || 'Bộ môn thi đấu'}</p>
        </div>

        <div className="mt-3 flex-1 rounded-xl bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Họ và tên</p>
          <h3 className="line-clamp-2 text-lg font-black uppercase leading-tight">{ticket.athlete.fullName}</h3>
          <div className="mt-2 space-y-1 text-xs font-semibold text-slate-700">
            <p className="truncate">Đơn vị: {ticket.athlete.federation?.name || 'Vận động viên tự do'}</p>
            <p className="truncate">Quốc gia: {ticket.athlete.country?.name || '—'}</p>
          </div>
        </div>

        <footer className="mt-3 rounded-xl bg-slate-950/95 px-3 py-2 text-center text-white shadow-sm">
          <code className="text-[10px] font-black tracking-wider text-sky-300">{ticket.ticketCode}</code>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[9px] text-slate-200">
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{new Date(ticket.event.startDate).toLocaleDateString('vi-VN')}</span>
            <span className="flex max-w-[220px] items-center gap-1 truncate"><MapPin className="h-3 w-3" />{ticket.event.location || 'Địa điểm cập nhật sau'}</span>
          </div>
        </footer>
      </div>
    </article>
  );
}
