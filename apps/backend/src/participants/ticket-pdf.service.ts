import { Injectable } from '@nestjs/common';
import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

type TicketPayload = {
  ticketCode: string;
  status: string;
  isValid?: boolean;
  event: { name: string; startDate: Date | string; endDate?: Date | string; location?: string | null };
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
};

type BatchMeta = { referenceCode: string; organizationName?: string | null; contactName?: string | null };

pdfMake.addVirtualFileSystem(vfsFonts);
pdfMake.addFonts({
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
});

@Injectable()
export class TicketPdfService {
  async generate(tickets: TicketPayload[], batch?: BatchMeta) {
    const pages: Content[] = [];
    if (batch && tickets.length > 1) {
      pages.push(this.batchCover(tickets, batch));
    }
    tickets.forEach((ticket, index) => {
      pages.push({
        ...(pages.length || index ? { pageBreak: 'before' as const } : {}),
        stack: this.ticketPage(ticket),
      });
    });

    const definition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [42, 42, 42, 42],
      defaultStyle: { font: 'Roboto', color: '#0f172a', fontSize: 10 },
      content: pages,
      footer: (currentPage, pageCount) => ({
        text: `SportData · Trang ${currentPage}/${pageCount}`,
        alignment: 'center',
        color: '#64748b',
        fontSize: 8,
        margin: [0, 16, 0, 0],
      }),
      info: {
        title: batch ? `Vé tham dự ${batch.referenceCode}` : `Vé tham dự ${tickets[0]?.ticketCode || ''}`,
        author: 'SportData',
        subject: 'Vé tham dự sự kiện thể thao',
      },
    };
    const bytes = await pdfMake.createPdf(definition).getBuffer();
    return Buffer.from(bytes);
  }

  private batchCover(tickets: TicketPayload[], batch: BatchMeta): Content {
    return {
      stack: [
        { text: 'SPORTDATA', style: 'brand' },
        { text: 'BỘ VÉ THAM DỰ THEO ĐOÀN', fontSize: 25, bold: true, margin: [0, 48, 0, 8] },
        { text: batch.organizationName || 'Đơn vị đăng ký', fontSize: 16, bold: true, color: '#0369a1' },
        { text: `Mã hồ sơ: ${batch.referenceCode}`, margin: [0, 8, 0, 3] },
        { text: `Người liên hệ: ${batch.contactName || '—'}` },
        { text: `${tickets.length} vận động viên · mỗi vận động viên có một mã QR độc lập`, color: '#475569', margin: [0, 4, 0, 24] },
        {
          table: {
            headerRows: 1,
            widths: [26, '*', 125],
            body: [
              [{ text: 'STT', bold: true }, { text: 'Vận động viên', bold: true }, { text: 'Mã vé', bold: true }],
              ...tickets.map((ticket, index) => [String(index + 1), ticket.athlete.fullName, ticket.ticketCode]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        {
          text: 'Lưu ý: trạng thái của từng vé được kiểm tra trực tuyến khi quét QR. Vé ở trạng thái chờ duyệt chưa có hiệu lực check-in.',
          color: '#92400e',
          fillColor: '#fffbeb',
          margin: [0, 28, 0, 0],
        },
      ],
    };
  }

  private ticketPage(ticket: TicketPayload): Content[] {
    const verificationUrl = `${(process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '')}/tickets/${encodeURIComponent(ticket.ticketCode)}`;
    const status = ticket.status === 'CONFIRMED' ? 'VÉ HỢP LỆ' : ticket.status === 'REJECTED' ? 'KHÔNG HỢP LỆ' : 'CHỜ XÁC NHẬN';
    const statistics = ticket.achievements?.career;
    const medals = (statistics?.goldMedals || 0) + (statistics?.silverMedals || 0) + (statistics?.bronzeMedals || 0);
    return [
      {
        canvas: [
          { type: 'rect', x: 0, y: 0, w: 511, h: 7, color: '#0284c7' },
          { type: 'rect', x: 340, y: 0, w: 171, h: 7, color: '#ef4444' },
        ],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'SPORTDATA', style: 'brand', margin: [0, 18, 0, 0] },
              { text: 'VÉ THAM DỰ SỰ KIỆN', fontSize: 9, bold: true, color: '#0284c7', characterSpacing: 1.5 },
            ],
          },
          {
            width: 'auto',
            text: status,
            bold: true,
            color: ticket.status === 'CONFIRMED' ? '#047857' : ticket.status === 'REJECTED' ? '#b91c1c' : '#92400e',
            fillColor: ticket.status === 'CONFIRMED' ? '#ecfdf5' : ticket.status === 'REJECTED' ? '#fef2f2' : '#fffbeb',
            margin: [10, 24, 10, 8],
          },
        ],
      },
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: ticket.sport?.name || 'Sự kiện thể thao', bold: true, color: '#0284c7', fontSize: 10, margin: [0, 38, 0, 7] },
              { text: ticket.athlete.fullName.toLocaleUpperCase('vi'), bold: true, fontSize: 24, margin: [0, 0, 0, 10] },
              { text: ticket.category.name, bold: true, fontSize: 13, color: '#334155' },
              { text: ticket.athlete.federation?.name || 'Vận động viên tự do', color: '#64748b', margin: [0, 5, 0, 0] },
              { text: ticket.athlete.country?.name || '', color: '#64748b' },
            ],
          },
          {
            width: 150,
            stack: [
              { qr: verificationUrl, fit: 125, alignment: 'center', margin: [0, 22, 0, 7] },
              { text: ticket.ticketCode, alignment: 'center', bold: true, fontSize: 9 },
              { text: 'Quét để kiểm tra trạng thái', alignment: 'center', color: '#64748b', fontSize: 8, margin: [0, 5, 0, 0] },
            ],
          },
        ],
        columnGap: 20,
      },
      {
        margin: [0, 35, 0, 0],
        table: {
          widths: ['*'],
          body: [[{
            stack: [
              { text: ticket.event.name, bold: true, fontSize: 16 },
              { text: `${this.date(ticket.event.startDate)}${ticket.event.location ? ` · ${ticket.event.location}` : ''}`, color: '#475569', margin: [0, 7, 0, 0] },
            ],
            margin: [14, 13, 14, 13],
          }]],
        },
        layout: {
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
        },
      },
      {
        columns: [
          this.fact('Ngày sinh', ticket.athlete.birthDate ? this.date(ticket.athlete.birthDate) : '—'),
          this.fact('Giới tính', this.gender(ticket.athlete.gender)),
          this.fact('Cân nặng', ticket.athlete.weight ? `${ticket.athlete.weight} kg` : '—'),
          this.fact('Thành tích', `${statistics?.totalWins || 0}/${statistics?.totalMatches || 0} trận · ${medals} HC`),
        ],
        columnGap: 8,
        margin: [0, 18, 0, 0],
      },
      {
        text: 'Vé không chứa số CCCD/hộ chiếu. Thông tin định danh chỉ được dùng trong khu vực kiểm duyệt có phân quyền.',
        color: '#64748b',
        fontSize: 8,
        margin: [0, 26, 0, 0],
      },
    ];
  }

  private fact(label: string, value: string): Content {
    return {
      width: '*' as any,
      stack: [
        { text: label, color: '#64748b', fontSize: 8 },
        { text: value, bold: true, fontSize: 9, margin: [0, 4, 0, 0] },
      ],
      margin: [9, 9, 9, 9],
    };
  }

  private date(value: Date | string) {
    return new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  }

  private gender(value?: string) {
    if (value === 'MALE') return 'Nam';
    if (value === 'FEMALE') return 'Nữ';
    return value || '—';
  }
}
