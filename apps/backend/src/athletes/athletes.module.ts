import { Module } from '@nestjs/common';
import { AthletesService } from './athletes.service';
import { AthletesController } from './athletes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AthletesController],
  providers: [AthletesService],
  exports: [AthletesService],
})
export class AthletesModule {}
