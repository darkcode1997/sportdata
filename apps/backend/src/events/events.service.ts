import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    const { categoryIds, athleteIds, sportIds, sportId, ...data } = createEventDto;
    const selectedSportIds = Array.from(new Set(sportIds?.length ? sportIds : sportId ? [sportId] : []));
    if (!selectedSportIds.length) {
      throw new BadRequestException('Sự kiện phải có ít nhất một bộ môn');
    }
    await this.validateCategories(categoryIds, selectedSportIds);

    return this.prisma.event.create({
      data: {
        ...data,
        sportId: selectedSportIds[0],
        sports: { connect: selectedSportIds.map((id) => ({ id })) },
        categories: categoryIds
          ? { connect: categoryIds.map((id) => ({ id })) }
          : undefined,
        athletes: athleteIds
          ? { connect: athleteIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.getEventInclude(),
    });
  }

  async findAll(query: QueryEventsDto) {
    const {
      sportId,
      startDateFrom,
      startDateTo,
      isPublished,
      search,
      page = 1,
      limit = 10,
    } = query;

    const where: any = {};

    if (sportId) {
      where.OR = [
        { sportId },
        { sports: { some: { id: sportId } } },
      ];
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        where.startDate.gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        where.startDate.lte = new Date(startDateTo);
      }
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: this.getEventInclude(),
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.getEventInclude(),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const { categoryIds, athleteIds, sportIds, sportId, ...data } = updateEventDto;
    if (sportIds && !sportIds.length) {
      throw new BadRequestException('Sự kiện phải có ít nhất một bộ môn');
    }
    const selectedSportIds = sportIds?.length
      ? Array.from(new Set(sportIds))
      : sportId
        ? [sportId]
        : undefined;

    const existingEvent = await this.findOne(id);
    await this.validateCategories(
      categoryIds,
      selectedSportIds || existingEvent.sports.map((sport) => sport.id),
    );

    return this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        ...(selectedSportIds
          ? {
              sportId: selectedSportIds[0],
              sports: { set: selectedSportIds.map((id) => ({ id })) },
            }
          : {}),
        categories: categoryIds
          ? { set: categoryIds.map((catId) => ({ id: catId })) }
          : undefined,
        athletes: athleteIds
          ? { set: athleteIds.map((athId) => ({ id: athId })) }
          : undefined,
      },
      include: this.getEventInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.statistic.deleteMany({ where: { eventId: id } });
      await transaction.match.deleteMany({ where: { eventId: id } });
      await transaction.draw.deleteMany({ where: { eventId: id } });
      await transaction.event.delete({ where: { id } });
    });

    return { id };
  }

  private getEventInclude() {
    return {
      sport: true,
      sports: true,
      categories: {
        include: { sport: true },
        orderBy: { name: 'asc' as const },
      },
      athletes: {
        select: { id: true, fullName: true, gender: true },
        orderBy: { fullName: 'asc' as const },
      },
      _count: {
        select: {
          matches: true,
          athletes: true,
        },
      },
    };
  }

  private async validateCategories(categoryIds: string[] | undefined, sportIds: string[]) {
    if (!categoryIds?.length) return;
    const validCategoryCount = await this.prisma.category.count({
      where: {
        id: { in: categoryIds },
        sportId: { in: sportIds },
      },
    });
    if (validCategoryCount !== new Set(categoryIds).size) {
      throw new BadRequestException('Hạng mục phải thuộc một trong các bộ môn của sự kiện');
    }
  }
}
