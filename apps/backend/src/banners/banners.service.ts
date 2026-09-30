import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

@Injectable()
export class BannersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    const banners = await this.prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: this.metadataSelect,
    });
    return { items: banners.map((banner) => this.serialize(banner)) };
  }

  async findAdmin() {
    const banners = await this.prisma.banner.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: this.metadataSelect,
    });
    return { items: banners.map((banner) => this.serialize(banner)) };
  }

  async create(dto: CreateBannerDto, file?: Express.Multer.File) {
    this.validateImage(file, true);
    const banner = await this.prisma.banner.create({
      data: {
        title: this.optional(dto.title),
        altText: dto.altText.trim(),
        linkUrl: this.optional(dto.linkUrl),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        imageData: file!.buffer,
        imageMimeType: file!.mimetype,
        imageSize: file!.size,
      },
      select: this.metadataSelect,
    });
    return this.serialize(banner);
  }

  async update(id: string, dto: UpdateBannerDto, file?: Express.Multer.File) {
    await this.requireBanner(id);
    this.validateImage(file, false);
    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: this.optional(dto.title) } : {}),
        ...(dto.altText !== undefined ? { altText: dto.altText.trim() } : {}),
        ...(dto.linkUrl !== undefined ? { linkUrl: this.optional(dto.linkUrl) } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(file ? {
          imageData: file.buffer,
          imageMimeType: file.mimetype,
          imageSize: file.size,
        } : {}),
      },
      select: this.metadataSelect,
    });
    return this.serialize(banner);
  }

  async remove(id: string) {
    await this.requireBanner(id);
    await this.prisma.banner.delete({ where: { id } });
    return { id };
  }

  async getImage(id: string) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
      select: {
        imageData: true,
        imageMimeType: true,
        imageSize: true,
        updatedAt: true,
      },
    });
    if (!banner) throw new NotFoundException('Không tìm thấy banner');
    return {
      ...banner,
      etag: `"${createHash('sha1').update(banner.imageData).digest('hex')}"`,
    };
  }

  private requireBanner(id: string) {
    return this.prisma.banner.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException('Không tìm thấy banner');
    });
  }

  private validateImage(file: Express.Multer.File | undefined, required: boolean) {
    if (!file) {
      if (required) throw new BadRequestException('Vui lòng chọn ảnh banner');
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc AVIF');
    }
    if (!file.size || file.size > 4 * 1024 * 1024) {
      throw new BadRequestException('Ảnh banner không được vượt quá 4 MB');
    }
  }

  private serialize<T extends { id: string; updatedAt: Date }>(banner: T) {
    return {
      ...banner,
      imageUrl: `/api/banners/${banner.id}/image?v=${banner.updatedAt.getTime()}`,
    };
  }

  private optional(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private readonly metadataSelect = {
    id: true,
    title: true,
    altText: true,
    linkUrl: true,
    sortOrder: true,
    isActive: true,
    imageMimeType: true,
    imageSize: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
