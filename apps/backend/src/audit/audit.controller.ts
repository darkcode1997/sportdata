import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  findAll(@Query() query: {
    actorUserId?: string;
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
  }) {
    return this.audit.findAll(query);
  }
}
