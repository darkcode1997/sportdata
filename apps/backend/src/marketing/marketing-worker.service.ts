import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { MarketingDelivery } from '@prisma/client';
import { waitUntil } from '@vercel/functions';
import { randomUUID } from 'crypto';
import { setTimeout as sleep } from 'timers/promises';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { MarketingService } from './marketing.service';
import { marketingTemplate } from './marketing-template';

const SMTP_FIELDS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'];

@Injectable()
export class MarketingWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MarketingWorkerService.name);
  private timer?: NodeJS.Timeout;
  private active?: Promise<{ processed: number; ready: boolean }>;
  private stopping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketing: MarketingService,
    private readonly settings: SystemSettingsService,
  ) {}

  onApplicationBootstrap() {
    // Serverless work is attached to the publishing request/cron invocation.
    if (!process.env.VERCEL) this.schedule();
  }

  private schedule() {
    if (this.stopping) return;
    this.timer = setTimeout(() => {
      void this.drain().catch(error => this.logger.error(error instanceof Error ? error.message : 'Marketing worker failed'))
        .finally(() => this.schedule());
    }, 15_000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    await this.active;
  }

  kick() {
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') return;
    const task = this.drain(100, 180_000).catch(error => {
      this.logger.error(error instanceof Error ? error.message : 'Marketing worker failed');
    });
    if (process.env.VERCEL) waitUntil(task);
  }

  async readiness() {
    const integration = await this.settings.integrationValues(SMTP_FIELDS);
    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '');
    let validUrl = false;
    try {
      const url = new URL(frontendUrl || '');
      validUrl = url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:');
    } catch { /* CMS shows the missing URL configuration. */ }
    return {
      enabled: await this.marketing.automationEnabled(),
      smtpConfigured: Boolean(integration.SMTP_HOST && (integration.SMTP_FROM || integration.SMTP_USER)),
      frontendConfigured: validUrl,
      production: !process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'production',
    };
  }

  drain(limit = 10, budgetMs = 40_000) {
    if (this.active) return this.active;
    this.active = this.runBatch(limit, budgetMs).finally(() => { this.active = undefined; });
    return this.active;
  }

  private async claim() {
    await this.prisma.marketingDelivery.updateMany({
      where: { status: 'RUNNING', attempts: { gte: 5 }, lockedAt: { lt: new Date(Date.now() - 300_000) } },
      data: { status: 'FAILED', lockedAt: null, lockToken: null, lastError: 'Worker interrupted on final attempt' },
    });
    const jobs = await this.prisma.$queryRaw<MarketingDelivery[]>`
      UPDATE "MarketingDelivery" SET "status" = 'RUNNING', "attempts" = "attempts" + 1,
        "lockedAt" = NOW(), "lockToken" = ${randomUUID()}, "updatedAt" = NOW()
      WHERE "id" = (
        SELECT d."id" FROM "MarketingDelivery" d
        JOIN "MarketingCampaign" c ON c."id" = d."campaignId"
        WHERE c."enabled" = true AND d."attempts" < 5 AND (
          (d."status" = 'PENDING' AND d."availableAt" <= NOW()) OR
          (d."status" = 'RUNNING' AND d."lockedAt" < NOW() - INTERVAL '5 minutes')
        ) ORDER BY d."availableAt", d."createdAt"
        FOR UPDATE OF d SKIP LOCKED LIMIT 1
      ) RETURNING *
    `;
    return jobs[0];
  }

  private createTransport(config: Record<string, string | undefined>) {
    const port = Number(config.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: config.SMTP_HOST, port, secure: config.SMTP_SECURE === 'true' || port === 465,
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
    });
  }

  private async runBatch(limit: number, budgetMs: number) {
    const status = await this.readiness();
    if (!status.enabled || !status.smtpConfigured || !status.frontendConfigured || !status.production) {
      return { processed: 0, ready: false };
    }
    const config = await this.settings.integrationValues(SMTP_FIELDS);
    const transport = this.createTransport(config);
    const startedAt = Date.now();
    let processed = 0;
    try {
      while (!this.stopping && processed < limit && Date.now() - startedAt < budgetMs) {
        if (!await this.marketing.automationEnabled()) break;
        const job = await this.claim();
        if (!job) break;
        try {
          const item = await this.prisma.marketingDelivery.findUnique({
            where: { id: job.id }, include: {
              account: { select: {
                email: true, displayName: true, isActive: true, verificationStatus: true,
                marketingEnabled: true, marketingConsentAt: true, marketingEvents: true,
                marketingArticles: true, marketingToken: true,
              } },
              campaign: true,
            },
          });
          if (!item) continue;
          const { account, campaign } = item;
          const source = campaign.kind === 'EVENT'
            ? await this.prisma.event.findUnique({ where: { id: campaign.sourceId }, select: { isPublished: true } })
            : await this.prisma.article.findUnique({ where: { id: campaign.sourceId }, select: { isPublished: true, publishedAt: true, slug: true } });
          if (source && 'publishedAt' in source && source.publishedAt && source.publishedAt > new Date()) {
            await this.prisma.marketingDelivery.updateMany({
              where: { id: job.id, status: 'RUNNING', lockToken: job.lockToken },
              data: { status: 'PENDING', attempts: { decrement: 1 }, availableAt: source.publishedAt, lockedAt: null, lockToken: null },
            });
            processed++;
            continue;
          }
          const allowed = account.isActive && account.verificationStatus === 'VERIFIED'
            && account.marketingEnabled && account.marketingConsentAt
            && account.marketingConsentAt <= campaign.createdAt
            && (campaign.kind === 'EVENT' ? account.marketingEvents : account.marketingArticles)
            && source?.isPublished;
          if (!allowed) {
            await this.finish(job, 'SKIPPED');
          } else if (!campaign.enabled || !await this.marketing.automationEnabled()) {
            await this.prisma.marketingDelivery.updateMany({
              where: { id: job.id, lockToken: job.lockToken, status: 'RUNNING' },
              data: { status: 'PENDING', attempts: { decrement: 1 }, lockToken: null, lockedAt: null },
            });
            break;
          } else {
            const base = process.env.FRONTEND_URL!.replace(/\/$/, '');
            const unsubscribeUrl = `${base}/email/unsubscribe?token=${encodeURIComponent(account.marketingToken)}`;
            const oneClickUrl = new URL(`/api/marketing/unsubscribe?token=${encodeURIComponent(account.marketingToken)}`,
              process.env.BACKEND_PUBLIC_URL || base).href;
            await transport.sendMail({
              from: config.SMTP_FROM || config.SMTP_USER,
              to: account.email,
              ...marketingTemplate({
                name: account.displayName, title: campaign.title, summary: campaign.summary,
                kind: campaign.kind, imageUrl: campaign.imageUrl,
                url: new URL(source && 'slug' in source && typeof source.slug === 'string'
                  ? `/news/${encodeURIComponent(source.slug)}` : campaign.path, base).href, unsubscribeUrl,
              }),
              headers: { 'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
              messageId: `<marketing-${job.id}@${new URL(base).hostname}>`,
            });
            await this.finish(job, 'SENT');
          }
        } catch (error) {
          // Keep credentials and recipient addresses out of operational errors.
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : 'SEND_ERROR';
          await this.prisma.marketingDelivery.updateMany({
            where: { id: job.id, status: 'RUNNING', lockToken: job.lockToken },
            data: {
              status: job.attempts >= 5 ? 'FAILED' : 'PENDING',
              availableAt: new Date(Date.now() + 60_000 * 2 ** (job.attempts - 1)),
              lockedAt: null, lockToken: null, lastError: `Email delivery failed (${code})`,
            },
          });
        }
        processed++;
        await sleep(1000);
      }
    } finally { transport.close(); }
    return { processed, ready: true };
  }

  private finish(job: MarketingDelivery, status: string) {
    return this.prisma.marketingDelivery.updateMany({
      where: { id: job.id, status: 'RUNNING', lockToken: job.lockToken },
      data: { status, sentAt: status === 'SENT' ? new Date() : null, lockedAt: null, lockToken: null, lastError: null },
    });
  }
}
