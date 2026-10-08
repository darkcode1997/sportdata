import { Body, Controller, Get, Header, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto';
import { SystemSettingsService } from './system-settings.service';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Controller('system-settings')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class SystemSettingsController {
  constructor(private readonly settings: SystemSettingsService) {}

  @Get('integrations')
  @Header('Cache-Control', 'no-store')
  integrations() {
    return this.settings.integrations();
  }

  @Patch('integrations')
  updateIntegrations(@Body() dto: UpdateIntegrationDto) {
    return this.settings.updateIntegrations(dto.values);
  }

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  update(@Body() dto: UpdateSystemSettingsDto) {
    return this.settings.update(dto);
  }
}
