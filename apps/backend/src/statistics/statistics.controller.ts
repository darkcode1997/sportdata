import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { AthleteRankingsDto } from './dto/athlete-rankings.dto';
import { EventStandingsDto } from './dto/event-standings.dto';
import { MedalCountsDto } from './dto/medal-counts.dto';

@ApiTags('statistics')
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  @ApiOperation({ summary: 'Get statistics overview for the CMS' })
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('rankings/athletes')
  @ApiOperation({ summary: 'Get athlete rankings' })
  @ApiResponse({ status: 200, description: 'Athlete rankings retrieved successfully' })
  getAthleteRankings(@Query() query: AthleteRankingsDto) {
    return this.statisticsService.getAthleteRankings(query);
  }

  @Get('events/:eventId/standings')
  @ApiOperation({ summary: 'Get event standings' })
  @ApiParam({ name: 'eventId', description: 'Event ID' })
  @ApiResponse({ status: 200, description: 'Event standings retrieved successfully' })
  getEventStandings(
    @Param('eventId') eventId: string,
    @Query() query: EventStandingsDto,
  ) {
    return this.statisticsService.getEventStandings(eventId, query);
  }

  @Get('medals')
  @ApiOperation({ summary: 'Get medal counts' })
  @ApiResponse({ status: 200, description: 'Medal counts retrieved successfully' })
  getMedalCounts(@Query() query: MedalCountsDto) {
    return this.statisticsService.getMedalCounts(query);
  }
}
