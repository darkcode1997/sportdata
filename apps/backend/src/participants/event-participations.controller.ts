import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateEventParticipationDto, UpdateEventParticipationStatusDto } from './dto/create-event-participation.dto';
import { EventParticipationsService } from './event-participations.service';
import { OptionalParticipantAuthGuard } from './optional-participant-auth.guard';
import { ParticipantAuthGuard } from './participant-auth.guard';

@Controller('participant-auth')
export class EventParticipationsController {
  constructor(private readonly service: EventParticipationsService) {}

  @Post('event-participations')
  @UseGuards(OptionalParticipantAuthGuard)
  create(@Body() dto: CreateEventParticipationDto, @Req() request: Request & { participant?: { id: string } }) {
    return this.service.create(dto, request.participant?.id);
  }

  @Get('event-participations')
  @UseGuards(ParticipantAuthGuard)
  listMine(@Req() request: Request & { participant: { id: string } }, @Query('eventId') eventId?: string) {
    return this.service.listMine(request.participant.id, eventId);
  }

  @Get('admin/event-participations')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.READ_ONLY)
  listAdmin(@Query('eventId') eventId?: string) {
    return this.service.listAdmin(eventId);
  }

  @Patch('admin/event-participations/:id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateEventParticipationStatusDto,
    @Req() request: Request & { user?: { email?: string; username?: string; sub?: string } }) {
    return this.service.updateStatus(id, dto, request.user?.email || request.user?.username || request.user?.sub || 'CMS');
  }
}
