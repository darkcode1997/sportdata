import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type NotificationDatabase = PrismaService | Prisma.TransactionClient;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const [items, unreadCount] = await Promise.all([
      this.prisma.cmsNotification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.cmsNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.cmsNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (!updated.count) throw new NotFoundException('Không tìm thấy thông báo');
    return { read: true };
  }

  async markAllRead(userId: string) {
    const updated = await this.prisma.cmsNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: updated.count };
  }

  async notifyRegistration(
    database: NotificationDatabase,
    registrationId: string,
    type: 'REGISTRATION_CREATED' | 'REGISTRATION_STATUS' | 'REGISTRATION_PAYMENT',
    title: string,
    detail: string,
  ) {
    const registration = await database.eventRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        eventId: true,
        ticketCode: true,
        event: { select: { name: true } },
        athlete: { select: { fullName: true } },
        category: { select: { name: true } },
      },
    });
    if (!registration) return;
    const users = await database.user.findMany({
      where: {
        isActive: true,
        role: { in: [UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.READ_ONLY] },
      },
      select: { id: true },
    });
    if (!users.length) return;
    await database.cmsNotification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        eventId: registration.eventId,
        registrationId: registration.id,
        type,
        title,
        message: `${registration.athlete.fullName} · ${registration.category.name} · ${detail} · ${registration.event.name}`,
        href: `/cms/events/${registration.eventId}?tab=registrations`,
      })),
    });
  }
}
