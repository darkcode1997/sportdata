import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ParticipantAuthGuard } from './participant-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AccountRolesService } from './account-roles.service';
import { AccountClassificationDto, CreateStaffRegistrationDto, ProfessionalReviewDto, ReviewStaffRegistrationDto } from './dto/account-roles.dto';

@Controller('participant-roles')
export class AccountRolesController {
  constructor(private readonly service: AccountRolesService) {}

  @Post('applications')
  @UseGuards(ParticipantAuthGuard)
  apply(@Req() req: { participant: { id: string } }, @Body() dto: CreateStaffRegistrationDto) { return this.service.apply(req.participant.id, dto); }

  @Get('applications/me')
  @UseGuards(ParticipantAuthGuard)
  mine(@Req() req: { participant: { id: string } }) { return this.service.myApplications(req.participant.id); }

  @Patch('accounts/me/type')
  @UseGuards(ParticipantAuthGuard)
  requestType(@Req() req: { participant: { id: string } }, @Body() dto: AccountClassificationDto) {
    return this.service.classify(req.participant.id, dto);
  }

  @Patch('applications/:id/cancel')
  @UseGuards(ParticipantAuthGuard)
  cancel(@Req() req: { participant: { id: string } }, @Param('id') id: string) { return this.service.cancel(req.participant.id, id); }

  @Get('events/:id/applications')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.READ_ONLY)
  list(@Param('id') id: string) { return this.service.forEvent(id); }

  @Patch('applications/:id/review')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  review(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: ReviewStaffRegistrationDto) { return this.service.review(id, req.user.id, dto); }

  @Patch('accounts/:id/type')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  classify(@Param('id') id: string, @Body() dto: AccountClassificationDto) { return this.service.classify(id, dto); }

  @Patch('accounts/:id/review')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  reviewAccount(@Req() req: { user: { id: string } }, @Param('id') id: string, @Body() dto: ProfessionalReviewDto) { return this.service.reviewAccount(id, req.user.id, dto); }
}
