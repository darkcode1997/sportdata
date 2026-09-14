import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecord = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  method?: string;
  path?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  record(data: AuditRecord) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: data.actorUserId || null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        method: data.method,
        path: data.path,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  async findAll(query: {
    actorUserId?: string;
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
