import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  CreateEntryDto,
  CreateTeamDto,
  GenerateHeatsDto,
  GenerateRoundRobinDto,
  UpdateEntrySeedDto,
} from './dto/competition.dto';
import { CompetitionsService } from './competitions.service';

@ApiTags('competition-entries')
@Controller('competitions')
@UseGuards(JwtAuthGuard)
export class CompetitionsController {
  constructor(private readonly competitions: CompetitionsService) {}

  @Get('events/:eventId/teams')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.SCOREKEEPER, UserRole.RESULT_APPROVER, UserRole.READ_ONLY)
  listTeams(@Param('eventId') eventId: string) {
    return this.competitions.listTeams(eventId);
  }

  @Post('events/:eventId/teams')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  createTeam(@Param('eventId') eventId: string, @Body() dto: CreateTeamDto) {
    return this.competitions.createTeam(eventId, dto);
  }

  @Get('events/:eventId/categories/:categoryId/entries')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR, UserRole.SCOREKEEPER, UserRole.RESULT_APPROVER, UserRole.READ_ONLY)
  listEntries(@Param('eventId') eventId: string, @Param('categoryId') categoryId: string) {
    return this.competitions.listEntries(eventId, categoryId);
  }

  @Post('events/:eventId/categories/:categoryId/entries')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  createEntry(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.competitions.createEntry(eventId, categoryId, dto);
  }

  @Patch('entries/:entryId/seed')
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  updateEntrySeed(@Param('entryId') entryId: string, @Body() dto: UpdateEntrySeedDto) {
    return this.competitions.updateEntrySeed(entryId, dto.seed ?? null);
  }

  @Post('events/:eventId/categories/:categoryId/heats/generate')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  generateHeats(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: GenerateHeatsDto,
  ) {
    return this.competitions.generateHeats(eventId, categoryId, dto);
  }

  @Post('events/:eventId/categories/:categoryId/round-robin/generate')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  generateRoundRobin(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: GenerateRoundRobinDto,
  ) {
    return this.competitions.generateRoundRobin(eventId, categoryId, dto);
  }
}
