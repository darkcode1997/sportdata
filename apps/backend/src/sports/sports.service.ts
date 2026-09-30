import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSportDto: CreateSportDto) {
    const code = createSportDto.code.trim().toUpperCase();
    const existing = await this.prisma.sport.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException(`Sport with code '${code}' already exists`);
    }

    const sport = await this.prisma.sport.create({
      data: {
        ...createSportDto,
        name: createSportDto.name.trim(),
        code,
        description: this.optional(createSportDto.description),
        logoUrl: this.optional(createSportDto.logoUrl),
        displayName: this.optional(createSportDto.displayName),
        subtitle: this.optional(createSportDto.subtitle),
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async findAll() {
    const sports = await this.prisma.sport.findMany({
      select: {
        ...this.metadataSelect,
        categories: {
          include: { divisions: true },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { events: true, categories: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return sports.map((sport) => this.serialize(sport));
  }

  async findOne(id: string) {
    const sport = await this.prisma.sport.findUnique({
      where: { id },
      select: this.metadataSelect,
    });
    if (!sport) {
      throw new NotFoundException(`Không tìm thấy bộ môn có mã '${id}'`);
    }
    return this.serialize(sport);
  }

  async update(id: string, updateSportDto: UpdateSportDto) {
    await this.findOne(id);
    const normalizedCode = updateSportDto.code?.trim().toUpperCase();
    if (normalizedCode) {
      const existing = await this.prisma.sport.findUnique({
        where: { code: normalizedCode },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Sport with code '${normalizedCode}' already exists`,
        );
      }
    }

    const sport = await this.prisma.sport.update({
      where: { id },
      data: {
        ...updateSportDto,
        ...(updateSportDto.name !== undefined
          ? { name: updateSportDto.name.trim() }
          : {}),
        ...(normalizedCode ? { code: normalizedCode } : {}),
        ...(updateSportDto.description !== undefined
          ? { description: this.optional(updateSportDto.description) }
          : {}),
        ...(updateSportDto.logoUrl !== undefined
          ? { logoUrl: this.optional(updateSportDto.logoUrl) }
          : {}),
        ...(updateSportDto.displayName !== undefined
          ? { displayName: this.optional(updateSportDto.displayName) }
          : {}),
        ...(updateSportDto.subtitle !== undefined
          ? { subtitle: this.optional(updateSportDto.subtitle) }
          : {}),
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async uploadBackground(id: string, file?: Express.Multer.File) {
    await this.findOne(id);
    this.validateImage(file, 'nền', 4 * 1024 * 1024);
    const sport = await this.prisma.sport.update({
      where: { id },
      data: {
        backgroundData: file!.buffer,
        backgroundMimeType: file!.mimetype,
        backgroundSize: file!.size,
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async uploadLogo(id: string, file?: Express.Multer.File) {
    await this.findOne(id);
    this.validateImage(file, 'logo', 2 * 1024 * 1024);
    const sport = await this.prisma.sport.update({
      where: { id },
      data: {
        logoUrl: null,
        logoData: file!.buffer,
        logoMimeType: file!.mimetype,
        logoSize: file!.size,
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async removeLogo(id: string) {
    await this.findOne(id);
    const sport = await this.prisma.sport.update({
      where: { id },
      data: {
        logoUrl: null,
        logoData: null,
        logoMimeType: null,
        logoSize: null,
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async getLogo(id: string) {
    const sport = await this.prisma.sport.findUnique({
      where: { id },
      select: {
        logoData: true,
        logoMimeType: true,
        logoSize: true,
      },
    });
    if (!sport?.logoData || !sport.logoMimeType || !sport.logoSize) {
      throw new NotFoundException('Bộ môn chưa có logo tải lên');
    }
    return {
      imageData: sport.logoData,
      imageMimeType: sport.logoMimeType,
      imageSize: sport.logoSize,
      etag: `"${createHash('sha1').update(sport.logoData).digest('hex')}"`,
    };
  }

  async removeBackground(id: string) {
    await this.findOne(id);
    const sport = await this.prisma.sport.update({
      where: { id },
      data: {
        backgroundData: null,
        backgroundMimeType: null,
        backgroundSize: null,
      },
      select: this.metadataSelect,
    });
    return this.serialize(sport);
  }

  async getBackground(id: string) {
    const sport = await this.prisma.sport.findUnique({
      where: { id },
      select: {
        backgroundData: true,
        backgroundMimeType: true,
        backgroundSize: true,
      },
    });
    if (!sport?.backgroundData || !sport.backgroundMimeType || !sport.backgroundSize) {
      throw new NotFoundException('Bộ môn chưa có ảnh nền');
    }
    return {
      imageData: sport.backgroundData,
      imageMimeType: sport.backgroundMimeType,
      imageSize: sport.backgroundSize,
      etag: `"${createHash('sha1').update(sport.backgroundData).digest('hex')}"`,
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (transaction) => {
      const primaryEvents = await transaction.event.findMany({
        where: { sportId: id },
        select: {
          id: true,
          sports: { select: { id: true } },
          categories: { select: { sportId: true } },
        },
      });

      for (const event of primaryEvents) {
        const replacementSportId = [
          ...event.sports.map((sport) => sport.id),
          ...event.categories.map((category) => category.sportId),
        ].find((sportId) => sportId !== id);

        if (replacementSportId) {
          await transaction.event.update({
            where: { id: event.id },
            data: {
              sportId: replacementSportId,
              sports: {
                connect: { id: replacementSportId },
                disconnect: { id },
              },
            },
          });
        } else {
          await this.deleteEventData(transaction, event.id);
        }
      }

      const categories = await transaction.category.findMany({
        where: { sportId: id },
        select: { id: true },
      });
      const categoryIds = categories.map((category) => category.id);

      await transaction.statistic.deleteMany({ where: { sportId: id } });
      if (categoryIds.length) {
        await transaction.statistic.updateMany({
          where: { categoryId: { in: categoryIds } },
          data: { categoryId: null },
        });
        await transaction.match.deleteMany({ where: { categoryId: { in: categoryIds } } });
        await transaction.draw.deleteMany({ where: { categoryId: { in: categoryIds } } });
        await transaction.division.deleteMany({ where: { categoryId: { in: categoryIds } } });
        await transaction.category.deleteMany({ where: { id: { in: categoryIds } } });
      }

      await transaction.sport.delete({ where: { id } });
    });

    return { id };
  }

  private async deleteEventData(transaction: Prisma.TransactionClient, eventId: string) {
    await transaction.statistic.deleteMany({ where: { eventId } });
    await transaction.match.deleteMany({ where: { eventId } });
    await transaction.draw.deleteMany({ where: { eventId } });
    await transaction.event.delete({ where: { id: eventId } });
  }

  private validateImage(file: Express.Multer.File | undefined, label: string, maxSize: number) {
    if (!file) throw new BadRequestException(`Vui lòng chọn ảnh ${label}`);
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc AVIF');
    }
    if (!file.size || file.size > maxSize) {
      throw new BadRequestException(`Ảnh ${label} không được vượt quá ${maxSize / 1024 / 1024} MB`);
    }
  }

  private serialize<T extends {
    id: string;
    updatedAt: Date;
    logoUrl: string | null;
    logoSize: number | null;
    backgroundSize: number | null;
  }>(sport: T) {
    return {
      ...sport,
      logoUrl: sport.logoSize
        ? `/api/sports/${sport.id}/logo?v=${sport.updatedAt.getTime()}`
        : sport.logoUrl,
      backgroundUrl: sport.backgroundSize
        ? `/api/sports/${sport.id}/background?v=${sport.updatedAt.getTime()}`
        : null,
    };
  }

  private optional(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }

  private readonly metadataSelect = {
    id: true,
    name: true,
    code: true,
    description: true,
    logoUrl: true,
    logoMimeType: true,
    logoSize: true,
    displayName: true,
    subtitle: true,
    isVisible: true,
    sortOrder: true,
    backgroundMimeType: true,
    backgroundSize: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
