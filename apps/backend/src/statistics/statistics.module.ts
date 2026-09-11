import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [PrismaModule],
  controllers: [StatisticsController, DashboardController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
