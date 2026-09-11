import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get CMS dashboard counters' })
  getStats() {
    return this.statisticsService.getDashboardStats();
  }

  @Get('recent-matches')
  @ApiOperation({ summary: 'Get recent matches for the CMS dashboard' })
  getRecentMatches() {
    return this.statisticsService.getRecentMatches();
  }

  @Get('events-chart')
  @ApiOperation({ summary: 'Get seven-month event and match trend' })
  getEventsChart() {
    return this.statisticsService.getEventsChart();
  }
}
