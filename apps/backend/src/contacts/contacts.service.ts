import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { QueryContactsDto } from './dto/query-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactDto) {
    const contact = await this.prisma.contactMessage.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: this.optional(dto.phone),
        subject: this.optional(dto.subject),
        message: dto.message.trim(),
      },
      select: { id: true, createdAt: true },
    });
    return { success: true, ...contact };
  }

  async findAll(query: QueryContactsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { subject: { contains: search, mode: 'insensitive' as const } },
        ],
      } : {}),
    };

    const [items, total, newCount] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
    ]);
    return { items, total, newCount, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(id: string, dto: UpdateContactDto) {
    await this.ensureExists(id);
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.adminNote !== undefined ? { adminNote: this.optional(dto.adminNote) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.contactMessage.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const contact = await this.prisma.contactMessage.findUnique({ where: { id }, select: { id: true } });
    if (!contact) throw new NotFoundException('Không tìm thấy liên hệ');
  }

  private optional(value?: string | null) {
    const normalized = value?.trim();
    return normalized || null;
  }
}
