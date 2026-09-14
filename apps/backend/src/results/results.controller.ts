import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { EnterResultDto, ResultActionDto } from './dto/result-workflow.dto';
import { ResultsService } from './results.service';

@ApiTags('result-workflow')
@Controller('results')
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('matches/:matchId')
  @Roles(
    UserRole.GAMES_ADMIN,
    UserRole.SPORT_MANAGER,
    UserRole.VENUE_OPERATOR,
    UserRole.SCOREKEEPER,
    UserRole.RESULT_APPROVER,
    UserRole.READ_ONLY,
  )
  get(@Param('matchId') matchId: string) {
    return this.results.get(matchId);
  }

  @Post('matches/:matchId/enter')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.SCOREKEEPER)
  @ApiOperation({ summary: 'Enter or correct a draft result' })
  enter(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: EnterResultDto,
  ) {
    return this.results.enter(matchId, req.user.id, dto);
  }

  @Post('matches/:matchId/referee-confirm')
  @Roles(UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  confirm(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: ResultActionDto,
  ) {
    return this.results.confirm(matchId, req.user.id, dto.expectedVersion, dto.reason);
  }

  @Post('matches/:matchId/approve')
  @Roles(UserRole.GAMES_ADMIN, UserRole.RESULT_APPROVER)
  approve(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: ResultActionDto,
  ) {
    return this.results.approve(matchId, req.user.id, dto.expectedVersion, dto.reason);
  }

  @Post('matches/:matchId/publish')
  @Roles(UserRole.GAMES_ADMIN, UserRole.RESULT_APPROVER)
  publish(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: ResultActionDto,
  ) {
    return this.results.publish(matchId, req.user.id, dto.expectedVersion, dto.reason);
  }

  @Post('matches/:matchId/lock')
  @Roles(UserRole.GAMES_ADMIN, UserRole.RESULT_APPROVER)
  lock(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: ResultActionDto,
  ) {
    return this.results.lock(matchId, req.user.id, dto.expectedVersion, dto.reason);
  }

  @Post('matches/:matchId/reopen')
  @Roles(UserRole.GAMES_ADMIN)
  reopen(
    @Param('matchId') matchId: string,
    @Req() req: { user: { id: string } },
    @Body() dto: ResultActionDto,
  ) {
    return this.results.reopen(matchId, req.user.id, dto.expectedVersion, dto.reason);
  }
}
