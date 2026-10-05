import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const safeUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  role: true,
  permissions: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: safeUserSelect,
      orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { createdAt: 'asc' }],
    });
    return users.map((user) => this.toPublicUser(user));
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Tên hiển thị không được để trống');
    const role = dto.role || UserRole.CONTENT;
    if (role !== UserRole.ADMIN && dto.permissions?.length) {
      throw new BadRequestException('Chỉ tài khoản Quản trị hệ thống được cấp quyền riêng');
    }
    await this.assertUnique(email, username);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name,
        password: await bcrypt.hash(dto.password, 12),
        role: this.toPrismaRole(role),
        permissions: dto.permissions || [],
        isActive: dto.isActive ?? true,
      },
      select: safeUserSelect,
    });
    return this.toPublicUser(user);
  }

  async update(id: string, actorId: string, dto: UpdateUserDto) {
    const current = await this.prisma.user.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy tài khoản');

    if (actorId === id && dto.role && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('Bạn không thể tự hạ quyền tài khoản đang đăng nhập');
    }
    if (actorId === id && dto.isActive === false) {
      throw new BadRequestException('Bạn không thể tự vô hiệu hóa tài khoản đang đăng nhập');
    }

    if (
      current.role === PrismaUserRole.ADMIN &&
      current.isActive &&
      (dto.isActive === false || (dto.role && dto.role !== UserRole.ADMIN))
    ) {
      await this.assertAnotherActiveAdmin(id);
    }

    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Tên hiển thị không được để trống');
    }
    if (email || username) await this.assertUnique(email, username, id);

    const nextRole = dto.role || current.role;
    if (nextRole !== UserRole.ADMIN && dto.permissions?.length) {
      throw new BadRequestException('Chỉ tài khoản Quản trị hệ thống được cấp quyền riêng');
    }
    const data: Prisma.UserUpdateInput = {};
    if (nextRole !== UserRole.ADMIN) data.permissions = [];
    else if (dto.permissions !== undefined) data.permissions = dto.permissions;
    if (email !== undefined) data.email = email;
    if (username !== undefined) data.username = username;
    if (name !== undefined) data.name = name;
    if (dto.role !== undefined) data.role = this.toPrismaRole(dto.role);
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
      if (current.isActive && !dto.isActive) data.passwordChangedAt = new Date();
    }
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 12);
      data.passwordChangedAt = new Date();
      data.resetPasswordTokenHash = null;
      data.resetPasswordExpiresAt = null;
      data.resetPasswordRequestedAt = null;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect,
    });
    return this.toPublicUser(user);
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('Bạn không thể xóa tài khoản đang đăng nhập');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');

    if (user.role === PrismaUserRole.ADMIN && user.isActive) {
      await this.assertAnotherActiveAdmin(id);
    }
    await this.prisma.user.delete({ where: { id } });
  }

  private async assertUnique(email?: string, username?: string, excludeId?: string) {
    const conditions: Prisma.UserWhereInput[] = [];
    if (email) conditions.push({ email: { equals: email, mode: 'insensitive' } });
    if (username) conditions.push({ username: { equals: username, mode: 'insensitive' } });
    if (!conditions.length) return;

    const existing = await this.prisma.user.findFirst({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: conditions,
      },
    });
    if (existing) throw new ConflictException('Email hoặc username đã tồn tại');
  }

  private async assertAnotherActiveAdmin(excludedId: string) {
    const activeAdminCount = await this.prisma.user.count({
      where: {
        id: { not: excludedId },
        role: PrismaUserRole.ADMIN,
        isActive: true,
      },
    });
    if (activeAdminCount < 1) {
      throw new BadRequestException('Hệ thống phải còn ít nhất một tài khoản Admin đang hoạt động');
    }
  }

  private toPrismaRole(role: UserRole): PrismaUserRole {
    return role as PrismaUserRole;
  }

  private toPublicUser<T extends { role: PrismaUserRole }>(user: T) {
    return {
      ...user,
      role: user.role as UserRole,
    };
  }
}
