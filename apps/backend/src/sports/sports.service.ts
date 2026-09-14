import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSportDto } from './dto/create-sport.dto';
import { UpdateSportDto } from './dto/update-sport.dto';

@Injectable()
export class SportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSportDto: CreateSportDto) {
    const existing = await this.prisma.sport.findUnique({
      where: { code: createSportDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Sport with code '${createSportDto.code}' already exists`,
      );
    }
    return this.prisma.sport.create({ data: createSportDto });
  }

  async findAll() {
    return this.prisma.sport.findMany({
      include: {
        categories: {
          include: {
            divisions: true,
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { events: true, categories: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const sport = await this.prisma.sport.findUnique({ where: { id } });
    if (!sport) {
      throw new NotFoundException(`Không tìm thấy bộ môn có mã '${id}'`);
    }
    return sport;
  }

  async update(id: string, updateSportDto: UpdateSportDto) {
    await this.findOne(id);
    if (updateSportDto.code) {
      const existing = await this.prisma.sport.findUnique({
        where: { code: updateSportDto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Sport with code '${updateSportDto.code}' already exists`,
        );
      }
    }
    return this.prisma.sport.update({
      where: { id },
      data: updateSportDto,
    });
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
}
