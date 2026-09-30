import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AthleteMediaType } from '@prisma/client';
import type { Request, Response } from 'express';
import { ParticipantsService } from './participants.service';
import { ParticipantAuthGuard } from './participant-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  CreatePublicRegistrationDto,
  ParticipantLoginDto,
  ParticipantRegisterDto,
  UpdateParticipantProfileDto,
  UpdateRegistrationStatusDto,
} from './dto/participant.dto';

type ParticipantRequest = Request & { participant: { id: string } };

@Controller('participant-auth')
export class ParticipantsController {
  constructor(private readonly service: ParticipantsService) {}

  @Post('register')
  register(@Body() dto: ParticipantRegisterDto) {
    return this.service.register(dto);
  }

  @Post('login')
  login(@Body() dto: ParticipantLoginDto) {
    return this.service.login(dto);
  }

  @Get('me')
  @UseGuards(ParticipantAuthGuard)
  me(@Req() request: ParticipantRequest) {
    return this.service.getProfile(request.participant.id);
  }

  @Patch('me')
  @UseGuards(ParticipantAuthGuard)
  updateMe(@Req() request: ParticipantRequest, @Body() dto: UpdateParticipantProfileDto) {
    return this.service.updateProfile(request.participant.id, dto);
  }

  @Post('me/media/:type')
  @UseGuards(ParticipantAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadMedia(
    @Req() request: ParticipantRequest,
    @Param('type') type: AthleteMediaType,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.upsertMedia(request.participant.id, type, file);
  }

  @Get('me/media/:type')
  @UseGuards(ParticipantAuthGuard)
  async ownMedia(
    @Req() request: ParticipantRequest,
    @Param('type') type: AthleteMediaType,
    @Res() response: Response,
  ) {
    const media = await this.service.getOwnMedia(request.participant.id, type);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=60');
    response.send(media.data);
  }

  @Get('avatar/:athleteId')
  async avatar(@Param('athleteId') athleteId: string, @Res() response: Response) {
    const media = await this.service.getMedia(athleteId, AthleteMediaType.AVATAR);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.send(media.data);
  }

  @Get('admin/registrations')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.READ_ONLY)
  adminRegistrations(@Query('eventId') eventId?: string) {
    return this.service.listAllRegistrations(eventId);
  }

  @Patch('admin/registrations/:id/status')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  updateRegistrationStatus(@Param('id') id: string, @Body() dto: UpdateRegistrationStatusDto) {
    return this.service.updateRegistrationStatus(id, dto.status);
  }

  @Get('admin/athletes/:athleteId/media/:type')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.READ_ONLY)
  async adminMedia(
    @Param('athleteId') athleteId: string,
    @Param('type') type: AthleteMediaType,
    @Res() response: Response,
  ) {
    const media = await this.service.getMedia(athleteId, type);
    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(media.data);
  }

  @Post('registrations')
  @UseGuards(ParticipantAuthGuard)
  createRegistration(@Req() request: ParticipantRequest, @Body() dto: CreatePublicRegistrationDto) {
    return this.service.createRegistration(request.participant.id, dto);
  }

  @Get('registrations')
  @UseGuards(ParticipantAuthGuard)
  registrations(@Req() request: ParticipantRequest) {
    return this.service.listRegistrations(request.participant.id);
  }
}
