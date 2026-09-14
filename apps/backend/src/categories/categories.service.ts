import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoriesDto } from './dto/query-categories.dto';
import { CreateDivisionDto } from './dto/create-division.dto';
import { UpdateDivisionDto } from './dto/update-division.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const { athleteIds, ...data } = createCategoryDto;
    await this.ensureUniqueName(data.sportId, data.name);

    return this.prisma.category.create({
      data: {
        ...data,
        athletes: athleteIds
          ? { connect: athleteIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.getCategoryInclude(),
    });
  }

  async findAll(query: QueryCategoriesDto) {
    const { sportId, gender, discipline, uniform, beltLevel, search, page = 1, limit = 10 } = query;

    const where: any = {};

    if (sportId) {
      where.sportId = sportId;
    }

    if (gender) {
      where.gender = gender;
    }

    if (discipline) where.discipline = discipline;
    if (uniform) where.uniform = uniform;
    if (beltLevel) where.beltLevel = beltLevel;

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        include: this.getCategoryInclude(),
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
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
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: this.getCategoryInclude(),
    });

    if (!category) {
      throw new NotFoundException(`Không tìm thấy hạng mục có mã ${id}`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const { athleteIds, ...data } = updateCategoryDto;

    const current = await this.findOne(id);
    await this.ensureUniqueName(
      data.sportId || current.sportId,
      data.name || current.name,
      id,
    );

    return this.prisma.category.update({
      where: { id },
      data: {
        ...data,
        athletes: athleteIds
          ? { set: athleteIds.map((aId) => ({ id: aId })) }
          : undefined,
      },
      include: this.getCategoryInclude(),
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.statistic.updateMany({
        where: { categoryId: id },
        data: { categoryId: null },
      });
      await transaction.match.deleteMany({ where: { categoryId: id } });
      await transaction.draw.deleteMany({ where: { categoryId: id } });
      await transaction.division.deleteMany({ where: { categoryId: id } });
      await transaction.category.delete({ where: { id } });
    });

    return { id };
  }

  async createDivision(createDivisionDto: CreateDivisionDto) {
    const { categoryId, name } = createDivisionDto;

    await this.findOne(categoryId);

    return this.prisma.division.create({
      data: {
        name,
        category: { connect: { id: categoryId } },
      },
      include: {
        category: {
          include: {
            sport: true,
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
    });
  }

  async findDivisionsByCategory(categoryId: string) {
    await this.findOne(categoryId);

    return this.prisma.division.findMany({
      where: { categoryId },
      include: {
        category: {
          include: {
            sport: true,
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneDivision(id: string) {
    const division = await this.prisma.division.findUnique({
      where: { id },
      include: {
        category: {
          include: {
            sport: true,
          },
        },
        matches: true,
      },
    });

    if (!division) {
      throw new NotFoundException(`Không tìm thấy phân hạng có mã ${id}`);
    }

    return division;
  }

  async updateDivision(id: string, updateDivisionDto: UpdateDivisionDto) {
    await this.findOneDivision(id);

    return this.prisma.division.update({
      where: { id },
      data: updateDivisionDto,
      include: {
        category: {
          include: {
            sport: true,
          },
        },
        _count: {
          select: {
            matches: true,
          },
        },
      },
    });
  }

  async removeDivision(id: string) {
    await this.findOneDivision(id);

    return this.prisma.division.delete({
      where: { id },
      include: {
        category: {
          include: {
            sport: true,
          },
        },
      },
    });
  }

  private getCategoryInclude() {
    return {
      sport: true,
      divisions: {
        include: {
          _count: {
            select: {
              matches: true,
            },
          },
        },
      },
      _count: {
        select: {
          athletes: true,
          matches: true,
          divisions: true,
        },
      },
    };
  }

  private async ensureUniqueName(sportId: string, name: string, excludeId?: string) {
    const duplicate = await this.prisma.category.findFirst({
      where: {
        sportId,
        name,
        id: excludeId ? { not: excludeId } : undefined,
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ConflictException('Hạng thi đấu này đã tồn tại trong bộ môn');
    }
  }
}
