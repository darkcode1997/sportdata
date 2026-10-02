import { ScoreboardService } from './scoreboard.service';
import { Module } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { MatchesModule } from '../matches/matches.module';

@Module({ imports: [MatchesModule], controllers: [ResultsController], providers: [ResultsService, ScoreboardService] })
export class ResultsModule {}
