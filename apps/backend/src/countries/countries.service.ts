import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCountryDto: CreateCountryDto) {
    const existing = await this.prisma.country.findUnique({
      where: { code: createCountryDto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Country with code '${createCountryDto.code}' already exists`,
      );
    }
    return this.prisma.country.create({ data: createCountryDto });
  }

  async findAll() {
    return this.prisma.country.findMany({
      include: {
        _count: {
          select: {
            athletes: true,
            federations: true,
            teams: true,
            entries: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            athletes: true,
            federations: true,
            teams: true,
            entries: true,
          },
        },
      },
    });
    if (!country) {
      throw new NotFoundException(`Không tìm thấy quốc gia có mã '${id}'`);
    }
    return country;
  }

  async update(id: string, updateCountryDto: UpdateCountryDto) {
    await this.findOne(id);
    if (updateCountryDto.code) {
      const existing = await this.prisma.country.findUnique({
        where: { code: updateCountryDto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Country with code '${updateCountryDto.code}' already exists`,
        );
      }
    }
    return this.prisma.country.update({
      where: { id },
      data: updateCountryDto,
    });
  }

  async remove(id: string) {
    const country = await this.findOne(id);
    const usageCount = country._count.athletes
      + country._count.federations
      + country._count.teams
      + country._count.entries;
    if (usageCount > 0) {
      throw new ConflictException(
        `Không thể xóa quốc gia đang được ${country._count.federations} đơn vị, ${country._count.athletes} vận động viên và ${country._count.teams} đội sử dụng`,
      );
    }
    return this.prisma.country.delete({ where: { id } });
  }
}
