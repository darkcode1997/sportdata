import { Injectable, MessageEvent, NotFoundException, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { Observable, Subject, Subscription, interval } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

type EventChannel = {
  changes: Subject<MessageEvent>;
  subscribers: number;
  pending?: ReturnType<typeof setTimeout>;
};

@Injectable()
export class PublicEventStreamService implements OnModuleDestroy {
  private readonly channels = new Map<string, EventChannel>();
  private stopped = false;

  constructor(private readonly prisma: PrismaService) {}

  async stream(eventId: string): Promise<Observable<MessageEvent>> {
    const event = await this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');

    return new Observable((subscriber) => {
      if (this.stopped) {
        subscriber.error(new ServiceUnavailableException('Kênh cập nhật lịch đã ngắt kết nối'));
        return;
      }
      let channel = this.channels.get(eventId);
      if (!channel) {
        channel = { changes: new Subject<MessageEvent>(), subscribers: 0 };
        this.channels.set(eventId, channel);
      }
      channel.subscribers++;
      const subscriptions = new Subscription();
      subscriptions.add(channel.changes.subscribe(subscriber));
      subscriber.next({ type: 'ready', data: { eventId }, retry: 5000 });
      subscriptions.add(interval(15_000).subscribe(() => {
        subscriber.next({ type: 'heartbeat', data: { eventId } });
      }));
      return () => {
        subscriptions.unsubscribe();
        channel.subscribers--;
        if (channel.subscribers === 0) {
          clearTimeout(channel.pending);
          channel.changes.complete();
          if (this.channels.get(eventId) === channel) this.channels.delete(eventId);
        }
      };
    });
  }

  notifyScheduleChanged(eventId: string) {
    const channel = this.channels.get(eventId);
    if (!channel || channel.pending || this.stopped) return;
    // Coalesce scheduling/draw requests into one refresh per event per second.
    channel.pending = setTimeout(() => {
      channel.pending = undefined;
      channel.changes.next({ type: 'schedule-changed', data: { eventId } });
    }, 1000);
  }

  onModuleDestroy() {
    this.stopped = true;
    for (const channel of this.channels.values()) {
      clearTimeout(channel.pending);
      channel.changes.complete();
    }
    this.channels.clear();
  }
}
