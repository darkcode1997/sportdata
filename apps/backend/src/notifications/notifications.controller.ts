import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Req() request: { user: { id: string } }, @Query('limit') limit?: string) {
    return this.notifications.list(request.user.id, Number(limit));
  }

  @Patch('read-all')
  markAllRead(@Req() request: { user: { id: string } }) {
    return this.notifications.markAllRead(request.user.id);
  }

  @Patch(':id/read')
  markRead(@Req() request: { user: { id: string } }, @Param('id') id: string) {
    return this.notifications.markRead(request.user.id, id);
  }
}
