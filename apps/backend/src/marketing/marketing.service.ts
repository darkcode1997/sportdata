import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MarketingPreferencesDto, MarketingUsersQueryDto } from './dto/marketing.dto';
import { marketingTemplate, plainSummary } from './marketing-template';

const preferenceSelect = {
  marketingEnabled: true, marketingEvents: true, marketingArticles: true,
  marketingConsentAt: true, marketingUnsubscribedAt: true,
} as const;

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async automationEnabled() {
    const setting = await this.prisma.integrationSetting.findUnique({ where: { name: 'marketing.email.enabled' } });
    return setting ? setting.value === 'true' : process.env.MARKETING_EMAIL_ENABLED !== 'false';
  }

  async setAutomation(enabled: boolean) {
    await this.prisma.integrationSetting.upsert({
      where: { name: 'marketing.email.enabled' },
      create: { name: 'marketing.email.enabled', value: String(enabled) },
      update: { value: String(enabled) },
    });
    return { enabled };
  }

  async listUsers(query: MarketingUsersQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.ParticipantAccountWhereInput = {
      ...(query.accountType ? { accountType: query.accountType } : {}),
      ...(query.subscription ? { marketingEnabled: query.subscription === 'subscribed' } : {}),
      ...(search ? { OR: ['email', 'displayName', 'phone'].map(field => ({
        [field]: { contains: search, mode: 'insensitive' },
      })) } : {}),
    };
    const [items, total, subscribed, active] = await Promise.all([
      this.prisma.participantAccount.findMany({
        where, skip: (query.page - 1) * query.limit, take: query.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, displayName: true, phone: true, accountType: true,
          isActive: true, verificationStatus: true, createdAt: true, ...preferenceSelect,
          professionalSummary: true,
          updatedAt: true, verificationNote: true, verificationReviewedAt: true,
          country: { select: { name: true } },
          federation: { select: { name: true } },
        },
      }),
      this.prisma.participantAccount.count({ where }),
      this.prisma.participantAccount.count({ where: { marketingEnabled: true, isActive: true } }),
      this.prisma.participantAccount.count({ where: { isActive: true } }),
    ]);
    return { items, total, subscribed, active, page: query.page, limit: query.limit };
  }

  async setAccountStatus(id: string, isActive: boolean) {
    const account = await this.prisma.participantAccount.findUnique({ where: { id }, select: { id: true } });
    if (!account) throw new NotFoundException('Không tìm thấy người dùng SportData');
    return this.prisma.participantAccount.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } });
  }

  async preferences(id: string) {
    const account = await this.prisma.participantAccount.findUnique({ where: { id }, select: preferenceSelect });
    if (!account) throw new NotFoundException('Không tìm thấy tài khoản');
    return account;
  }

  async updatePreferences(id: string, dto: MarketingPreferencesDto) {
    const previous = await this.preferences(id);
    return this.prisma.participantAccount.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.marketingEnabled ? {
          marketingConsentAt: previous.marketingEnabled ? previous.marketingConsentAt : new Date(),
          marketingUnsubscribedAt: null,
          // Old links must not opt out a renewed subscription.
          ...(!previous.marketingEnabled ? { marketingToken: randomUUID() } : {}),
        } : { marketingUnsubscribedAt: new Date() }),
      },
      select: preferenceSelect,
    });
  }

  async unsubscribe(token: string) {
    await this.prisma.participantAccount.updateMany({
      where: { marketingToken: token },
      data: { marketingEnabled: false, marketingUnsubscribedAt: new Date() },
    });
    return { message: 'Đã xử lý yêu cầu hủy nhận email giới thiệu SportData.' };
  }

  async enqueuePublication(tx: Prisma.TransactionClient, source: {
    id: string; kind: 'EVENT' | 'ARTICLE'; title: string; summary?: string | null;
    path: string; imageUrl?: string | null; availableAt?: Date;
  }) {
    // Source publication and its outbox commit together. Unique source prevents
    // another campaign on edits, concurrent publishing, or republishing.
    const id = randomUUID();
    const inserted = await tx.marketingCampaign.createMany({
      data: {
        id, kind: source.kind, sourceId: source.id, title: source.title,
        summary: plainSummary(source.summary || 'Khám phá thông tin mới nhất từ cộng đồng SportData.'),
        path: source.path, imageUrl: source.imageUrl,
      },
      skipDuplicates: true,
    });
    if (!inserted.count) return;
    const topic = source.kind === 'EVENT' ? Prisma.sql`"marketingEvents"` : Prisma.sql`"marketingArticles"`;
    await tx.$executeRaw`
      INSERT INTO "MarketingDelivery" ("id", "campaignId", "accountId", "availableAt", "updatedAt")
      SELECT gen_random_uuid()::text, ${id}, "id", ${source.availableAt || new Date()}, NOW()
      FROM "ParticipantAccount"
      WHERE "isActive" = true AND "marketingEnabled" = true AND ${topic} = true
        AND "verificationStatus" = 'VERIFIED'
      ON CONFLICT ("campaignId", "accountId") DO NOTHING
    `;
  }

  async campaigns() {
    const campaigns = await this.prisma.marketingCampaign.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    const grouped = await this.prisma.marketingDelivery.groupBy({
      by: ['campaignId', 'status'], where: { campaignId: { in: campaigns.map(item => item.id) } }, _count: true,
    });
    return campaigns.map(campaign => ({ ...campaign, counts: Object.fromEntries(
      grouped.filter(item => item.campaignId === campaign.id).map(item => [item.status, item._count]),
    ) }));
  }

  async setCampaignStatus(id: string, enabled: boolean) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');
    return this.prisma.marketingCampaign.update({ where: { id }, data: { enabled } });
  }

  async deliveries(id: string, query: MarketingUsersQueryDto) {
    const where = { campaignId: id };
    const [items, total] = await Promise.all([
      this.prisma.marketingDelivery.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
        select: {
          id: true, status: true, attempts: true, sentAt: true, availableAt: true, lastError: true,
          account: { select: { displayName: true, email: true } },
        },
      }), this.prisma.marketingDelivery.count({ where }),
    ]);
    return { items, total };
  }

  async preview(id: string) {
    const campaign = await this.prisma.marketingCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');
    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    return marketingTemplate({
      name: 'Người dùng SportData', title: campaign.title, summary: campaign.summary,
      kind: campaign.kind, imageUrl: campaign.imageUrl, url: new URL(campaign.path, base).href,
      unsubscribeUrl: new URL('/email/unsubscribe', base).href,
    });
  }

  async retryFailed(id: string) {
    return this.prisma.marketingDelivery.updateMany({
      where: { campaignId: id, status: 'FAILED' },
      data: { status: 'PENDING', attempts: 0, availableAt: new Date(), lastError: null, lockedAt: null, lockToken: null },
    });
  }
}
