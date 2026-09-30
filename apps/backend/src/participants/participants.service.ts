import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AthleteMediaType, EntryStatus, EntryType, Gender, PaymentMode, PaymentStatus, Prisma, RegistrationStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePublicRegistrationDto,
  ParticipantLoginDto,
  ParticipantRegisterDto,
  UpdateParticipantProfileDto,
} from './dto/participant.dto';

const mediaSelect = {
  id: true,
  type: true,
  mimeType: true,
  size: true,
  updatedAt: true,
} as const;

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: ParticipantRegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.participantAccount.findUnique({ where: { email } })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    await this.validateAffiliation(dto.countryId, dto.federationId);
    const name = this.splitName(dto.displayName);
    const account = await this.prisma.participantAccount.create({
      data: {
        email,
        password: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName.trim(),
        phone: dto.phone?.trim() || null,
        athlete: {
          create: {
            firstName: name.firstName,
            lastName: name.lastName,
            fullName: dto.displayName.trim(),
            gender: dto.gender,
            birthDate: new Date(dto.birthDate),
            weight: dto.weight,
            countryId: dto.countryId,
            federationId: dto.federationId || null,
          },
        },
      },
      select: { id: true, email: true, displayName: true },
    });
    return { account, accessToken: this.sign(account.id, account.email) };
  }

  async login(dto: ParticipantLoginDto) {
    const account = await this.prisma.participantAccount.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!account || !(await bcrypt.compare(dto.password, account.password))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (!account.isActive) throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa');
    return {
      account: { id: account.id, email: account.email, displayName: account.displayName },
      accessToken: this.sign(account.id, account.email),
    };
  }

  async getProfile(accountId: string) {
    const account = await this.prisma.participantAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        createdAt: true,
        athlete: {
          include: {
            country: true,
            federation: { include: { country: true } },
            media: { select: mediaSelect, orderBy: { type: 'asc' } },
          },
        },
      },
    });
    if (!account?.athlete) throw new NotFoundException('Không tìm thấy hồ sơ vận động viên');
    return account;
  }

  async updateProfile(accountId: string, dto: UpdateParticipantProfileDto) {
    const account = await this.getProfile(accountId);
    const countryId = dto.countryId || account.athlete.countryId;
    const federationId = dto.federationId === undefined
      ? account.athlete.federationId
      : dto.federationId || null;
    await this.validateAffiliation(countryId, federationId || undefined);
    const displayName = dto.displayName?.trim() || account.displayName;
    const name = this.splitName(displayName);
    await this.prisma.$transaction([
      this.prisma.participantAccount.update({
        where: { id: accountId },
        data: {
          ...(dto.displayName ? { displayName } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        },
      }),
      this.prisma.athlete.update({
        where: { id: account.athlete.id },
        data: {
          ...(dto.displayName ? { fullName: displayName, ...name } : {}),
          ...(dto.gender ? { gender: dto.gender } : {}),
          ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}),
          ...(dto.countryId ? { countryId: dto.countryId } : {}),
          ...(dto.federationId !== undefined ? { federationId } : {}),
          ...(dto.weight !== undefined ? { weight: dto.weight } : {}),
        },
      }),
    ]);
    return this.getProfile(accountId);
  }

  async upsertMedia(accountId: string, type: AthleteMediaType, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn tệp cần tải lên');
    const profile = await this.getProfile(accountId);
    this.validateFile(type, file);
    await this.prisma.athleteMedia.upsert({
      where: { athleteId_type: { athleteId: profile.athlete.id, type } },
      create: {
        athleteId: profile.athlete.id,
        type,
        data: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
      },
      update: { data: file.buffer, mimeType: file.mimetype, size: file.size },
    });
    if (type === AthleteMediaType.AVATAR) {
      await this.prisma.athlete.update({
        where: { id: profile.athlete.id },
        data: { photoUrl: `/api/participant-auth/avatar/${profile.athlete.id}` },
      });
    }
    return { type, mimeType: file.mimetype, size: file.size };
  }

  async getOwnMedia(accountId: string, type: AthleteMediaType) {
    const profile = await this.getProfile(accountId);
    return this.getMedia(profile.athlete.id, type);
  }

  async getMedia(athleteId: string, type: AthleteMediaType) {
    const media = await this.prisma.athleteMedia.findUnique({
      where: { athleteId_type: { athleteId, type } },
    });
    if (!media) throw new NotFoundException('Chưa có tệp này');
    return media;
  }

  async createRegistration(accountId: string, dto: CreatePublicRegistrationDto) {
    const profile = await this.getProfile(accountId);
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      include: {
        categories: { where: { id: dto.categoryId }, include: { sport: true } },
        participatingFederations: { select: { id: true } },
      },
    });
    if (!event?.isPublished) throw new NotFoundException('Sự kiện không tồn tại hoặc chưa công khai');
    const category = event.categories[0];
    if (!category) throw new BadRequestException('Hạng đấu không thuộc sự kiện này');
    this.validateRegistrationWindow(event);
    this.validateAthleteForCategory(profile.athlete, category, event.startDate);

    const allowedFederations = event.participatingFederations.map((item) => item.id);
    if (profile.athlete.federationId) {
      if (allowedFederations.length && !allowedFederations.includes(profile.athlete.federationId)) {
        throw new BadRequestException('Đơn vị của vận động viên không thuộc danh sách được tham gia');
      }
    } else if (!event.allowIndependentAthletes) {
      throw new BadRequestException('Sự kiện này không nhận vận động viên tự do');
    }

    const documents = new Set(profile.athlete.media.map((item) => item.type));
    if (!documents.has(AthleteMediaType.CCCD_FRONT) || !documents.has(AthleteMediaType.CCCD_BACK)) {
      throw new BadRequestException('Cần tải đủ ảnh CCCD mặt trước và mặt sau trước khi đăng ký');
    }

    const free = event.paymentMode === PaymentMode.FREE;
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const registration = await transaction.eventRegistration.create({
          data: {
            eventId: event.id,
            athleteId: profile.athlete.id,
            accountId,
            categoryId: category.id,
            federationId: profile.athlete.federationId,
            status: free ? RegistrationStatus.CONFIRMED : RegistrationStatus.SUBMITTED,
            paymentStatus: free ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
            feeAmount: free ? 0 : event.registrationFee,
            currency: event.registrationCurrency,
            ticketCode: this.ticketCode(),
          },
        });
        if (free) {
          await this.syncCompetitionEntry(transaction, {
            eventId: event.id,
            categoryId: category.id,
            athleteId: profile.athlete.id,
            countryId: profile.athlete.countryId,
            confirmed: true,
          });
        }
        return transaction.eventRegistration.findUniqueOrThrow({
          where: { id: registration.id },
          include: this.registrationInclude(),
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Bạn đã đăng ký hạng đấu này');
      throw error;
    }
  }

  async listRegistrations(accountId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { accountId },
      include: this.registrationInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAllRegistrations(eventId?: string) {
    return this.prisma.eventRegistration.findMany({
      where: eventId ? { eventId } : undefined,
      include: this.registrationInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRegistrationStatus(id: string, status: RegistrationStatus) {
    const registration = await this.prisma.eventRegistration.findUnique({ where: { id } });
    if (!registration) throw new NotFoundException('Không tìm thấy lượt đăng ký');
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: registration.athleteId },
      select: { countryId: true },
    });
    if (!athlete) throw new NotFoundException('Không tìm thấy vận động viên');
    return this.prisma.$transaction(async (transaction) => {
      await transaction.eventRegistration.update({ where: { id }, data: { status } });
      await this.syncCompetitionEntry(transaction, {
        eventId: registration.eventId,
        categoryId: registration.categoryId,
        athleteId: registration.athleteId,
        countryId: athlete.countryId,
        confirmed: status === RegistrationStatus.CONFIRMED,
      });
      return transaction.eventRegistration.findUniqueOrThrow({
        where: { id },
        include: this.registrationInclude(),
      });
    });
  }

  private async syncCompetitionEntry(
    transaction: Prisma.TransactionClient,
    input: { eventId: string; categoryId: string; athleteId: string; countryId: string; confirmed: boolean },
  ) {
    const compoundKey = {
      eventId_categoryId_athleteId: {
        eventId: input.eventId,
        categoryId: input.categoryId,
        athleteId: input.athleteId,
      },
    };
    if (input.confirmed) {
      await transaction.competitionEntry.upsert({
        where: compoundKey,
        create: {
          eventId: input.eventId,
          categoryId: input.categoryId,
          athleteId: input.athleteId,
          countryId: input.countryId,
          type: EntryType.INDIVIDUAL,
          status: EntryStatus.VERIFIED,
        },
        update: { status: EntryStatus.VERIFIED, countryId: input.countryId },
      });
      await transaction.athlete.update({
        where: { id: input.athleteId },
        data: {
          events: { connect: { id: input.eventId } },
          categories: { connect: { id: input.categoryId } },
        },
      });
      return;
    }
    await transaction.competitionEntry.updateMany({
      where: { eventId: input.eventId, categoryId: input.categoryId, athleteId: input.athleteId },
      data: { status: EntryStatus.WITHDRAWN },
    });
  }

  private registrationInclude() {
    return {
      event: { include: { sport: true, organizer: true } },
      category: { include: { sport: true } },
      athlete: { include: { country: true, federation: true } },
    } as const;
  }

  private validateRegistrationWindow(event: {
    registrationEnabled: boolean;
    registrationOpenAt: Date | null;
    registrationCloseAt: Date | null;
    startDate: Date;
  }) {
    if (!event.registrationEnabled) throw new BadRequestException('Sự kiện chưa mở đăng ký');
    const now = new Date();
    if (event.registrationOpenAt && now < event.registrationOpenAt) {
      throw new BadRequestException('Chưa đến thời gian đăng ký');
    }
    const closeAt = event.registrationCloseAt || event.startDate;
    if (now > closeAt) throw new BadRequestException('Đã hết thời gian đăng ký');
  }

  private validateAthleteForCategory(
    athlete: { gender: Gender; birthDate: Date | null; weight: number | null },
    category: { gender: Gender; minAge: number | null; maxAge: number | null; minWeight: number | null; maxWeight: number | null },
    eventDate: Date,
  ) {
    if (!athlete.birthDate) throw new BadRequestException('Hồ sơ chưa có ngày sinh');
    if (category.gender !== Gender.MIXED && category.gender !== athlete.gender) {
      throw new BadRequestException('Giới tính không phù hợp với hạng đấu');
    }
    const age = this.ageAt(athlete.birthDate, eventDate);
    if (category.minAge !== null && age < category.minAge) {
      throw new BadRequestException(`Vận động viên phải đủ ${category.minAge} tuổi vào ngày thi đấu`);
    }
    if (category.maxAge !== null && age > category.maxAge) {
      throw new BadRequestException(`Hạng đấu chỉ nhận vận động viên tối đa ${category.maxAge} tuổi`);
    }
    if ((category.minWeight !== null || category.maxWeight !== null) && !athlete.weight) {
      throw new BadRequestException('Hồ sơ chưa có cân nặng');
    }
    if (athlete.weight && category.minWeight !== null && athlete.weight < category.minWeight) {
      throw new BadRequestException(`Cân nặng tối thiểu của hạng đấu là ${category.minWeight} kg`);
    }
    if (athlete.weight && category.maxWeight !== null && athlete.weight > category.maxWeight) {
      throw new BadRequestException(`Cân nặng tối đa của hạng đấu là ${category.maxWeight} kg`);
    }
  }

  private ageAt(birthDate: Date, date: Date) {
    let age = date.getUTCFullYear() - birthDate.getUTCFullYear();
    const beforeBirthday = date.getUTCMonth() < birthDate.getUTCMonth()
      || (date.getUTCMonth() === birthDate.getUTCMonth() && date.getUTCDate() < birthDate.getUTCDate());
    if (beforeBirthday) age -= 1;
    return age;
  }

  private validateFile(type: AthleteMediaType, file: Express.Multer.File) {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowed = type === AthleteMediaType.AVATAR ? imageTypes : [...imageTypes, 'application/pdf'];
    if (!allowed.includes(file.mimetype)) throw new BadRequestException('Chỉ hỗ trợ JPG, PNG, WebP hoặc PDF');
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException('Tệp không được vượt quá 8 MB');
  }

  private async validateAffiliation(countryId: string, federationId?: string) {
    const country = await this.prisma.country.findUnique({ where: { id: countryId } });
    if (!country) throw new BadRequestException('Quốc gia không tồn tại');
    if (!federationId) return;
    const federation = await this.prisma.federation.findUnique({ where: { id: federationId } });
    if (!federation) throw new BadRequestException('Đơn vị không tồn tại');
    if (federation.countryId !== countryId) throw new BadRequestException('Đơn vị và vận động viên phải cùng quốc gia');
  }

  private splitName(displayName: string) {
    const parts = displayName.trim().split(/\s+/);
    return { firstName: parts.at(-1) || displayName, lastName: parts.slice(0, -1).join(' ') || parts[0] };
  }

  private ticketCode() {
    return `SD-${new Date().getUTCFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`;
  }

  private sign(id: string, email: string) {
    return this.jwtService.sign(
      { sub: id, email, type: 'participant' },
      {
        secret: process.env.JWT_SECRET || 'sportdata-dev-secret-change-me-please',
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
      },
    );
  }
}
