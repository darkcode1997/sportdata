import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, finalize } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startedAt = process.hrtime.bigint();
    return next.handle().pipe(finalize(() => {
      const duration = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const route = request.route?.path || request.path || 'unknown';
      this.metrics.httpDuration.observe({
        method: request.method,
        route,
        status_code: String(response.statusCode),
      }, duration);
    }));
  }
}
