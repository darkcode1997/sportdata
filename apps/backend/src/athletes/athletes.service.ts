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
      gender,
      eventId,
      page = 1,
      limit = 10,
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

    if (sportId) {
      where.categories = {
        some: {
          sportId,
        },
      };
    }

    if (categoryId) {
      where.categories = {
        some: {
          id: categoryId,
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
        include: this.getAthleteInclude(),
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
}
