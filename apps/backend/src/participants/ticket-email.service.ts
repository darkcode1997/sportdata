import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { TicketPdfService, type TicketBatchMeta, type TicketPayload } from './ticket-pdf.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class TicketEmailService {
  private readonly logger = new Logger(TicketEmailService.name);

  constructor(
    private readonly ticketPdf: TicketPdfService,
    private readonly settings: SystemSettingsService,
  ) {}

  async send(to: string, tickets: TicketPayload[], batch?: TicketBatchMeta) {
    if (!tickets.length || tickets.some((ticket) => ticket.isValid !== true)) {
      this.logger.warn('Bỏ qua gửi email vì hồ sơ chưa đủ điều kiện phát hành vé');
      return false;
    }
    if (!await this.settings.enabled('ticketEmailEnabled')) {
      this.logger.warn('Bỏ qua gửi vé email vì tính năng email đang tắt hoặc SMTP chưa được cấu hình');
      return false;
    }
    if (!process.env.SMTP_HOST) {
      this.logger.warn('Bỏ qua gửi vé email vì chưa cấu hình SMTP_HOST');
      return false;
    }
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
          : undefined,
      });
      const pdf = await this.ticketPdf.generate(tickets, batch);
      const eventName = tickets[0]?.event.name || 'sự kiện SportData';
      const fileCode = batch?.referenceCode || tickets[0]?.ticketCode || 'tickets';
      const athleteSummary = tickets.length === 1
        ? tickets[0].athlete.fullName
        : `${tickets.length} vận động viên`;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'SportData',
        to,
        subject: `[SportData] Vé tham dự ${eventName}`,
        text: `Hồ sơ ${athleteSummary} đã được SportData duyệt. Vé A6 chính thức được đính kèm trong email này và có thể dùng để check-in sự kiện.`,
        html: `<div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6"><h2 style="color:#0284c7">Vé tham dự ${this.escape(eventName)}</h2><p>Hồ sơ <strong>${this.escape(athleteSummary)}</strong> đã được SportData duyệt.</p><p>Vé A6 chính thức để in và đeo tại sự kiện được đính kèm. Mỗi vận động viên có một mã QR riêng để ban tổ chức check-in.</p></div>`,
        attachments: [{
          filename: `sportdata-${fileCode}-A6.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        }],
      });
      return true;
    } catch (error) {
      this.logger.error(`Không thể gửi vé đến ${to}`, error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  private escape(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] || character);
  }
}
