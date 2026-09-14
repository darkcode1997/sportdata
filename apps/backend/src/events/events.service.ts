import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryEligibleAthletesDto } from './dto/query-eligible-athletes.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    const { categoryIds, athleteIds, sportIds, sportId, ...data } = createEventDto;
    const selectedSportIds = Array.from(new Set(sportIds?.length ? sportIds : sportId ? [sportId] : []));
    if (!selectedSportIds.length) {
      throw new BadRequestException('Sự kiện phải có ít nhất một bộ môn');
    }
    const selectedCategoryIds = Array.from(new Set(categoryIds || []));
    const selectedAthleteIds = Array.from(new Set(athleteIds || []));
    await this.validateCategories(selectedCategoryIds, selectedSportIds);
    await this.validateAthletes(selectedAthleteIds, selectedCategoryIds, selectedSportIds);

    return this.prisma.event.create({
      data: {
        ...data,
        sportId: selectedSportIds[0],
        sports: { connect: selectedSportIds.map((id) => ({ id })) },
        categories: selectedCategoryIds.length
          ? { connect: selectedCategoryIds.map((id) => ({ id })) }
          : undefined,
        athletes: selectedAthleteIds.length
          ? { connect: selectedAthleteIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.getEventInclude(true),
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
        select: this.getEventListSelect(),
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

  async findOne(id: string, includeAthletes = false) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.getEventInclude(includeAthletes),
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async findEligibleAthletes(
    eventId: string,
    categoryId: string,
    query: QueryEligibleAthletesDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        categories: {
          where: { id: categoryId },
          select: { id: true },
        },
      },
    });
    if (!event) throw new NotFoundException(`Event with ID ${eventId} not found`);
    if (!event.categories.length) {
      throw new NotFoundException('Hạng đấu không thuộc sự kiện này');
    }

    const { search, countryId, page = 1, limit = 30 } = query;
    const where: any = {
      events: { some: { id: eventId } },
      categories: { some: { id: categoryId } },
      ...(countryId ? { countryId } : {}),
    };
    if (search?.trim()) {
      const value = search.trim();
      where.OR = [
        { fullName: { contains: value, mode: 'insensitive' } },
        { firstName: { contains: value, mode: 'insensitive' } },
        { lastName: { contains: value, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.athlete.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          fullName: true,
          gender: true,
          birthDate: true,
          weight: true,
          photoUrl: true,
          country: {
            select: { id: true, code: true, name: true, flagUrl: true },
          },
          federation: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.athlete.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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

    const existingEvent = await this.findOne(id, true);
    const resultingSportIds = selectedSportIds || existingEvent.sports.map((sport) => sport.id);
    const resultingCategoryIds = categoryIds !== undefined
      ? Array.from(new Set(categoryIds))
      : existingEvent.categories.map((category) => category.id);
    const resultingAthleteIds = athleteIds !== undefined
      ? Array.from(new Set(athleteIds))
      : existingEvent.athletes.map((athlete) => athlete.id);
    await this.validateCategories(resultingCategoryIds, resultingSportIds);
    if (athleteIds !== undefined || categoryIds !== undefined || selectedSportIds !== undefined) {
      await this.validateAthletes(resultingAthleteIds, resultingCategoryIds, resultingSportIds);
    }

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
        categories: categoryIds !== undefined
          ? { set: resultingCategoryIds.map((catId) => ({ id: catId })) }
          : undefined,
        athletes: athleteIds !== undefined
          ? { set: resultingAthleteIds.map((athId) => ({ id: athId })) }
          : undefined,
      },
      include: this.getEventInclude(true),
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

  private getEventInclude(includeAthletes = false): Prisma.EventInclude {
    return {
      sport: true,
      sports: true,
      fops: {
        orderBy: { name: 'asc' as const },
      },
      categories: {
        include: { sport: true },
        orderBy: { name: 'asc' as const },
      },
      ...(includeAthletes ? {
        athletes: {
          select: { id: true, fullName: true, gender: true },
          orderBy: { fullName: 'asc' as const },
        },
      } : {}),
      _count: {
        select: {
          matches: true,
          athletes: true,
        },
      },
    };
  }

  private getEventListSelect() {
    return {
      id: true,
      name: true,
      sportId: true,
      description: true,
      startDate: true,
      endDate: true,
      location: true,
      bannerUrl: true,
      logoUrl: true,
      isPublished: true,
      createdAt: true,
      updatedAt: true,
      sport: true,
      sports: true,
      _count: {
        select: {
          matches: true,
          athletes: true,
          categories: true,
          fops: true,
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

  private async validateAthletes(
    athleteIds: string[],
    categoryIds: string[],
    sportIds: string[],
  ) {
    if (!athleteIds.length) return;
    if (!categoryIds.length) {
      throw new BadRequestException(
        'Phải chọn hạng mục thi đấu trước khi thêm vận động viên',
      );
    }

    const athletes = await this.prisma.athlete.findMany({
      where: { id: { in: athleteIds } },
      select: {
        id: true,
        fullName: true,
        categories: {
          where: {
            id: { in: categoryIds },
            sportId: { in: sportIds },
          },
          select: { id: true },
        },
      },
    });
    const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
    const invalidAthletes = athleteIds.filter((athleteId) => {
      const athlete = athleteById.get(athleteId);
      return !athlete || athlete.categories.length === 0;
    });

    if (invalidAthletes.length) {
      const names = invalidAthletes.map(
        (athleteId) => athleteById.get(athleteId)?.fullName || athleteId,
      );
      throw new BadRequestException(
        `Vận động viên chưa đăng ký bộ môn/hạng mục đã chọn: ${names.join(', ')}`,
      );
    }
  }
}
