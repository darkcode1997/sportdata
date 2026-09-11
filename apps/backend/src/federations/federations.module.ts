import { Module } from '@nestjs/common';
import { FederationsService } from './federations.service';
import { FederationsController } from './federations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FederationsController],
  providers: [FederationsService],
  exports: [FederationsService],
})
export class FederationsModule {}
