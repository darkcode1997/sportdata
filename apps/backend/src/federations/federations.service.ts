import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFederationDto } from './dto/create-federation.dto';
import { UpdateFederationDto } from './dto/update-federation.dto';

@Injectable()
export class FederationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createFederationDto: CreateFederationDto) {
    const country = await this.prisma.country.findUnique({
      where: { id: createFederationDto.countryId },
    });
    if (!country) {
      throw new BadRequestException(
        `Country with id '${createFederationDto.countryId}' not found`,
      );
    }
    return this.prisma.federation.create({
      data: createFederationDto,
      include: { country: true },
    });
  }

  async findAll() {
    return this.prisma.federation.findMany({
      include: { country: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const federation = await this.prisma.federation.findUnique({
      where: { id },
      include: { country: true },
    });
    if (!federation) {
      throw new NotFoundException(`Federation with id '${id}' not found`);
    }
    return federation;
  }

  async update(id: string, updateFederationDto: UpdateFederationDto) {
    await this.findOne(id);
    if (updateFederationDto.countryId) {
      const country = await this.prisma.country.findUnique({
        where: { id: updateFederationDto.countryId },
      });
      if (!country) {
        throw new BadRequestException(
          `Country with id '${updateFederationDto.countryId}' not found`,
        );
      }
    }
    return this.prisma.federation.update({
      where: { id },
      data: updateFederationDto,
      include: { country: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const athleteCount = await this.prisma.athlete.count({
      where: { federationId: id },
    });
    if (athleteCount > 0) {
      throw new ConflictException(
        `Không thể xóa liên đoàn đang được ${athleteCount} vận động viên sử dụng`,
      );
    }

    return this.prisma.federation.delete({ where: { id } });
  }
}
