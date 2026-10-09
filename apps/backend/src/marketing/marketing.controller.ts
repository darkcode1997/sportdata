import { Body, Controller, Get, Header, Headers, Param, Patch, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ParticipantAuthGuard } from '../participants/participant-auth.guard';
import { MarketingAccountStatusDto, MarketingCampaignStatusDto, MarketingPreferencesDto, MarketingUnsubscribeDto, MarketingUsersQueryDto } from './dto/marketing.dto';
import { MarketingService } from './marketing.service';
import { MarketingWorkerService } from './marketing-worker.service';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly service: MarketingService, private readonly worker: MarketingWorkerService) {}

  @Get('users')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  users(@Query() query: MarketingUsersQueryDto) { return this.service.listUsers(query); }

  @Patch('users/:id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  accountStatus(@Param('id') id: string, @Body() dto: MarketingAccountStatusDto) {
    return this.service.setAccountStatus(id, dto.isActive);
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  config() { return this.worker.readiness(); }

  @Patch('config')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async updateConfig(@Body() dto: MarketingCampaignStatusDto) {
    const result = await this.service.setAutomation(dto.enabled);
    if (dto.enabled) this.worker.kick();
    return result;
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  campaigns() { return this.service.campaigns(); }

  @Get('campaigns/:id/preview')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  preview(@Param('id') id: string) { return this.service.preview(id); }

  @Post('campaigns/:id/retry')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async retry(@Param('id') id: string) {
    const result = await this.service.retryFailed(id);
    this.worker.kick();
    return result;
  }

  @Get('campaigns/:id/deliveries')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  deliveries(@Param('id') id: string, @Query() query: MarketingUsersQueryDto) {
    return this.service.deliveries(id, query);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async campaignStatus(@Param('id') id: string, @Body() dto: MarketingCampaignStatusDto) {
    const result = await this.service.setCampaignStatus(id, dto.enabled);
    if (dto.enabled) this.worker.kick();
    return result;
  }

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  process() { return this.worker.drain(); }

  @Get('preferences')
  @UseGuards(ParticipantAuthGuard)
  preferences(@Req() req: { participant: { id: string } }) { return this.service.preferences(req.participant.id); }

  @Patch('preferences')
  @UseGuards(ParticipantAuthGuard)
  updatePreferences(@Req() req: { participant: { id: string } }, @Body() dto: MarketingPreferencesDto) {
    return this.service.updatePreferences(req.participant.id, dto);
  }

  // GET links only display a frontend confirmation; mail scanners cannot opt out.
  // RFC 8058 providers POST to this token-bound endpoint without login.
  @Post('unsubscribe')
  unsubscribe(@Query() query: MarketingUnsubscribeDto) { return this.service.unsubscribe(query.token); }

  @Get('cron')
  @Header('Cache-Control', 'no-store')
  cron(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET;
    const expected = Buffer.from(`Bearer ${secret || ''}`);
    const actual = Buffer.from(authorization || '');
    if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException();
    }
    return this.worker.drain(100, 180_000);
  }
}
