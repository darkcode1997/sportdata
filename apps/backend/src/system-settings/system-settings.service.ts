import { Injectable } from '@nestjs/common';
import { AthleteMediaType, DocumentVerificationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';

export type SystemFeatureKey =
  | 'identityOcrEnabled'
  | 'paymentsEnabled'
  | 'momoEnabled'
  | 'vnpayEnabled'
  | 'bankQrEnabled'
  | 'ticketEmailEnabled';

const SETTINGS_ID = 'global';

@Injectable()
export class SystemSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const stored = await this.prisma.systemSetting.findUnique({ where: { id: SETTINGS_ID } });
    const values = {
      identityOcrEnabled: stored?.identityOcrEnabled ?? this.envEnabled('IDENTITY_OCR_ENABLED'),
      paymentsEnabled: stored?.paymentsEnabled ?? this.envEnabled('PAYMENTS_ENABLED', true),
      momoEnabled: stored?.momoEnabled ?? this.envEnabled('MOMO_ENABLED'),
      vnpayEnabled: stored?.vnpayEnabled ?? this.envEnabled('VNPAY_ENABLED'),
      bankQrEnabled: stored?.bankQrEnabled ?? this.envEnabled('BANK_QR_ENABLED', true),
      ticketEmailEnabled: stored?.ticketEmailEnabled ?? this.envEnabled('TICKET_EMAIL_ENABLED', true),
    };
    const configured = {
      identityOcrEnabled: Boolean(process.env.FPT_AI_API_KEY?.trim()),
      paymentsEnabled: true,
      momoEnabled: Boolean(
        process.env.MOMO_PARTNER_CODE?.trim()
        && process.env.MOMO_ACCESS_KEY?.trim()
        && process.env.MOMO_SECRET_KEY?.trim(),
      ),
      vnpayEnabled: Boolean(
        process.env.VNPAY_TMN_CODE?.trim()
        && process.env.VNPAY_HASH_SECRET?.trim(),
      ),
      bankQrEnabled: true,
      ticketEmailEnabled: Boolean(process.env.SMTP_HOST?.trim()),
    };
    const effective = {
      identityOcrEnabled: values.identityOcrEnabled && configured.identityOcrEnabled,
      paymentsEnabled: values.paymentsEnabled,
      momoEnabled: values.paymentsEnabled && values.momoEnabled && configured.momoEnabled,
      vnpayEnabled: values.paymentsEnabled && values.vnpayEnabled && configured.vnpayEnabled,
      bankQrEnabled: values.paymentsEnabled && values.bankQrEnabled,
      ticketEmailEnabled: values.ticketEmailEnabled && configured.ticketEmailEnabled,
    };

    return {
      values,
      configured,
      effective,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      updatedAt: stored?.updatedAt ?? null,
    };
  }

  async update(dto: UpdateSystemSettingsDto) {
    const data = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => typeof value === 'boolean'),
    ) as UpdateSystemSettingsDto;
    await this.prisma.systemSetting.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
    if (dto.identityOcrEnabled === false) {
      await this.prisma.athleteMedia.updateMany({
        where: {
          type: { in: [AthleteMediaType.CCCD_FRONT, AthleteMediaType.CCCD_BACK, AthleteMediaType.PASSPORT] },
          verificationStatus: DocumentVerificationStatus.PENDING,
        },
        data: {
          verificationStatus: DocumentVerificationStatus.VERIFIED,
          verificationNote: 'Tự động duyệt vì OCR CCCD / Hộ chiếu đang tắt.',
          verifiedAt: new Date(),
          verifiedBy: 'SYSTEM:OCR_DISABLED',
        },
      });
    }
    return this.get();
  }

  async enabled(key: SystemFeatureKey) {
    const settings = await this.get();
    return settings.effective[key];
  }

  private envEnabled(name: string, fallback = false) {
    const value = process.env[name]?.trim();
    if (!value) return fallback;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
}
