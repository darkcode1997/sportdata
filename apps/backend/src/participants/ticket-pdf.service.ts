import { Injectable } from '@nestjs/common';
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

export type TicketPayload = {
  ticketCode: string;
  status: string;
  isValid?: boolean;
  event: {
    name: string;
    startDate: Date | string;
    endDate?: Date | string;
    location?: string | null;
    logoUrl?: string | null;
    ticketBackgroundUrl?: string | null;
  };
  sport?: { name: string } | null;
  category: { name: string; minWeight?: number | null; maxWeight?: number | null };
  athlete: {
    fullName: string;
    birthDate?: Date | string | null;
    gender?: string;
    weight?: number | null;
    country?: { name?: string } | null;
    federation?: { name?: string } | null;
  };
  achievements?: {
    career?: { totalMatches?: number; totalWins?: number; goldMedals?: number; silverMedals?: number; bronzeMedals?: number };
  };
  assets?: {
    backgroundData?: Buffer | null;
    backgroundMimeType?: string | null;
    avatarData?: Buffer | null;
    avatarMimeType?: string | null;
  };
};

export type TicketBatchMeta = {
  referenceCode: string;
  organizationName?: string | null;
  contactName?: string | null;
};

pdfMake.addVirtualFileSystem(vfsFonts);
pdfMake.addFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
});

const A6_WIDTH = 297.64;
const A6_HEIGHT = 419.53;

@Injectable()
export class TicketPdfService {
  async generate(tickets: TicketPayload[], batch?: TicketBatchMeta) {
    const pages: Content[] = [];
    if (batch && tickets.length > 1) pages.push(this.batchCover(tickets, batch));
    tickets.forEach((ticket) => {
      pages.push({
        ...(pages.length ? { pageBreak: 'before' as const } : {}),
        stack: this.ticketPage(ticket),
      });
    });

    const definition: TDocumentDefinitions = {
      pageSize: { width: A6_WIDTH, height: A6_HEIGHT },
      pageMargins: [12, 12, 12, 12],
      defaultStyle: { font: 'Roboto', color: '#0f172a', fontSize: 8 },
      content: pages,
      info: {
        title: batch ? `Bộ vé A6 ${batch.referenceCode}` : `Vé A6 ${tickets[0]?.ticketCode || ''}`,
        author: 'SportData Việt Nam',
        subject: 'Thẻ đeo vận động viên khổ A6',
      },
    };
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    return Buffer.from(bytes);
  }

  private batchCover(tickets: TicketPayload[], batch: TicketBatchMeta): Content {
    return {
      stack: [
        { text: 'SPORTDATA', color: '#38bdf8', bold: true, fontSize: 13, characterSpacing: 1.4, margin: [10, 36, 10, 0] },
        { text: 'BỘ THẺ VẬN ĐỘNG VIÊN', color: '#ffffff', bold: true, fontSize: 23, margin: [10, 52, 10, 10] },
        { text: batch.organizationName || 'Đơn vị đăng ký', color: '#7dd3fc', bold: true, fontSize: 14, margin: [10, 0, 10, 22] },
        {
          table: {
            widths: ['*'],
            body: [[{
              stack: [
                { text: `${tickets.length} VẬN ĐỘNG VIÊN`, bold: true, fontSize: 18, color: '#0369a1' },
                { text: `Mã hồ sơ: ${batch.referenceCode}`, margin: [0, 8, 0, 0] },
                { text: `Người liên hệ: ${batch.contactName || '—'}`, margin: [0, 3, 0, 0] },
                { text: 'Các trang tiếp theo là vé A6 riêng để in, cắt và cấp cho từng vận động viên.', color: '#475569', margin: [0, 12, 0, 0] },
              ],
              margin: [14, 16, 14, 16],
              fillColor: '#ffffff',
            }]],
          },
          layout: 'noBorders',
          margin: [10, 0, 10, 0],
        },
        { text: 'Mỗi vé có QR độc lập để kiểm tra thông tin và trạng thái check-in.', color: '#cbd5e1', alignment: 'center', fontSize: 8, margin: [18, 42, 18, 0] },
      ],
    };
  }

