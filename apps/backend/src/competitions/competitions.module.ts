import { Module } from '@nestjs/common';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { MatchesModule } from '../matches/matches.module';

@Module({ imports: [MatchesModule], controllers: [CompetitionsController], providers: [CompetitionsService] })
export class CompetitionsModule {}
