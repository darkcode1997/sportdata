import { ImageVariant, ImageVariantPipe } from '../storage/image-variant';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Res,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

const uploadOptions = { limits: { fileSize: 4 * 1024 * 1024, files: 1 } };

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get('admin/list')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  findAdmin() {
    return this.bannersService.findAdmin();
  }

  @Get()
  findPublished() {
    return this.bannersService.findPublished();
  }

  @Get(':id/image')
  async image(
    @Param('id') id: string,
    @Res() response: Response,
    @Query('variant', ImageVariantPipe) variant?: ImageVariant,
  ) {
    const image = await this.bannersService.getImage(id, variant);
    if (!('imageData' in image)) {
      response.setHeader('Cache-Control', 'public, max-age=300');
      return response.redirect(302, image.url);
    }
    response.set({
      'Content-Type': image.imageMimeType,
      'Content-Length': String(image.imageSize),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: image.etag,
    });
    response.send(Buffer.from(image.imageData));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  @UseInterceptors(FileInterceptor('image', uploadOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'altText'],
      properties: {
        image: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        altText: { type: 'string' },
        linkUrl: { type: 'string' },
        sortOrder: { type: 'integer' },
        isActive: { type: 'boolean' },
      },
    },
  })
  create(
    @Body() dto: CreateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bannersService.create(dto, file);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  @UseInterceptors(FileInterceptor('image', uploadOptions))
  @ApiConsumes('multipart/form-data')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bannersService.update(id, dto, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.CONTENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.bannersService.remove(id);
  }
}
