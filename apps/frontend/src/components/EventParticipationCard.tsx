'use client';

import { useEffect, useId, useState, type CSSProperties } from 'react';
import { QRCode } from 'antd';
import { UserRound } from 'lucide-react';
import type { ParticipationTicket } from '@/lib/ticket-types';
import { TICKET_HEIGHT, TICKET_WIDTH, ticketDesign, ticketTextSvg, ticketTextValue, type TicketDesign, type TicketElement } from '@/lib/ticket-design';

export function ticketElementStyle(element: TicketElement): CSSProperties {
  return {
    position: 'absolute',
    left: `${element.x / TICKET_WIDTH * 100}%`,
    top: `${element.y / TICKET_HEIGHT * 100}%`,
    width: `${element.width / TICKET_WIDTH * 100}%`,
    height: `${element.height / TICKET_HEIGHT * 100}%`,
  };
}

export function EventParticipationCard({ ticket, design }: { ticket: ParticipationTicket; design?: TicketDesign }) {
  const [verificationUrl, setVerificationUrl] = useState(`/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  const svgPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const layout = design || ticketDesign(ticket.event.ticketDesign);
  useEffect(() => {
    setVerificationUrl(`${window.location.origin}/tickets/${encodeURIComponent(ticket.ticketCode)}`);
  }, [ticket.ticketCode]);

  return (
    <article className="event-pass-card relative mx-auto aspect-[105/148] w-full max-w-[560px] overflow-hidden bg-white text-slate-950" data-ticket-layout="CUSTOM" aria-label="Thẻ thi đấu A6">
      {ticket.event.ticketBackgroundUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ticket.event.ticketBackgroundUrl} alt="Nền thẻ thi đấu" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
      )}
      {layout.elements.map((element) => (
        <div key={element.id} data-ticket-element-id={element.id} data-ticket-element-type={element.type} style={ticketElementStyle(element)} className="overflow-hidden">
          {element.type === 'PHOTO' ? (
            ticket.athlete.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ticket.athlete.avatarUrl} alt={`Ảnh 4×6 ${ticket.athlete.fullName}`} draggable={false} className="pointer-events-none h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-200 text-slate-500"><UserRound className="h-10 w-10" /><span className="text-xs">Ảnh 4 × 6 cm</span></div>
            )
          ) : element.type === 'QR' ? (
            <div className="flex h-full w-full items-center justify-center bg-white p-[10%] [&_svg]:!h-full [&_svg]:!w-full">
              <QRCode value={verificationUrl} errorLevel="M" type="svg" size={256} bordered={false} bgColor="#ffffff" color="#07111f" style={{ padding: 0, borderRadius: 0, width: '100%', height: '100%' }} />
            </div>
          ) : (
            <div className="pointer-events-none h-full w-full [&_svg]:h-full [&_svg]:w-full" aria-label={ticketTextValue(element, ticket)} dangerouslySetInnerHTML={{ __html: ticketTextSvg(element, ticketTextValue(element, ticket), `clip-${svgPrefix}-${element.id}`) }} />
          )}
        </div>
      ))}
    </article>
  );
}
