import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [PrismaModule, MarketingModule],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
