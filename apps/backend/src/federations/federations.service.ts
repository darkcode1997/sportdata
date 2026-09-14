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
        `Không tìm thấy quốc gia có mã '${createFederationDto.countryId}'`,
      );
    }
    return this.prisma.federation.create({
      data: {
        ...createFederationDto,
        code: createFederationDto.code?.trim().toUpperCase() || undefined,
      },
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
      throw new NotFoundException(`Không tìm thấy đơn vị thể thao có mã '${id}'`);
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
          `Không tìm thấy quốc gia có mã '${updateFederationDto.countryId}'`,
        );
      }
    }
    return this.prisma.federation.update({
      where: { id },
      data: {
        ...updateFederationDto,
        code: updateFederationDto.code === null
          ? null
          : updateFederationDto.code?.trim().toUpperCase() || undefined,
      },
      include: { country: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [athleteCount, eventCount] = await Promise.all([
      this.prisma.athlete.count({ where: { federationId: id } }),
      this.prisma.event.count({
        where: {
          OR: [
            { organizerId: id },
            { participatingFederations: { some: { id } } },
          ],
        },
      }),
    ]);
    if (athleteCount > 0 || eventCount > 0) {
      throw new ConflictException(
        `Không thể xóa đơn vị đang được ${athleteCount} vận động viên và ${eventCount} sự kiện sử dụng`,
      );
    }

    return this.prisma.federation.delete({ where: { id } });
  }
}
