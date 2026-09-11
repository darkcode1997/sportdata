import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
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
  ],
})
export class AppModule {}
