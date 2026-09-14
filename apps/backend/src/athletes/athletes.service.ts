import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAthleteDto } from './dto/create-athlete.dto';
import { UpdateAthleteDto } from './dto/update-athlete.dto';
import { QueryAthletesDto } from './dto/query-athletes.dto';

@Injectable()
export class AthletesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAthleteDto: CreateAthleteDto) {
    const { eventIds, categoryIds, birthDate, ...data } = createAthleteDto;

    return this.prisma.athlete.create({
      data: {
        ...data,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        events: eventIds
          ? { connect: eventIds.map((id) => ({ id })) }
          : undefined,
        categories: categoryIds
          ? { connect: categoryIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.getAthleteInclude(),
    });
  }

  async findAll(query: QueryAthletesDto) {
    const {
      search,
      countryId,
      sportId,
      categoryId,
      categoryIds,
      gender,
      eventId,
      page = 1,
      limit = 30,
    } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (countryId) {
      where.countryId = countryId;
    }

    if (gender) {
      where.gender = gender;
    }

    const selectedCategoryIds = [
      ...(categoryIds || '').split(','),
      ...(categoryId ? [categoryId] : []),
    ].map((id) => id.trim()).filter(Boolean);
    if (sportId || selectedCategoryIds.length) {
      where.categories = {
        some: {
          ...(sportId ? { sportId } : {}),
          ...(selectedCategoryIds.length ? { id: { in: selectedCategoryIds } } : {}),
        },
      };
    }

    if (eventId) {
      where.events = {
        some: {
          id: eventId,
        },
      };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.athlete.findMany({
        where,
        include: this.getAthleteListInclude(),
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
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

  async getFilterOptions(query: QueryAthletesDto) {
    const selectedCategoryIds = [
      ...(query.categoryIds || '').split(','),
      ...(query.categoryId ? [query.categoryId] : []),
    ].map((id) => id.trim()).filter(Boolean);
    const where: any = {
      ...(query.eventId ? { events: { some: { id: query.eventId } } } : {}),
      ...(query.gender ? { gender: query.gender } : {}),
      ...(query.sportId || selectedCategoryIds.length
        ? {
            categories: {
              some: {
                ...(query.sportId ? { sportId: query.sportId } : {}),
                ...(selectedCategoryIds.length ? { id: { in: selectedCategoryIds } } : {}),
              },
            },
          }
        : {}),
    };

    const countryGroups = await this.prisma.athlete.groupBy({
      by: ['countryId'],
      where,
      _count: { _all: true },
    });
    const countries = await this.prisma.country.findMany({
      where: { id: { in: countryGroups.map((group) => group.countryId) } },
      select: { id: true, code: true, name: true, flagUrl: true },
      orderBy: { name: 'asc' },
    });
    const countByCountry = new Map(
      countryGroups.map((group) => [group.countryId, group._count._all]),
    );

    return {
      countries: countries.map((country) => ({
        ...country,
        athleteCount: countByCountry.get(country.id) || 0,
      })),
      total: countryGroups.reduce((sum, group) => sum + group._count._all, 0),
    };
  }

  async findOne(id: string) {
    const athlete = await this.prisma.athlete.findUnique({
      where: { id },
      include: {
        ...this.getAthleteInclude(),
        statistics: {
          include: {
            sport: true,
            event: true,
          },
        },
      },
    });

    if (!athlete) {
      throw new NotFoundException(`Athlete with ID ${id} not found`);
    }

    return athlete;
  }

  async update(id: string, updateAthleteDto: UpdateAthleteDto) {
    const { eventIds, categoryIds, birthDate, ...data } = updateAthleteDto;

    await this.findOne(id);

    return this.prisma.athlete.update({
      where: { id },
      data: {
        ...data,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        events: eventIds
          ? { set: eventIds.map((eId) => ({ id: eId })) }
          : undefined,
        categories: categoryIds
          ? { set: categoryIds.map((cId) => ({ id: cId })) }
          : undefined,
      },
      include: this.getAthleteInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.athlete.delete({
      where: { id },
      include: this.getAthleteInclude(),
    });
  }

  private getAthleteInclude() {
    return {
      country: true,
      federation: {
        include: {
          country: true,
        },
      },
      events: true,
      categories: {
        include: {
          sport: true,
        },
      },
      statistics: {
        include: {
          sport: true,
          event: true,
        },
      },
    };
  }

  private getAthleteListInclude() {
    return {
      country: true,
      federation: {
        include: { country: true },
      },
      categories: {
        include: { sport: true },
      },
      statistics: {
        select: {
          eventId: true,
          sportId: true,
          categoryId: true,
          totalWins: true,
          totalLosses: true,
          totalDraws: true,
          totalMatches: true,
          goldMedals: true,
          silverMedals: true,
          bronzeMedals: true,
        },
      },
    };
  }
}
