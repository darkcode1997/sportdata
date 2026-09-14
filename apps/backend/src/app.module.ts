import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SportsModule } from './sports/sports.module';
import { EventsModule } from './events/events.module';
import { AthletesModule } from './athletes/athletes.module';
import { CategoriesModule } from './categories/categories.module';
import { MatchesModule } from './matches/matches.module';
import { StatisticsModule } from './statistics/statistics.module';
import { CountriesModule } from './countries/countries.module';
import { FederationsModule } from './federations/federations.module';
import { BackupModule } from './backup/backup.module';
import { UsersModule } from './users/users.module';
import { ArticlesModule } from './articles/articles.module';
import { ContactsModule } from './contacts/contacts.module';
import { AuditModule } from './audit/audit.module';
import { SchedulingModule } from './scheduling/scheduling.module';
import { ResultsModule } from './results/results.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { OperationsModule } from './operations/operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.RATE_LIMIT_TTL_MS || 60_000),
      limit: Number(process.env.RATE_LIMIT_REQUESTS || 120),
    }]),
    PrismaModule,
    AuthModule,
    SportsModule,
    EventsModule,
    AthletesModule,
    CategoriesModule,
    MatchesModule,
    StatisticsModule,
    CountriesModule,
    FederationsModule,
    BackupModule,
    UsersModule,
    ArticlesModule,
    ContactsModule,
    AuditModule,
    SchedulingModule,
    ResultsModule,
    CompetitionsModule,
    OperationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
