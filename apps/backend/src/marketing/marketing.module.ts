import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingWorkerService } from './marketing-worker.service';

@Module({
  imports: [SystemSettingsModule, AuthModule],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingWorkerService],
  exports: [MarketingService, MarketingWorkerService],
})
export class MarketingModule {}
