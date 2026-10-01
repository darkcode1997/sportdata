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
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { GenerateDrawDto } from './dto/generate-draw.dto';
import { MatchStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('matches')
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({
    summary: 'List matches with filters and pagination',
    description:
      'Query matches by eventId, categoryId, date, status with pagination support.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'eventId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'sportId', required: false, type: String })
  @ApiQuery({ name: 'fopId', required: false, type: String })
  @ApiQuery({ name: 'venue', required: false, type: String })
  @ApiQuery({ name: 'athleteId', required: false, type: String })
  @ApiQuery({ name: 'date', required: false, type: String, example: '2024-01-15' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: MatchStatus,
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'pagination', required: false, enum: ['page', 'cursor'] })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Query() query: QueryMatchDto, @Req() request: { user?: unknown }) {
    return this.matchesService.findAll(query, Boolean(request.user));
  }

  @Get('event/:eventId/schedule-summary')
  @ApiOperation({
    summary: 'Get lightweight schedule metadata for an event',
    description: 'Returns match counts by date and the first live match without loading full match records.',
  })
  @ApiParam({ name: 'eventId', type: String, description: 'Event ID' })
  findScheduleSummary(@Param('eventId') eventId: string) {
    return this.matchesService.findScheduleSummary(eventId);
  }

  @Get('event/:eventId/category/:categoryId/draws')
  @ApiOperation({
    summary: 'Get the draw graphs of a category',
    description:
      'Returns round-robin, main, pool-winner and loser-bracket draws with explicit match progression links.',
  })
  @ApiParam({ name: 'eventId', type: String, description: 'Event ID' })
  @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
  @UseGuards(OptionalJwtAuthGuard)
  findDraws(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
    @Req() request: { user?: unknown },
  ) {
    return this.matchesService.findDraws(eventId, categoryId, Boolean(request.user));
  }

  @Post('event/:eventId/category/:categoryId/generate-draw')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @ApiOperation({
    summary: 'Generate a seeded elimination graph',
    description:
      'Builds explicit winner/loser progression links. Supports standard, ordered, random, country-separated and federation-separated seeding.',
  })
  @ApiParam({ name: 'eventId', type: String, description: 'Event ID' })
  @ApiParam({ name: 'categoryId', type: String, description: 'Category ID' })
  generateDraw(
    @Param('eventId') eventId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: GenerateDrawDto,
  ) {
    return this.matchesService.generateDraw(eventId, categoryId, dto);
  }

  @Post('event/:eventId/distribute-dates')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @ApiOperation({
    summary: 'Distribute unscheduled event matches evenly across event days',
    description:
      'Only changes matchDate for unlocked matches without an exact start time. Existing scheduled matches remain unchanged.',
  })
  @ApiParam({ name: 'eventId', type: String, description: 'Event ID' })
  distributeDates(@Param('eventId') eventId: string) {
    return this.matchesService.distributeEventMatchDates(eventId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single match by ID',
    description: 'Retrieve a match with all related data (event, category, athletes, winner).',
  })
  @ApiParam({ name: 'id', type: String, description: 'Match ID' })
  @UseGuards(OptionalJwtAuthGuard)
  findOne(@Param('id') id: string, @Req() request: { user?: unknown }) {
    return this.matchesService.findOne(id, Boolean(request.user));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR)
  @ApiOperation({
    summary: 'Create a new match',
    description: 'Create an unfinished match with participants and scheduling details. Results use the approval workflow.',
  })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.create(createMatchDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER, UserRole.VENUE_OPERATOR)
  @ApiOperation({
    summary: 'Update a match',
    description:
      'Update participants and scheduling details. Completed results must use the result approval workflow.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Match ID' })
  update(@Param('id') id: string, @Body() updateMatchDto: UpdateMatchDto) {
    return this.matchesService.update(id, updateMatchDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  @ApiOperation({
    summary: 'Delete a match',
    description: 'Permanently remove a match by ID.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Match ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.matchesService.remove(id);
  }

  @Get('event/:eventId/grouped')
  @ApiOperation({
    summary: 'Get matches grouped by date and category for an event',
    description:
      'Returns all matches for an event organized in a nested structure: date -> category -> matches, similar to sportdata.org schedule view.',
  })
  @ApiParam({ name: 'eventId', type: String, description: 'Event ID' })
  @UseGuards(OptionalJwtAuthGuard)
  findGrouped(@Param('eventId') eventId: string, @Req() request: { user?: unknown }) {
    return this.matchesService.findGroupedByEventId(eventId, Boolean(request.user));
  }
}
