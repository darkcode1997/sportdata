import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  AutoScheduleDto,
  CreateSessionDto,
  CreateVenueDto,
  GenerateTimeSlotsDto,
  LockScheduleDto,
  UpsertSchedulingRuleDto,
} from './dto/scheduling.dto';
import { SchedulingService } from './scheduling.service';

@ApiTags('scheduling')
@Controller('scheduling')
@UseGuards(JwtAuthGuard)
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Get('events/:eventId/overview')
  @Roles(
    UserRole.GAMES_ADMIN,
    UserRole.SPORT_MANAGER,
    UserRole.VENUE_OPERATOR,
    UserRole.SCOREKEEPER,
    UserRole.RESULT_APPROVER,
    UserRole.READ_ONLY,
  )
  getEventOverview(@Param('eventId') eventId: string) {
    return this.scheduling.getEventOverview(eventId);
  }

  @Get('events/:eventId/readiness')
  @Roles(
    UserRole.GAMES_ADMIN,
    UserRole.SPORT_MANAGER,
    UserRole.VENUE_OPERATOR,
    UserRole.SCOREKEEPER,
    UserRole.RESULT_APPROVER,
    UserRole.READ_ONLY,
  )
  @ApiOperation({ summary: 'Run the event go-live readiness gate' })
  getEventReadiness(@Param('eventId') eventId: string) {
    return this.scheduling.getEventReadiness(eventId);
  }

  @Get('venues')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR, UserRole.READ_ONLY)
  listVenues(@Query('eventId') eventId?: string) {
    return this.scheduling.listVenues(eventId);
  }

  @Post('venues')
  @Roles(UserRole.GAMES_ADMIN)
  createVenue(@Body() dto: CreateVenueDto) {
    return this.scheduling.createVenue(dto);
  }

  @Delete('venues/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.GAMES_ADMIN)
  removeVenue(@Param('id') id: string) {
    return this.scheduling.removeVenue(id);
  }

  @Get('events/:eventId/sessions')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR, UserRole.READ_ONLY)
  listSessions(@Param('eventId') eventId: string) {
    return this.scheduling.listSessions(eventId);
  }

  @Post('events/:eventId/sessions')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR)
  createSession(@Param('eventId') eventId: string, @Body() dto: CreateSessionDto) {
    return this.scheduling.createSession(eventId, dto);
  }

  @Post('sessions/:sessionId/time-slots/generate')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR)
  generateTimeSlots(@Param('sessionId') sessionId: string, @Body() dto: GenerateTimeSlotsDto) {
    return this.scheduling.generateTimeSlots(sessionId, dto);
  }

  @Get('events/:eventId/rules')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR, UserRole.READ_ONLY)
  listRules(@Param('eventId') eventId: string) {
    return this.scheduling.listRules(eventId);
  }

  @Patch('events/:eventId/rules/:sportId')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  upsertRule(
    @Param('eventId') eventId: string,
    @Param('sportId') sportId: string,
    @Body() dto: UpsertSchedulingRuleDto,
  ) {
    return this.scheduling.upsertRule(eventId, sportId, dto);
  }

  @Post('events/:eventId/auto-schedule')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @ApiOperation({ summary: 'Dry-run or apply the constraint-aware event scheduler' })
  autoSchedule(@Param('eventId') eventId: string, @Body() dto: AutoScheduleDto) {
    return this.scheduling.autoSchedule(eventId, dto);
  }

  @Get('events/:eventId/conflicts')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR, UserRole.READ_ONLY)
  reportConflicts(@Param('eventId') eventId: string) {
    return this.scheduling.reportConflicts(eventId);
  }

  @Patch('matches/:matchId/lock')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR)
  lockMatch(
    @Param('matchId') matchId: string,
    @Req() request: { user: { id: string } },
    @Body() dto: LockScheduleDto,
  ) {
    return this.scheduling.lockMatch(matchId, request.user.id, dto);
  }
}
