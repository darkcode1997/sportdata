import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

type AuthenticatedRequest = Request & {
  user?: { id?: string };
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next.handle();

    return next.handle().pipe(tap((result: any) => {
      const actorUserId = request.user?.id || result?.user?.id || null;
      const segments = request.path.split('/').filter(Boolean);
      const entityType = segments[1] || segments[0] || 'unknown';
      const entityId = request.params?.id
        || request.params?.matchId
        || request.params?.eventId
        || result?.id
        || null;
      const bodyKeys = request.body && typeof request.body === 'object'
        ? Object.keys(request.body).filter((key) => !/password|token|secret/i.test(key))
        : [];

      void this.audit.record({
        actorUserId,
        action: request.method,
        entityType,
        entityId,
        method: request.method,
        path: request.originalUrl,
        metadata: { bodyKeys },
        ipAddress: request.ip,
        userAgent: request.get('user-agent') || undefined,
      }).catch((error) => this.logger.error(`Unable to write audit log: ${error.message}`));
    }));
  }
}
