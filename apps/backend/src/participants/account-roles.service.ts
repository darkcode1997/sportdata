import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountClassificationDto, CreateStaffRegistrationDto, ProfessionalReviewDto, ReviewStaffRegistrationDto } from './dto/account-roles.dto';

@Injectable()
export class AccountRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async classify(id: string, dto: AccountClassificationDto) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ParticipantAccount" WHERE "id" = ${id} FOR UPDATE`;
      const account = await tx.participantAccount.findUnique({ where: { id }, include: { athlete: {
        include: { _count: { select: { publicRegistrations: true, events: true, categories: true, statistics: true, entries: true, matchesAsAthlete1: true, matchesAsAthlete2: true, teamMemberships: true, matchParticipants: true, heatLanes: true } } },
      } } });
      if (!account || account.accountType === 'FEDERATION') throw new NotFoundException('Không tìm thấy tài khoản cá nhân');
      if (dto.accountType === 'ATHLETE' && !account.athlete) throw new BadRequestException('Tài khoản chưa có hồ sơ VĐV. Người dùng cần đăng ký hồ sơ thi đấu trước.');
      if (account.athlete) {
        const used = Object.values(account.athlete._count).some(count => count > 0);
        await tx.athlete.update({ where: { id: account.athlete.id }, data: {
          // Preserve competition history; hide only unused auto-created profiles.
          isArchived: dto.accountType !== 'ATHLETE' && !used && (!account.athlete.profileConfirmed || dto.accountType === 'GENERAL'),
        } });
      }
      return tx.participantAccount.update({ where: { id }, data: {
        accountType: dto.accountType,
        verificationStatus: ['GENERAL', 'ATHLETE'].includes(dto.accountType) ? 'VERIFIED' : 'PENDING',
        verificationReviewedAt: null, verificationReviewedBy: null, verificationNote: null,
      }, select: { id: true, accountType: true, verificationStatus: true } });
    });
  }

  async reviewAccount(id: string, reviewerId: string, dto: ProfessionalReviewDto) {
    const { status } = dto;
    const account = await this.prisma.participantAccount.findUnique({ where: { id } });
    if (!account || !['REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL'].includes(account.accountType)) {
      throw new BadRequestException('Chỉ duyệt hồ sơ chuyên môn cá nhân tại đây');
    }
    if (status === 'VERIFIED' && account.accountType === 'TEAM_LEADER' && (!account.federationId || !account.phone)) {
      throw new BadRequestException('Trưởng đoàn cần đơn vị đại diện và điện thoại liên hệ trước khi xác minh');
    }
    if (status === 'REJECTED' && !dto.reviewNote?.trim()) throw new BadRequestException('Vui lòng ghi lý do từ chối hồ sơ');
    const result = await this.prisma.participantAccount.updateMany({ where: { id, updatedAt: new Date(dto.expectedUpdatedAt) }, data: {
      verificationStatus: status, verificationReviewedAt: new Date(), verificationReviewedBy: reviewerId, verificationNote: dto.reviewNote?.trim() || null,
    } });
    if (!result.count) throw new ConflictException('Hồ sơ đã thay đổi; vui lòng tải lại và kiểm tra trước khi xác minh');
    return { id, verificationStatus: status };
  }

  async apply(accountId: string, dto: CreateStaffRegistrationDto) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ParticipantAccount" WHERE "id" = ${accountId} FOR UPDATE`;
      const event = await tx.event.findUnique({ where: { id: dto.eventId } });
      if (!event?.isPublished || event.endDate < new Date()) throw new BadRequestException('Sự kiện chưa công khai hoặc đã kết thúc');
      const account = await tx.participantAccount.findUnique({ where: { id: accountId } });
      if (!account?.isActive || account.accountType === 'FEDERATION') throw new BadRequestException('Vui lòng dùng tài khoản cá nhân');
      const existing = await tx.eventStaffRegistration.findUnique({ where: { eventId_accountId: { eventId: dto.eventId, accountId } } });
      if (existing && ['PENDING', 'APPROVED'].includes(existing.status)) throw new ConflictException('Bạn đã có hồ sơ cho sự kiện này');
      return tx.eventStaffRegistration.upsert({
        where: { eventId_accountId: { eventId: dto.eventId, accountId } },
        create: { accountId, eventId: dto.eventId, role: dto.role, note: dto.note?.trim() },
        update: { role: dto.role, note: dto.note?.trim() || null, status: 'PENDING', reviewNote: null, reviewedBy: null, reviewedAt: null },
      });
    });
  }

  myApplications(accountId: string) {
    return this.prisma.eventStaffRegistration.findMany({ where: { accountId }, include: {
      event: { select: { id: true, name: true, startDate: true, endDate: true, location: true } },
    }, orderBy: { createdAt: 'desc' } });
  }

  async cancel(accountId: string, id: string) {
    const result = await this.prisma.eventStaffRegistration.updateMany({
      where: { id, accountId, status: { in: ['PENDING', 'APPROVED'] } },
      data: { status: 'CANCELLED' },
    });
    if (!result.count) throw new NotFoundException('Không có hồ sơ có thể hủy');
    return { id, status: 'CANCELLED' };
  }

  forEvent(eventId: string) {
    return this.prisma.eventStaffRegistration.findMany({ where: { eventId }, include: {
      account: { select: { id: true, displayName: true, email: true, phone: true, accountType: true, verificationStatus: true, professionalSummary: true, federation: { select: { name: true } } } },
    }, orderBy: { createdAt: 'desc' } });
  }

  async review(id: string, reviewerId: string, dto: ReviewStaffRegistrationDto) {
    const existing = await this.prisma.eventStaffRegistration.findUnique({ where: { id }, include: { account: true } });
    if (!existing) throw new NotFoundException('Không tìm thấy hồ sơ');
    if (existing.status === 'CANCELLED') throw new BadRequestException('Hồ sơ đã được người dùng hủy');
    if (dto.status === 'REJECTED' && !dto.reviewNote?.trim()) throw new BadRequestException('Vui lòng ghi lý do từ chối');
    if (dto.status === 'APPROVED' && (!existing.account.isActive || !dto.qualificationVerified)) {
      throw new BadRequestException('Cần kích hoạt tài khoản và xác nhận đã kiểm tra chuyên môn cho nhiệm vụ này');
    }
    const result = await this.prisma.eventStaffRegistration.updateMany({
      where: { id, status: existing.status },
      data: { status: dto.status, reviewNote: dto.reviewNote?.trim() || null, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    if (!result.count) throw new ConflictException('Trạng thái hồ sơ đã thay đổi; vui lòng tải lại');
    return { id, status: dto.status };
  }
}