  private ticketPage(ticket: TicketPayload): Content[] {
    const verificationUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3001').replace(/\/$/, '')}/tickets/${encodeURIComponent(ticket.ticketCode)}`;
    const status = this.status(ticket.status);
    const background = this.dataUrl(ticket.assets?.backgroundData, ticket.assets?.backgroundMimeType);
    const avatar = this.dataUrl(ticket.assets?.avatarData, ticket.assets?.avatarMimeType);
    const statistics = ticket.achievements?.career;
    const medals = (statistics?.goldMedals || 0) + (statistics?.silverMedals || 0) + (statistics?.bronzeMedals || 0);

    return [
      ...(background ? [{ image: background, width: A6_WIDTH, height: A6_HEIGHT, absolutePosition: { x: 0, y: 0 } } as Content] : []),
      {
        table: {
          widths: ['*', 'auto'],
          body: [[
            { stack: [
              { text: 'SPORTDATA', bold: true, color: '#0369a1', fontSize: 12, characterSpacing: 1 },
              { text: ticket.event.name.toLocaleUpperCase('vi'), bold: true, fontSize: 9, margin: [0, 4, 0, 0] },
            ], border: [false, false, false, false] },
            { text: status.label, bold: true, color: status.color, fillColor: status.background, fontSize: 7, margin: [6, 6, 6, 6], border: [false, false, false, false] },
          ]],
        },
        layout: 'noBorders',
        fillColor: '#ffffff',
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ['*'],
          body: [[{
            text: 'VẬN ĐỘNG VIÊN',
            alignment: 'center',
            bold: true,
            color: '#075985',
            fontSize: 19,
            characterSpacing: 1.2,
            margin: [5, 7, 5, 7],
            fillColor: '#ffffff',
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      {
        columns: [
          {
            width: 96,
            table: {
              widths: [84],
              heights: [108],
              body: [[avatar
                ? { image: avatar, fit: [82, 104], alignment: 'center', margin: [1, 2, 1, 2], fillColor: '#ffffff' }
                : { text: 'ẢNH\n3 × 4', alignment: 'center', color: '#64748b', bold: true, margin: [0, 39, 0, 39], fillColor: '#f1f5f9' }]],
            },
            layout: { hLineColor: () => '#cbd5e1', vLineColor: () => '#cbd5e1' },
          },
          {
            width: '*',
            stack: [
              { qr: verificationUrl, fit: 88, alignment: 'center', margin: [0, 2, 0, 4], foreground: '#07111f', background: '#ffffff' },
              { text: 'QUÉT ĐỂ XÁC THỰC', alignment: 'center', color: '#047857', bold: true, fontSize: 6.5 },
              { text: ticket.ticketCode, alignment: 'center', bold: true, fontSize: 7, margin: [0, 3, 0, 0] },
            ],
          },
        ],
        columnGap: 8,
        margin: [6, 0, 6, 8],
      },
      {
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: ticket.category.name.toLocaleUpperCase('vi'), alignment: 'center', bold: true, color: '#ffffff', fontSize: 12 },
              { text: ticket.sport?.name || 'Bộ môn thi đấu', alignment: 'center', color: '#bae6fd', fontSize: 7, margin: [0, 3, 0, 0] },
            ],
            margin: [8, 7, 8, 7],
            fillColor: '#0369a1',
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: [55, '*'],
          body: [
            [{ text: 'HỌ VÀ TÊN', color: '#64748b', bold: true, fontSize: 6.5 }, { text: ticket.athlete.fullName.toLocaleUpperCase('vi'), bold: true, fontSize: 11 }],
            [{ text: 'ĐƠN VỊ', color: '#64748b', bold: true, fontSize: 6.5 }, { text: ticket.athlete.federation?.name || 'Vận động viên tự do', bold: true }],
            [{ text: 'QUỐC GIA', color: '#64748b', bold: true, fontSize: 6.5 }, { text: ticket.athlete.country?.name || '—' }],
            [{ text: 'THÀNH TÍCH', color: '#64748b', bold: true, fontSize: 6.5 }, { text: `${statistics?.totalWins || 0}/${statistics?.totalMatches || 0} trận · ${medals} huy chương` }],
          ],
        },
        layout: { hLineColor: () => '#e2e8f0', vLineColor: () => '#e2e8f0', paddingTop: () => 4, paddingBottom: () => 4 },
        fillColor: '#ffffff',
      },
      {
        text: `${this.date(ticket.event.startDate)}${ticket.event.location ? ` · ${ticket.event.location}` : ''}`,
        alignment: 'center',
        color: '#ffffff',
        bold: true,
        fontSize: 7,
        margin: [8, 11, 8, 0],
        background: '#082f49',
      },
    ];
  }

  private dataUrl(data?: Buffer | null, mimeType?: string | null) {
    if (!data || !mimeType || !['image/jpeg', 'image/png'].includes(mimeType)) return null;
    return `data:${mimeType};base64,${Buffer.from(data).toString('base64')}`;
  }

  private status(value: string) {
    if (value === 'CONFIRMED') return { label: 'VÉ HỢP LỆ', color: '#047857', background: '#ecfdf5' };
    if (value === 'REJECTED') return { label: 'KHÔNG HỢP LỆ', color: '#b91c1c', background: '#fef2f2' };
    if (value === 'CANCELLED') return { label: 'ĐÃ HỦY', color: '#475569', background: '#f1f5f9' };
    return { label: 'CHỜ XÁC NHẬN', color: '#92400e', background: '#fffbeb' };
  }

  private date(value: Date | string) {
    return new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }
}
