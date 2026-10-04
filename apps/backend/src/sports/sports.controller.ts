import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { SportsService } from './sports.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

const backgroundUploadOptions = { limits: { fileSize: 4 * 1024 * 1024, files: 1 } };
const logoUploadOptions = { limits: { fileSize: 2 * 1024 * 1024, files: 1 } };

@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Post()
  create(@Body() createSportDto: CreateSportDto) {
    return this.sportsService.create(createSportDto);
  }

  @Get()
  findAll() {
    return this.sportsService.findAll();
  }

  @Get(':id/background')
  async background(@Param('id') id: string, @Res() response: Response) {
    const image = await this.sportsService.getBackground(id);
    response.set({
      'Content-Type': image.imageMimeType,
      'Content-Length': String(image.imageSize),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: image.etag,
    });
    response.send(Buffer.from(image.imageData));
  }

  @Get(':id/logo')
  async logo(@Param('id') id: string, @Res() response: Response) {
    const image = await this.sportsService.getLogo(id);
    response.set({
      'Content-Type': image.imageMimeType,
      'Content-Length': String(image.imageSize),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: image.etag,
    });
    response.send(Buffer.from(image.imageData));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sportsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSportDto: UpdateSportDto) {
    return this.sportsService.update(id, updateSportDto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Patch(':id/background')
  @UseInterceptors(FileInterceptor('image', backgroundUploadOptions))
  uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.sportsService.uploadBackground(id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Delete(':id/background')
  removeBackground(@Param('id') id: string) {
    return this.sportsService.removeBackground(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Patch(':id/logo')
  @UseInterceptors(FileInterceptor('image', logoUploadOptions))
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.sportsService.uploadLogo(id, file);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT, UserRole.GAMES_ADMIN)
  @Delete(':id/logo')
  removeLogo(@Param('id') id: string) {
    return this.sportsService.removeLogo(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.GAMES_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sportsService.remove(id);
  }
}
