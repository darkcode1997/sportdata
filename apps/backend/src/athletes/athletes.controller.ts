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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AthletesService } from './athletes.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { QueryAthletesDto } from './dto/query-athletes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('athletes')
@Controller('athletes')
export class AthletesController {
  constructor(private readonly athletesService: AthletesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @ApiOperation({ summary: 'Create a new athlete' })
  @ApiResponse({ status: 201, description: 'Athlete created successfully' })
  create(@Body() createAthleteDto: CreateAthleteDto) {
    return this.athletesService.create(createAthleteDto);
  }

  @Post(':id/avatar')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  uploadAvatar(@Param('id') id: string, @UploadedFile() file?: Express.Multer.File) {
    return this.athletesService.uploadAvatar(id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all athletes with search and filters' })
  @ApiResponse({ status: 200, description: 'Athletes retrieved successfully' })
  findAll(@Query() query: QueryAthletesDto) {
    return this.athletesService.findAll(query);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Get country facets for the current athlete filters' })
  getFilterOptions(@Query() query: QueryAthletesDto) {
    return this.athletesService.getFilterOptions(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get athlete by ID' })
  @ApiResponse({ status: 200, description: 'Athlete found' })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  findOne(@Param('id') id: string) {
    return this.athletesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN, UserRole.SPORT_MANAGER)
  @ApiOperation({ summary: 'Update athlete by ID' })
  @ApiResponse({ status: 200, description: 'Athlete updated successfully' })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  update(
    @Param('id') id: string,
    @Body() updateAthleteDto: UpdateAthleteDto,
  ) {
    return this.athletesService.update(id, updateAthleteDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete athlete by ID' })
  @ApiResponse({ status: 204, description: 'Athlete deleted successfully' })
  @ApiResponse({ status: 404, description: 'Athlete not found' })
  remove(@Param('id') id: string) {
    return this.athletesService.remove(id);
  }
}
