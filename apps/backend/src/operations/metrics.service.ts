import { Injectable, OnModuleInit } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, register } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly httpDuration = (register.getSingleMetric('sportdata_http_request_duration_seconds')
    || new Histogram({
      name: 'sportdata_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    })) as Histogram<string>;

  onModuleInit() {
    if (!register.getSingleMetric('sportdata_process_cpu_user_seconds_total')) {
      collectDefaultMetrics({ prefix: 'sportdata_' });
    }
  }

  output() {
    return register.metrics();
  }

  contentType() {
    return register.contentType;
  }
}
