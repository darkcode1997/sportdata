'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { Avatar, QRCode } from 'antd';
import { ShieldCheck, Trophy, UserRound } from 'lucide-react';
import type { ParticipationTicket } from '@/lib/ticket-types';

const statusMeta: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'VÉ HỢP LỆ', className: 'bg-emerald-600 text-white' },
  SUBMITTED: { label: 'CHỜ XÁC NHẬN', className: 'bg-amber-400 text-slate-950' },
  REJECTED: { label: 'KHÔNG HỢP LỆ', className: 'bg-red-600 text-white' },
  CANCELLED: { label: 'ĐÃ HỦY', className: 'bg-slate-600 text-white' },
};

const validHex = /^#[0-9A-Fa-f]{6}$/;
const color = (value: string | null | undefined, fallback: string) => validHex.test(value || '') ? value! : fallback;

function rgba(hex: string, alpha: number) {
  const value = hex.replace('#', '');
  return `rgba(${Number.parseInt(value.slice(0, 2), 16)}, ${Number.parseInt(value.slice(2, 4), 16)}, ${Number.parseInt(value.slice(4, 6), 16)}, ${alpha})`;
}

export function EventParticipationCard({ ticket }: { ticket: ParticipationTicket }) {
  const [verificationUrl, setVerificationUrl] = useState(`/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  const status = statusMeta[ticket.status] || statusMeta.SUBMITTED;
  const backgroundUrl = ticket.event.ticketBackgroundUrl || undefined;
  const layout = ['CLASSIC', 'STRIPE', 'MINIMAL'].includes(ticket.event.ticketLayout || '')
    ? ticket.event.ticketLayout
    : 'CLASSIC';
  const primary = color(ticket.event.ticketPrimaryColor, '#0284C7');
  const secondary = color(ticket.event.ticketSecondaryColor, '#075985');
  const accent = color(ticket.event.ticketAccentColor, '#059669');
  const cardStyle: CSSProperties = {
    backgroundImage: backgroundUrl
      ? `url("${backgroundUrl}")`
      : `linear-gradient(145deg, ${rgba(primary, 0.16)}, rgba(255,255,255,.97) 34%, rgba(255,255,255,.96) 72%, ${rgba(accent, 0.14)}), repeating-linear-gradient(35deg, transparent 0 13px, ${rgba(primary, 0.06)} 13px 14px)`,
  };

  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  }, [ticket.ticketCode]);

  const statusBadge = (
    <span className={`shrink-0 rounded-sm px-2 py-1 text-[8px] font-black tracking-wide ${status.className}`}>
      {status.label}
    </span>
  );
  const athleteImage = (
    <div className="flex aspect-[3/4] items-center justify-center border-2 bg-white/90 p-1" style={{ borderColor: secondary }}>
      <Avatar shape="square" size={130} src={ticket.athlete.avatarUrl} icon={<UserRound className="h-10 w-10" />} className="!h-full !w-full !rounded-none !bg-slate-200 [&_img]:!object-cover" />
    </div>
  );
  const qrCode = (
    <div className="flex flex-col items-center">
      <div className="bg-white p-1.5"><QRCode value={verificationUrl} size={96} bordered={false} bgColor="#ffffff" color="#07111f" /></div>
      <div className="mt-1 flex items-center gap-1 text-[8px] font-black uppercase tracking-wide" style={{ color: accent }}><ShieldCheck className="h-3 w-3" /> Quét vé</div>
    </div>
  );
  const categoryBadge = (
    <div className="w-full border-2 px-2 py-2 text-center text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,.65)]" style={{ backgroundColor: primary, borderColor: secondary }}>
      <p className="text-[8px] font-black uppercase tracking-wider text-white/80">Hạng thi đấu</p>
      <p className="mt-1 line-clamp-2 text-xs font-black uppercase leading-tight sm:text-sm">{ticket.category.name}</p>
    </div>
  );
  const details = (
    <div className="space-y-3 bg-white/85 px-2 py-3 text-sm backdrop-blur-[1px]">
      {[
        ['Họ và tên:', ticket.athlete.fullName.toUpperCase()],
        ['Đơn vị:', ticket.athlete.federation?.name || 'Vận động viên tự do'],
        ['Quốc gia:', ticket.athlete.country?.name || '—'],
      ].map(([label, value], index) => (
        <div className="flex items-end gap-2" key={label}>
          <span className="shrink-0 font-black">{label}</span>
          <strong className={`min-w-0 flex-1 truncate border-b px-1 pb-0.5 ${index === 0 ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`} style={{ borderColor: index === 2 ? rgba(secondary, 0.5) : secondary }}>{value}</strong>
        </div>
      ))}
    </div>
  );
  const footer = (
    <footer className="px-3 py-2 text-center text-white" style={{ backgroundColor: secondary }}>
      <p className="truncate text-[9px] font-bold">{new Date(ticket.event.startDate).toLocaleDateString('vi-VN')} · {ticket.event.location || 'Địa điểm cập nhật sau'}</p>
      <code className="mt-1 block text-[8px] font-black tracking-wider text-white/75">{ticket.ticketCode} · SPORTDATA.VN</code>
    </footer>
  );

  return (
    <article className="event-pass-card relative mx-auto aspect-[105/148] w-full max-w-[420px] overflow-hidden rounded-lg border-[3px] bg-white bg-cover bg-center text-slate-950 shadow-2xl shadow-black/25" style={{ ...cardStyle, borderColor: secondary }} data-ticket-layout={layout}>
      <div className="absolute inset-0 bg-white/55" />
      {layout === 'STRIPE' ? (
        <div className="relative flex h-full flex-col">
          <header className="relative px-6 pb-4 pt-5 text-center text-white" style={{ backgroundColor: secondary }}>
            <div className="absolute right-3 top-3">{statusBadge}</div>
            <div className="flex items-center justify-center gap-2 text-white/80"><Trophy className="h-4 w-4" /><strong className="text-[10px] font-black tracking-[0.18em]">SPORTDATA VIỆT NAM</strong></div>
            <h2 className="mx-auto mt-3 line-clamp-2 max-w-[90%] text-xl font-black uppercase leading-tight">{ticket.event.name}</h2>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/70">{ticket.sport?.name || 'Giải đấu thể thao'}</p>
          </header>
          <div className="mx-6 mt-4 grid grid-cols-2 items-start gap-5">{athleteImage}<div className="flex flex-col items-center gap-3">{qrCode}{categoryBadge}</div></div>
          <div className="mx-6 mt-4 border-y-2 bg-white/80 py-2 text-center" style={{ borderColor: primary }}><p className="text-2xl font-black tracking-[0.08em]" style={{ color: primary }}>VẬN ĐỘNG VIÊN</p></div>
          <div className="mx-6 mt-3 flex-1">{details}</div>
          <div className="mt-3">{footer}</div>
        </div>
      ) : layout === 'MINIMAL' ? (
        <div className="relative flex h-full flex-col px-6 py-5">
          <header className="flex items-start justify-between gap-3 border-l-4 bg-white/85 px-3 py-2" style={{ borderColor: accent }}>
            <div className="min-w-0 text-left">
              <div className="text-[9px] font-black tracking-[0.18em]" style={{ color: primary }}>SPORTDATA VIỆT NAM</div>
              <h2 className="mt-1 line-clamp-2 text-lg font-black uppercase leading-tight" style={{ color: secondary }}>{ticket.event.name}</h2>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-widest text-slate-500">{ticket.sport?.name || 'Giải đấu thể thao'}</p>
            </div>
            {statusBadge}
          </header>
          <div className="mt-5 grid grid-cols-[1.12fr_.88fr] items-start gap-5">
            {athleteImage}
            <div className="flex flex-col items-center"><p className="mb-3 text-center text-xl font-black leading-none" style={{ color: primary }}>VẬN ĐỘNG<br />VIÊN</p>{qrCode}<div className="mt-3">{categoryBadge}</div></div>
          </div>
          <div className="mt-5 flex-1 border-l-4" style={{ borderColor: accent }}>{details}</div>
          <footer className="mt-3 border-t-2 bg-white/85 px-2 py-2 text-center" style={{ borderColor: primary, color: secondary }}>
            <p className="truncate text-[9px] font-bold">{new Date(ticket.event.startDate).toLocaleDateString('vi-VN')} · {ticket.event.location || 'Địa điểm cập nhật sau'}</p>
            <code className="mt-1 block text-[8px] font-black tracking-wider">{ticket.ticketCode}</code>
          </footer>
        </div>
      ) : (
        <div className="relative flex h-full flex-col px-5 py-4 sm:px-6 sm:py-5">
          <header className="relative bg-white/80 px-2 pb-3 pt-1 text-center backdrop-blur-[1px]">
            <div className="absolute right-0 top-0">{statusBadge}</div>
            <div className="flex items-center justify-center gap-2" style={{ color: primary }}><Trophy className="h-4 w-4" /><strong className="text-xs font-black tracking-[0.18em]">SPORTDATA VIỆT NAM</strong></div>
            <h2 className="mx-auto mt-3 line-clamp-2 max-w-[92%] text-lg font-black uppercase leading-tight sm:text-xl" style={{ color: secondary }}>{ticket.event.name}</h2>
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-700">{ticket.sport?.name || 'Giải đấu thể thao'}</p>
          </header>
          <div className="mt-4 grid grid-cols-2 items-start gap-5 px-4">{athleteImage}<div className="flex flex-col items-center gap-3">{qrCode}{categoryBadge}</div></div>
          <div className="mt-4 bg-white/75 py-2 text-center backdrop-blur-[1px]"><p className="text-2xl font-black tracking-[0.08em] sm:text-3xl" style={{ color: primary }}>VẬN ĐỘNG VIÊN</p></div>
          <div className="mt-3 flex-1">{details}</div>
          <div className="mt-3">{footer}</div>
        </div>
      )}
    </article>
  );
}
