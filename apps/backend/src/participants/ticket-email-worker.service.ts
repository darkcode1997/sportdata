import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { TicketEmailQueueService } from './ticket-email-queue.service';
import { TicketEmailService } from './ticket-email.service';
import { TicketNotFoundException, TicketNotIssuedException } from './ticket-availability.exceptions';
import { EventParticipationsService } from './event-participations.service';

@Injectable()
export class TicketEmailWorkerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(TicketEmailWorkerService.name);
  private timer?: NodeJS.Timeout;
  private activeTask?: Promise<void>;
  private started = false;
  private stopping = false;

  constructor(
    private readonly queue: TicketEmailQueueService,
    private readonly participants: ParticipantsService,
    private readonly email: TicketEmailService,
    private readonly eventParticipations: EventParticipationsService,
  ) {}

  onApplicationBootstrap() {
    if (this.started || this.stopping) return;
    this.started = true;
    this.logger.log('Đã bật xử lý thẻ/email nền trong backend');
    this.schedule(1000);
  }

  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    // Finish the current job before Prisma disconnects during shutdown.
    await this.activeTask;
  }

  private schedule(delay: number) {
    if (this.stopping) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.activeTask = this.processNext()
        .then((processed) => { this.schedule(processed ? 0 : 1000); })
        .catch((error) => {
          this.logger.error('Không thể đọc hàng đợi gửi thẻ', error instanceof Error ? error.stack : String(error));
          this.schedule(5000);
        })
        .finally(() => { this.activeTask = undefined; });
    }, delay);
    this.timer.unref();
  }

  async processNext() {
    const job = await this.queue.claim();
    if (!job) return false;
    const heartbeat = setInterval(() => {
      void this.queue.renew(job).catch((error) => {
        this.logger.error(`Không thể gia hạn tác vụ gửi thẻ ${job.id}`, error instanceof Error ? error.stack : String(error));
      });
    }, 30_000);
    try {
      if (!await this.email.isEnabled()) {
        await this.queue.finish(job, false);
        return true;
      }
      // Prepare tickets in the background; HTTP handlers only enqueue the job.
      const batch = job.referenceCode
        ? await this.participants.getSubmissionTickets(job.referenceCode, job.to, true)
        : { tickets: [job.ticketCode?.startsWith('SDP-')
          ? await this.eventParticipations.getIssuedTicket(job.ticketCode, true)
          : await this.participants.getIssuedTicket(job.ticketCode!, true)], meta: undefined };
      const sent = await this.email.send(job.to, batch.tickets, batch.meta);
      await this.queue.finish(job, sent);
    } catch (error) {
      if (error instanceof TicketNotIssuedException || error instanceof TicketNotFoundException) {
        // Revoked/deleted tickets must not be emailed from an old queued confirmation.
        await this.queue.finish(job, false);
      } else {
        await this.queue.retry(job, error);
      }
      this.logger.error(`Không thể xử lý tác vụ gửi thẻ ${job.id} (lần ${job.attempts})`, error instanceof Error ? error.stack : String(error));
    } finally {
      clearInterval(heartbeat);
    }
    return true;
  }
}
