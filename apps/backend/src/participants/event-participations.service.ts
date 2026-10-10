import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventParticipationRole, RegistrationStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventParticipationDto, UpdateEventParticipationStatusDto } from './dto/create-event-participation.dto';
import { TicketEmailQueueService } from './ticket-email-queue.service';
import { StorageService } from '../storage/storage.service';
import { TicketNotFoundException, TicketNotIssuedException } from './ticket-availability.exceptions';

const roleLabels: Record<EventParticipationRole, string> = {
  ATTENDEE: 'Người tham gia bình thường', REFEREE: 'Trọng tài', TEAM_LEADER: 'Trưởng đoàn',
  COACH: 'Huấn luyện viên', MEDICAL_STAFF: 'Nhân viên y tế',
};

const participationInclude = {
  event: { select: { id: true, name: true, startDate: true, location: true } },
  federation: { select: { id: true, name: true } },
} as const;

@Injectable()
export class EventParticipationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketEmailQueue: TicketEmailQueueService,
    private readonly storage: StorageService,
  ) {}

  async create(dto: CreateEventParticipationDto, accountId?: string) {
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId }, include: {
      participatingFederations: { select: { id: true } },
    } });
    if (!event?.isPublished) throw new NotFoundException('Sự kiện không tồn tại hoặc chưa công khai');
    const now = new Date();
    if (!event.registrationEnabled) throw new BadRequestException('Sự kiện chưa mở đăng ký');
    if (event.registrationOpenAt && now < event.registrationOpenAt) throw new BadRequestException('Chưa đến thời gian đăng ký');
    if (now > (event.registrationCloseAt || event.startDate)) throw new BadRequestException('Đã hết thời gian đăng ký');

    const account = accountId ? await this.prisma.participantAccount.findUnique({ where: { id: accountId } }) : null;
    if (accountId && !account?.isActive) throw new BadRequestException('Tài khoản không còn hoạt động');
    const contactName = (account?.displayName || dto.contactName || '').trim();
    const contactEmail = (account?.email || dto.contactEmail || '').trim().toLowerCase();
    const contactPhone = (dto.contactPhone || account?.phone || '').trim();
    if (contactName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new BadRequestException('Vui lòng nhập họ tên và email liên hệ hợp lệ');
    }
    if (dto.role !== EventParticipationRole.TEAM_LEADER && dto.federationId) {
      throw new BadRequestException('Chỉ vai trò Trưởng đoàn cần chọn Liên đoàn');
    }
    if (dto.role === EventParticipationRole.TEAM_LEADER) {
      if (!dto.federationId) throw new BadRequestException('Vui lòng chọn Liên đoàn làm Trưởng đoàn');
      const federation = await this.prisma.federation.findUnique({ where: { id: dto.federationId } });
      if (!federation) throw new BadRequestException('Liên đoàn không tồn tại');
      if (event.participatingFederations.length && !event.participatingFederations.some((item) => item.id === federation.id)) {
        throw new BadRequestException('Liên đoàn chưa nằm trong danh sách tham gia sự kiện');
      }
    }
    try {
      return await this.prisma.eventParticipation.create({ data: {
        eventId: event.id, accountId, role: dto.role, contactName, contactEmail,
        contactPhone: contactPhone || null, federationId: dto.federationId,
        referenceCode: `SDP-${now.getUTCFullYear()}-${randomBytes(6).toString('hex').toUpperCase()}`,
        status: RegistrationStatus.SUBMITTED,
      }, include: participationInclude });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Bạn đã đăng ký vai trò này trong sự kiện. Vui lòng kiểm tra hồ sơ đã gửi.');
      throw error;
    }
  }

  listMine(accountId: string, eventId?: string) {
    return this.prisma.eventParticipation.findMany({
      where: { accountId, ...(eventId ? { eventId } : {}) }, include: participationInclude, orderBy: { createdAt: 'desc' },
    });
  }

  listAdmin(eventId?: string) {
    return this.prisma.eventParticipation.findMany({
      where: eventId ? { eventId } : {}, include: participationInclude, orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateEventParticipationStatusDto, actor: string) {
    if (dto.reason.trim().length < 2) throw new BadRequestException('Vui lòng nhập lý do cập nhật trạng thái');
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "EventParticipation" WHERE id = ${id} FOR UPDATE`;
      const previous = await transaction.eventParticipation.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException('Không tìm thấy hồ sơ tham gia');
      const updated = await transaction.eventParticipation.update({ where: { id }, data: {
        status: dto.status, statusReason: dto.reason.trim(), statusChangedAt: new Date(), statusChangedBy: actor,
      }, include: participationInclude });
      if (dto.status === RegistrationStatus.CONFIRMED && previous.status !== RegistrationStatus.CONFIRMED) {
        await this.ticketEmailQueue.enqueueTicket(transaction, updated.contactEmail, updated.referenceCode);
      }
      return updated;
    });
  }

  async getTicket(code: string, includeAssets = false) {
    const participation = await this.prisma.eventParticipation.findUnique({
      where: { referenceCode: code.trim().toUpperCase() },
      include: { event: { include: { sport: true } }, federation: { select: { name: true } } },
    });
    if (!participation) throw new TicketNotFoundException('Không tìm thấy thẻ tham dự');
    const event = participation.event;
    return {
      ticketCode: participation.referenceCode,
      role: participation.role,
      roleLabel: roleLabels[participation.role],
      status: participation.status,
      isValid: participation.status === RegistrationStatus.CONFIRMED,
      issuedAt: participation.status === RegistrationStatus.CONFIRMED ? participation.statusChangedAt : null,
      paymentStatus: 'NOT_REQUIRED',
      event: {
        id: event.id, name: event.name, startDate: event.startDate, endDate: event.endDate, location: event.location,
        logoUrl: event.logoUrl, ticketDesign: event.ticketDesign, ticketThemePreset: event.ticketThemePreset,
        ticketLayout: event.ticketLayout, ticketPrimaryColor: event.ticketPrimaryColor,
        ticketSecondaryColor: event.ticketSecondaryColor, ticketAccentColor: event.ticketAccentColor,
        ticketBackgroundUrl: event.ticketBackgroundSize
          ? `/api/events/${event.id}/ticket-background?v=${event.updatedAt.getTime()}` : null,
      },
      sport: { name: event.sport.name },
      category: { name: roleLabels[participation.role] },
      // Compatibility projection for the shared card renderer; no Athlete is created.
      athlete: { fullName: participation.contactName, federation: participation.federation },
      ...(includeAssets ? { assets: {
        backgroundData: event.ticketBackgroundStorageKey ? await this.storage.read(event.ticketBackgroundStorageKey) : null,
        backgroundMimeType: event.ticketBackgroundMimeType,
      } } : {}),
    };
  }

  async getIssuedTicket(code: string, includeAssets = false) {
    const ticket = await this.getTicket(code, includeAssets);
    if (!ticket.isValid) throw new TicketNotIssuedException('Vé chỉ được phát hành sau khi hồ sơ tham gia được duyệt');
    return ticket;
  }
}
