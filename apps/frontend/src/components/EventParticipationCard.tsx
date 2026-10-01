'use client';

import { useEffect, useState } from 'react';
import { Avatar, QRCode } from 'antd';
import { ShieldCheck, Trophy, UserRound } from 'lucide-react';
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
  const cardStyle = backgroundUrl
    ? { backgroundImage: `url("${backgroundUrl}")` }
    : {
        backgroundImage:
          'linear-gradient(145deg, rgba(224,242,254,.92), rgba(255,255,255,.96) 32%, rgba(255,255,255,.95) 72%, rgba(254,215,170,.72)), repeating-linear-gradient(35deg, transparent 0 13px, rgba(14,165,233,.06) 13px 14px)',
      };

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  }, [ticket.ticketCode]);

  return (
    <article
      className="event-pass-card relative mx-auto aspect-[105/148] w-full max-w-[420px] overflow-hidden rounded-lg border-[3px] border-slate-900 bg-white bg-cover bg-center text-slate-950 shadow-2xl shadow-black/25"
      style={cardStyle}
    >
      <div className="absolute inset-0 bg-white/55" />
      <div className="relative flex h-full flex-col px-5 py-4 sm:px-6 sm:py-5">
        <header className="relative bg-white/80 px-2 pb-3 pt-1 text-center backdrop-blur-[1px]">
          <span className={`absolute right-0 top-0 rounded-sm px-2 py-1 text-[8px] font-black tracking-wide ${status.className}`}>
            {status.label}
          </span>
          <div className="flex items-center justify-center gap-2 text-sky-700">
            <Trophy className="h-4 w-4" />
            <strong className="text-xs font-black tracking-[0.18em]">SPORTDATA VIỆT NAM</strong>
          </div>
          <h2 className="mx-auto mt-3 line-clamp-2 max-w-[92%] text-lg font-black uppercase leading-tight text-sky-800 sm:text-xl">
            {ticket.event.name}
          </h2>
          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-700">
            {ticket.sport?.name || 'Giải đấu thể thao'}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 items-start gap-5 px-4">
          <div>
            <p className="mb-1 text-center text-[9px] font-black uppercase tracking-wider text-slate-600">Ảnh 3 × 4</p>
            <div className="flex aspect-[3/4] items-center justify-center border-2 border-slate-900 bg-white/90 p-1">
              <Avatar
                shape="square"
                size={130}
                src={ticket.athlete.avatarUrl}
                icon={<UserRound className="h-10 w-10" />}
                className="!h-full !w-full !rounded-none !bg-slate-200 [&_img]:!object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="bg-white p-1.5">
              <QRCode value={verificationUrl} size={100} bordered={false} bgColor="#ffffff" color="#07111f" />
            </div>
            <div className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Quét vé
            </div>
            <div className="mt-3 w-full border-2 border-sky-800 bg-sky-600 px-2 py-2 text-center text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,.65)]">
              <p className="text-[8px] font-black uppercase tracking-wider text-sky-100">Hạng thi đấu</p>
              <p className="mt-1 line-clamp-2 text-xs font-black uppercase leading-tight sm:text-sm">{ticket.category.name}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 bg-white/75 py-2 text-center backdrop-blur-[1px]">
          <p className="text-2xl font-black tracking-[0.08em] text-sky-700 sm:text-3xl">VẬN ĐỘNG VIÊN</p>
        </div>

        <div className="mt-3 flex-1 space-y-3 bg-white/80 px-2 py-3 text-sm backdrop-blur-[1px]">
          <div className="flex items-end gap-2">
            <span className="shrink-0 font-black">Họ và tên:</span>
            <strong className="min-w-0 flex-1 truncate border-b-2 border-slate-700 px-1 pb-0.5 text-sm uppercase sm:text-base">{ticket.athlete.fullName}</strong>
          </div>
          <div className="flex items-end gap-2">
            <span className="shrink-0 font-black">Đơn vị:</span>
            <strong className="min-w-0 flex-1 truncate border-b-2 border-slate-700 px-1 pb-0.5 text-xs sm:text-sm">{ticket.athlete.federation?.name || 'Vận động viên tự do'}</strong>
          </div>
          <div className="flex items-end gap-2">
            <span className="shrink-0 font-black">Quốc gia:</span>
            <span className="min-w-0 flex-1 truncate border-b border-slate-400 px-1 pb-0.5 text-xs font-bold">{ticket.athlete.country?.name || '—'}</span>
          </div>
        </div>

        <footer className="mt-3 bg-sky-900 px-3 py-2 text-center text-white">
          <p className="truncate text-[9px] font-bold">
            {new Date(ticket.event.startDate).toLocaleDateString('vi-VN')} · {ticket.event.location || 'Địa điểm cập nhật sau'}
          </p>
          <code className="mt-1 block text-[8px] font-black tracking-wider text-sky-200">{ticket.ticketCode} · SPORTDATA.VN</code>
        </footer>
      </div>
    </article>
  );
}
