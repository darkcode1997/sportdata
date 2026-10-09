import { ImageVariant, ImageVariantPipe } from '../storage/image-variant';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Header,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryRegistrationSummaryDto } from './dto/query-registration-summary.dto';
import { QueryEligibleAthletesDto } from './dto/query-eligible-athletes.dto';
import { CreateEventFopDto, UpdateEventFopDto } from './dto/event-fop.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all events with filters' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  findAll(@Query() query: QueryEventsDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':id/categories/:categoryId/eligible-athletes')
  @ApiOperation({ summary: 'Tìm VĐV đủ điều kiện của một hạng đấu trong sự kiện' })
  findEligibleAthletes(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Query() query: QueryEligibleAthletesDto,
  ) {
    return this.eventsService.findEligibleAthletes(id, categoryId, query);
  }

  @Get(':id/registration-summary')
  @Header('Cache-Control', 'no-store')
  @Header('Vercel-CDN-Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Danh sách VĐV đăng ký theo hạng cân, dùng bộ lọc chung của sự kiện' })
  registrationSummary(@Param('id') id: string, @Query() query: QueryRegistrationSummaryDto) {
    return this.eventsService.registrationSummary(id, query);
  }

  @Get(':id/federation-filters')
  @ApiOperation({ summary: 'Danh sách đơn vị / CLB trong sự kiện cho bộ lọc chung' })
  federationFilters(@Param('id') id: string) {
    return this.eventsService.federationFilters(id);
  }

  @Get(':id/admin-detail')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.READ_ONLY)
  @ApiOperation({ summary: 'Get event details including selected athletes for editing' })
  findAdminDetail(@Param('id') id: string) {
    return this.eventsService.findOne(id, true);
  }

  @Post(':id/fops')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.GAMES_ADMIN)
  @ApiOperation({ summary: 'Add a floor/FOP to an event' })
  createFop(@Param('id') id: string, @Body() dto: CreateEventFopDto) {
    return this.eventsService.createFop(id, dto);
  }

  @Patch(':id/fops/:fopId')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.GAMES_ADMIN)
  @ApiOperation({ summary: 'Update an event floor/FOP' })
  updateFop(
    @Param('id') id: string,
    @Param('fopId') fopId: string,
    @Body() dto: UpdateEventFopDto,
  ) {
    return this.eventsService.updateFop(id, fopId, dto);
  }

  @Delete(':id/fops/:fopId')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.GAMES_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an unused floor/FOP from an event' })
  removeFop(@Param('id') id: string, @Param('fopId') fopId: string) {
    return this.eventsService.removeFop(id, fopId);
  }

  @Get(':id/ticket-background')
  async ticketBackground(
    @Param('id') id: string,
    @Res() response: Response,
    @Query('variant', ImageVariantPipe) variant?: ImageVariant,
  ) {
    const background = await this.eventsService.getTicketBackground(id, variant);
    if (background.url) {
      response.setHeader('Cache-Control', 'public, max-age=300');
      return response.redirect(302, background.url);
    }
    response.setHeader('Content-Type', background.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('ETag', `"${background.etag}"`);
    response.send(background.data);
  }

  @Patch(':id/ticket-background')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  uploadTicketBackground(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.eventsService.uploadTicketBackground(id, file);
  }

  @Delete(':id/ticket-background')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  removeTicketBackground(@Param('id') id: string) {
    return this.eventsService.removeTicketBackground(id);
  }

  @Get(':id/banner-image')
  async bannerImage(
    @Param('id') id: string,
    @Res() response: Response,
    @Query('variant', ImageVariantPipe) variant?: ImageVariant,
  ) {
    return this.sendEventImage(response, await this.eventsService.getEventImage(id, 'banner', variant));
  }

  @Patch(':id/banner-image')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  uploadBannerImage(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.eventsService.uploadEventImage(id, 'banner', file);
  }

  @Delete(':id/banner-image')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  removeBannerImage(@Param('id') id: string) {
    return this.eventsService.removeEventImage(id, 'banner');
  }

  @Get(':id/logo-image')
  async logoImage(
    @Param('id') id: string,
    @Res() response: Response,
    @Query('variant', ImageVariantPipe) variant?: ImageVariant,
  ) {
    return this.sendEventImage(response, await this.eventsService.getEventImage(id, 'logo', variant));
  }

  @Patch(':id/logo-image')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 6 * 1024 * 1024 } }))
  uploadLogoImage(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.eventsService.uploadEventImage(id, 'logo', file);
  }

  @Delete(':id/logo-image')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  removeLogoImage(@Param('id') id: string) {
    return this.eventsService.removeEventImage(id, 'logo');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event found' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @ApiOperation({ summary: 'Update event by ID' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event by ID' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  private sendEventImage(
    response: Response,
    image: { data?: Buffer; mimeType?: string; etag?: string; url?: string },
  ) {
    if (image.url) {
      response.setHeader('Cache-Control', 'public, max-age=300');
      return response.redirect(302, image.url);
    }
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Cache-Control', 'public, max-age=300');
    response.setHeader('ETag', `"${image.etag}"`);
    response.send(image.data);
  }
}
