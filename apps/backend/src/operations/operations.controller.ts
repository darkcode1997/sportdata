import { Controller, Get, Headers, Res, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

@Controller()
export class OperationsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('health/live')
  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', database: 'ok', timestamp: new Date().toISOString() };
    } catch {
      throw new ServiceUnavailableException({ status: 'not-ready', database: 'unavailable' });
    }
  }

  @Get('metrics')
  async getMetrics(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ) {
    const token = process.env.METRICS_TOKEN;
    if (token && authorization !== `Bearer ${token}`) throw new UnauthorizedException();
    response.setHeader('Content-Type', this.metrics.contentType());
    response.send(await this.metrics.output());
  }
}
