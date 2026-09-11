import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FederationsService } from './federations.service';
import { CreateFederationDto } from './dto/create-federation.dto';
import { UpdateFederationDto } from './dto/update-federation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('federations')
export class FederationsController {
  constructor(private readonly federationsService: FederationsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Post()
  create(@Body() createFederationDto: CreateFederationDto) {
    return this.federationsService.create(createFederationDto);
  }

  @Get()
  findAll() {
    return this.federationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.federationsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFederationDto: UpdateFederationDto,
  ) {
    return this.federationsService.update(id, updateFederationDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.federationsService.remove(id);
  }
}
