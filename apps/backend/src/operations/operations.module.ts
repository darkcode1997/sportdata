import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { OperationsController } from './operations.controller';

@Module({
  controllers: [OperationsController],
  providers: [
    MetricsService,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class OperationsModule {}
