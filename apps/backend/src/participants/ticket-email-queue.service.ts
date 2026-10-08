import { Injectable } from '@nestjs/common';
import { Prisma, TicketEmailJob, TicketEmailJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60_000;

@Injectable()
export class TicketEmailQueueService {
  constructor(private readonly prisma: PrismaService) {}

  enqueueTicket(transaction: Prisma.TransactionClient, to: string, ticketCode: string) {
    return transaction.ticketEmailJob.create({ data: { to, ticketCode } });
  }

  enqueueSubmission(transaction: Prisma.TransactionClient, to: string, referenceCode: string) {
    return transaction.ticketEmailJob.create({ data: { to, referenceCode } });
  }

  async claim() {
    // A worker that crashes during its last attempt must not leave a job RUNNING forever.
    await this.prisma.ticketEmailJob.updateMany({
      where: {
        status: TicketEmailJobStatus.RUNNING,
        attempts: { gte: MAX_ATTEMPTS },
        lockedAt: { lt: new Date(Date.now() - LEASE_MS) },
      },
      data: { status: TicketEmailJobStatus.FAILED, lockedAt: null, lockToken: null },
    });
    const jobs = await this.prisma.$queryRaw<TicketEmailJob[]>`
      UPDATE "TicketEmailJob"
      SET "status" = 'RUNNING', "attempts" = "attempts" + 1,
          "lockedAt" = NOW(), "lockToken" = ${randomUUID()}, "updatedAt" = NOW()
      WHERE "id" = (
        SELECT "id" FROM "TicketEmailJob"
        WHERE "attempts" < ${MAX_ATTEMPTS} AND (
          ("status" = 'PENDING' AND "availableAt" <= NOW()) OR
          ("status" = 'RUNNING' AND "lockedAt" < NOW() - ${LEASE_MS} * INTERVAL '1 millisecond')
        )
        ORDER BY "availableAt", "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *
    `;
    return jobs[0] || null;
  }

  renew(job: TicketEmailJob) {
    return this.prisma.ticketEmailJob.updateMany({
      where: { id: job.id, status: TicketEmailJobStatus.RUNNING, lockToken: job.lockToken },
      data: { lockedAt: new Date() },
    });
  }

  finish(job: TicketEmailJob, sent: boolean) {
    return this.prisma.ticketEmailJob.updateMany({
      where: { id: job.id, status: TicketEmailJobStatus.RUNNING, lockToken: job.lockToken },
      data: {
        status: sent ? TicketEmailJobStatus.SENT : TicketEmailJobStatus.SKIPPED,
        sentAt: sent ? new Date() : null,
        lockedAt: null,
        lockToken: null,
        lastError: null,
      },
    });
  }

  retry(job: TicketEmailJob, error: unknown) {
    const failed = job.attempts >= MAX_ATTEMPTS;
    return this.prisma.ticketEmailJob.updateMany({
      where: { id: job.id, status: TicketEmailJobStatus.RUNNING, lockToken: job.lockToken },
      data: {
        status: failed ? TicketEmailJobStatus.FAILED : TicketEmailJobStatus.PENDING,
        availableAt: new Date(Date.now() + 30_000 * 2 ** (job.attempts - 1)),
        lockedAt: null,
        lockToken: null,
        lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      },
    });
  }
}
