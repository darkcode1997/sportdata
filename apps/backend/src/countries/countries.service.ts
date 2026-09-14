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
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
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
    await this.findOne(id);
    return this.prisma.country.delete({ where: { id } });
  }
}
