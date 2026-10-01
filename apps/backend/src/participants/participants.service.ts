import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AccountVerificationStatus,
  AthleteMediaType,
  DocumentOcrStatus,
  DocumentVerificationStatus,
  EntryStatus,
  EntryType,
  Gender,
  PaymentMode,
  PaymentStatus,
  Prisma,
  RegistrationStatus,
  RegistrationSubmissionType,
  SportDataAccountType,
} from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import type { SignOptions } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import {
  ConfirmIdentityOcrDto,
  CreatePublicRegistrationDto,
  FederationAccountRegisterDto,
  ParticipantLoginDto,
  ParticipantRegisterDto,
  UpdateParticipantProfileDto,
} from './dto/participant.dto';
import { IdentityOcrService, type IdentityOcrFields, type IdentityOcrResult } from './identity-ocr.service';
import { TicketEmailService } from './ticket-email.service';

const mediaSelect = {
  id: true,
  type: true,
  mimeType: true,
  size: true,
  verificationStatus: true,
  verificationNote: true,
  verifiedAt: true,
  ocrStatus: true,
  ocrProvider: true,
  ocrConfidence: true,
  ocrData: true,
  updatedAt: true,
} as const;

type GuestAthleteInput = {
  fullName?: string;
  birthDate?: string;
  gender?: Gender;
  countryId?: string;
  federationId?: string;
  categoryId?: string;
  weight?: number;
  identityType?: 'CCCD' | 'PASSPORT';
  identityOcr?: {
    provider?: string;
    confidence?: number | null;
    fields?: IdentityOcrFields;
    fieldConfidence?: Record<string, number>;
    userConfirmed?: boolean;
  };
};

type GuestRegistrationPayload = {
  eventId?: string;
  type?: RegistrationSubmissionType;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  organizationName?: string;
  athletes?: GuestAthleteInput[];
};

@Injectable()
export class ParticipantsService {
  private readonly logger = new Logger(ParticipantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly identityOcr: IdentityOcrService,
    private readonly ticketEmail: TicketEmailService,
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
        accountType: SportDataAccountType.ATHLETE,
        verificationStatus: AccountVerificationStatus.VERIFIED,
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
      select: { id: true, email: true, displayName: true, accountType: true, verificationStatus: true },
    });
    return { account, accessToken: this.sign(account.id, account.email) };
  }

  async registerFederation(dto: FederationAccountRegisterDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.participantAccount.findUnique({ where: { email } })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    const federation = await this.prisma.federation.findUnique({
      where: { id: dto.federationId },
      select: { id: true, name: true },
    });
    if (!federation) throw new NotFoundException('Không tìm thấy liên đoàn/đơn vị');
    const account = await this.prisma.participantAccount.create({
      data: {
        email,
        password: await bcrypt.hash(dto.password, 12),
        displayName: dto.displayName.trim(),
        phone: dto.phone.trim(),
        representativePosition: dto.representativePosition.trim(),
        federationId: federation.id,
        accountType: SportDataAccountType.FEDERATION,
        verificationStatus: AccountVerificationStatus.PENDING,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        accountType: true,
        verificationStatus: true,
        federation: { select: { id: true, name: true } },
      },
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
    if (dto.accountType && account.accountType !== dto.accountType) {
      throw new UnauthorizedException(dto.accountType === SportDataAccountType.FEDERATION
        ? 'Email này không phải tài khoản đại diện liên đoàn/CLB'
        : 'Email này không phải tài khoản cá nhân/VĐV');
    }
    return {
      account: {
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        accountType: account.accountType,
        verificationStatus: account.verificationStatus,
        federationId: account.federationId,
      },
      accessToken: this.sign(account.id, account.email),
    };
  }

  async getFederationProfile(accountId: string) {
    const account = await this.prisma.participantAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        representativePosition: true,
        accountType: true,
        verificationStatus: true,
        createdAt: true,
        federation: {
          include: {
            country: true,
            _count: { select: { athletes: true, participatingEvents: true } },
          },
        },
        submissions: {
          include: {
            event: { select: { id: true, name: true, startDate: true, endDate: true, location: true } },
            registrations: {
              select: { id: true, ticketCode: true, status: true, athlete: { select: { fullName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!account || account.accountType !== SportDataAccountType.FEDERATION || !account.federation) {
      throw new ForbiddenException('Tài khoản không có quyền đại diện liên đoàn/CLB');
    }
    return account;
  }

  async listFederationAccounts() {
    return this.prisma.participantAccount.findMany({
      where: { accountType: SportDataAccountType.FEDERATION },
      select: {
        id: true,
        email: true,
        displayName: true,
        phone: true,
        representativePosition: true,
        verificationStatus: true,
        isActive: true,
        createdAt: true,
        federation: { include: { country: true } },
      },
      orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateFederationAccountStatus(accountId: string, status: AccountVerificationStatus) {
    const account = await this.prisma.participantAccount.findUnique({ where: { id: accountId } });
    if (!account || account.accountType !== SportDataAccountType.FEDERATION) {
      throw new NotFoundException('Không tìm thấy tài khoản liên đoàn/CLB');
    }
    return this.prisma.participantAccount.update({
      where: { id: accountId },
      data: { verificationStatus: status },
      select: { id: true, email: true, displayName: true, verificationStatus: true, federationId: true },
    });
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
    const ocr = type === AthleteMediaType.AVATAR ? null : await this.identityOcr.read(file, type);
    const verificationStatus = type === AthleteMediaType.AVATAR
      ? null
      : DocumentVerificationStatus.PENDING;
    await this.prisma.athleteMedia.upsert({
      where: { athleteId_type: { athleteId: profile.athlete.id, type } },
      create: {
        athleteId: profile.athlete.id,
        type,
        data: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
        verificationStatus,
        ...(ocr ? this.ocrPersistence(ocr) : {}),
      },
      update: {
        data: file.buffer,
        mimeType: file.mimetype,
        size: file.size,
        verificationStatus,
        verificationNote: null,
        verifiedAt: null,
        verifiedBy: null,
        ...(ocr ? this.ocrPersistence(ocr) : {
          ocrStatus: DocumentOcrStatus.NOT_REQUESTED,
          ocrProvider: null,
          ocrConfidence: null,
          ocrData: Prisma.DbNull,
        }),
      },
    });
    if (type === AthleteMediaType.AVATAR) {
      await this.prisma.athlete.update({
        where: { id: profile.athlete.id },
        data: { photoUrl: `/api/participant-auth/avatar/${profile.athlete.id}` },
      });
    }
    return { type, mimeType: file.mimetype, size: file.size, verificationStatus, ocr };
  }

  async previewIdentityOcr(type: AthleteMediaType, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh giấy tờ');
    if (type !== AthleteMediaType.CCCD_FRONT && type !== AthleteMediaType.CCCD_BACK && type !== AthleteMediaType.PASSPORT) {
      throw new BadRequestException('Loại giấy tờ không hợp lệ');
    }
    this.validateFile(type, file);
    return this.identityOcr.read(file, type);
  }

  async confirmIdentityOcr(accountId: string, type: AthleteMediaType, dto: ConfirmIdentityOcrDto) {
    if (type === AthleteMediaType.AVATAR) throw new BadRequestException('Ảnh đại diện không có dữ liệu OCR');
    const profile = await this.getProfile(accountId);
    const media = await this.prisma.athleteMedia.findUnique({
      where: { athleteId_type: { athleteId: profile.athlete.id, type } },
    });
    if (!media) throw new NotFoundException('Chưa có giấy tờ để xác nhận');
    if (media.ocrStatus !== DocumentOcrStatus.COMPLETED) {
      throw new BadRequestException('Giấy tờ chưa được OCR thành công');
    }

    const { applyToProfile, ...confirmedFields } = dto;
    const previous = media.ocrData && typeof media.ocrData === 'object' && !Array.isArray(media.ocrData)
      ? media.ocrData as Record<string, unknown>
      : {};
    await this.prisma.$transaction(async (transaction) => {
      await transaction.athleteMedia.update({
        where: { athleteId_type: { athleteId: profile.athlete.id, type } },
        data: {
          ocrData: {
            ...previous,
            confirmedFields,
            userConfirmed: true,
            confirmedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      if (applyToProfile) {
        const fullName = confirmedFields.fullName?.trim();
        const gender = this.ocrGender(confirmedFields.sex);
        await transaction.athlete.update({
          where: { id: profile.athlete.id },
          data: {
            ...(fullName ? { fullName, ...this.splitName(fullName) } : {}),
            ...(confirmedFields.dateOfBirth ? { birthDate: new Date(confirmedFields.dateOfBirth) } : {}),
            ...(gender ? { gender } : {}),
          },
        });
        if (fullName) {
          await transaction.participantAccount.update({ where: { id: accountId }, data: { displayName: fullName } });
        }
      }
    });
    return this.getProfile(accountId);
  }

  async updateDocumentVerification(
    athleteId: string,
    type: AthleteMediaType,
    status: DocumentVerificationStatus,
    note?: string,
    verifiedBy?: string,
  ) {
    if (type === AthleteMediaType.AVATAR) {
      throw new BadRequestException('Ảnh đại diện không phải giấy tờ định danh');
    }
    const media = await this.prisma.athleteMedia.findUnique({
      where: { athleteId_type: { athleteId, type } },
    });
    if (!media) throw new NotFoundException('Chưa có giấy tờ này');
    return this.prisma.athleteMedia.update({
      where: { athleteId_type: { athleteId, type } },
      data: {
        verificationStatus: status,
        verificationNote: note?.trim() || null,
        verifiedAt: status === DocumentVerificationStatus.VERIFIED ? new Date() : null,
        verifiedBy: status === DocumentVerificationStatus.VERIFIED ? verifiedBy : null,
      },
      select: mediaSelect,
    });
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

  async createGuestRegistrations(payloadText: string, files: Express.Multer.File[], federationAccountId?: string) {
    let payload: GuestRegistrationPayload;
    try {
      payload = JSON.parse(payloadText || '{}') as GuestRegistrationPayload;
    } catch {
      throw new BadRequestException('Dữ liệu đăng ký không hợp lệ');
    }

    const federationAccount = federationAccountId
      ? await this.prisma.participantAccount.findUnique({
          where: { id: federationAccountId },
          include: { federation: true },
        })
      : null;
    if (federationAccountId && (!federationAccount || federationAccount.accountType !== SportDataAccountType.FEDERATION || !federationAccount.federation)) {
      throw new ForbiddenException('Tài khoản không có quyền đăng ký theo đoàn');
    }
    if (federationAccount && federationAccount.verificationStatus !== AccountVerificationStatus.VERIFIED) {
      throw new ForbiddenException('Tài khoản đơn vị phải được SportData duyệt trước khi gửi danh sách');
    }

    const eventId = payload.eventId?.trim();
    const contactName = federationAccount?.displayName || payload.contactName?.trim();
    const contactEmail = federationAccount?.email || payload.contactEmail?.trim().toLowerCase();
    const contactPhone = federationAccount?.phone || payload.contactPhone?.trim();
    const athletes = federationAccount
      ? (payload.athletes || []).map((athlete) => ({
          ...athlete,
          countryId: federationAccount.federation!.countryId,
          federationId: federationAccount.federation!.id,
        }))
      : payload.athletes || [];
    if (!eventId) throw new BadRequestException('Thiếu sự kiện đăng ký');
    if (!contactName || contactName.length < 2) throw new BadRequestException('Vui lòng nhập họ tên người đăng ký');
    if (!contactEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      throw new BadRequestException('Email liên hệ không hợp lệ');
    }
    if (!contactPhone || contactPhone.length < 8) throw new BadRequestException('Vui lòng nhập số điện thoại liên hệ');
    if (!athletes.length) throw new BadRequestException('Danh sách đăng ký chưa có vận động viên');
    if (athletes.length > 30) throw new BadRequestException('Mỗi lần chỉ đăng ký tối đa 30 vận động viên');

    const submissionType = federationAccount || athletes.length > 1 || payload.type === RegistrationSubmissionType.GROUP
      ? RegistrationSubmissionType.GROUP
      : RegistrationSubmissionType.INDIVIDUAL;
    const organizationName = federationAccount?.federation?.name || payload.organizationName?.trim() || null;
    if (submissionType === RegistrationSubmissionType.GROUP && !organizationName) {
      throw new BadRequestException('Vui lòng nhập tên đội, CLB hoặc đơn vị đăng ký');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        categories: { include: { sport: true } },
        participatingFederations: { select: { id: true } },
      },
    });
    if (!event?.isPublished) throw new NotFoundException('Sự kiện không tồn tại hoặc chưa công khai');
    this.validateRegistrationWindow(event);

    const countries = await this.prisma.country.findMany({
      where: { id: { in: athletes.map((athlete) => athlete.countryId || '').filter(Boolean) } },
      select: { id: true },
    });
    const countryIds = new Set(countries.map((country) => country.id));
    const federationIds = athletes.map((athlete) => athlete.federationId || '').filter(Boolean);
    const federations = federationIds.length
      ? await this.prisma.federation.findMany({
          where: { id: { in: federationIds } },
          select: { id: true, countryId: true },
        })
      : [];
    const federationMap = new Map(federations.map((federation) => [federation.id, federation]));
    const allowedFederations = new Set(event.participatingFederations.map((item) => item.id));
    const categoryMap = new Map(event.categories.map((category) => [category.id, category]));
    const fileMap = new Map(files.map((file) => [file.fieldname, file]));

    const prepared = athletes.map((athlete, index) => {
      const fullName = athlete.fullName?.trim();
      if (!fullName || fullName.length < 2) throw new BadRequestException(`Vận động viên ${index + 1}: thiếu họ tên`);
      const birthDate = athlete.birthDate ? new Date(athlete.birthDate) : null;
      if (!birthDate || Number.isNaN(birthDate.getTime())) {
        throw new BadRequestException(`Vận động viên ${index + 1}: ngày sinh không hợp lệ`);
      }
      if (!athlete.gender || !Object.values(Gender).includes(athlete.gender)) {
        throw new BadRequestException(`Vận động viên ${index + 1}: chưa chọn giới tính`);
      }
      if (!athlete.countryId || !countryIds.has(athlete.countryId)) {
        throw new BadRequestException(`Vận động viên ${index + 1}: quốc gia không hợp lệ`);
      }
      const federation = athlete.federationId ? federationMap.get(athlete.federationId) : undefined;
      if (athlete.federationId && (!federation || federation.countryId !== athlete.countryId)) {
        throw new BadRequestException(`Vận động viên ${index + 1}: đơn vị và quốc gia không phù hợp`);
      }
      if (athlete.federationId) {
        if (allowedFederations.size && !allowedFederations.has(athlete.federationId)) {
          throw new BadRequestException(`Vận động viên ${index + 1}: đơn vị không thuộc danh sách tham gia`);
        }
      } else if (!event.allowIndependentAthletes) {
        throw new BadRequestException(`Vận động viên ${index + 1}: sự kiện không nhận đăng ký tự do`);
      }
      const category = athlete.categoryId ? categoryMap.get(athlete.categoryId) : undefined;
      if (!category) throw new BadRequestException(`Vận động viên ${index + 1}: hạng đấu không hợp lệ`);
      const weight = athlete.weight === undefined || athlete.weight === null || athlete.weight === ('' as unknown as number)
        ? null
        : Number(athlete.weight);
      if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 500)) {
        throw new BadRequestException(`Vận động viên ${index + 1}: cân nặng không hợp lệ`);
      }
      this.validateAthleteForCategory({ gender: athlete.gender, birthDate, weight }, category, event.startDate);

      const cccdFront = fileMap.get(`athlete_${index}_cccdFront`);
      const cccdBack = fileMap.get(`athlete_${index}_cccdBack`);
      const passport = fileMap.get(`athlete_${index}_passport`);
      const avatar = fileMap.get(`athlete_${index}_avatar`);
      const identityType = athlete.identityType === 'PASSPORT' ? 'PASSPORT' : 'CCCD';
      if (!avatar) {
        throw new BadRequestException(`Vận động viên ${index + 1}: cần ảnh đại diện`);
      }
      if (identityType === 'CCCD' && (!cccdFront || !cccdBack)) {
        throw new BadRequestException(`Vận động viên ${index + 1}: cần đủ CCCD mặt trước và mặt sau`);
      }
      if (identityType === 'PASSPORT' && !passport) {
        throw new BadRequestException(`Vận động viên ${index + 1}: cần ảnh hộ chiếu`);
      }
      if (cccdFront) this.validateFile(AthleteMediaType.CCCD_FRONT, cccdFront);
      if (cccdBack) this.validateFile(AthleteMediaType.CCCD_BACK, cccdBack);
      if (passport) this.validateFile(AthleteMediaType.PASSPORT, passport);
      if (avatar) this.validateFile(AthleteMediaType.AVATAR, avatar);

      return {
        athlete,
        category,
        fullName,
        birthDate,
        weight,
        files: { cccdFront, cccdBack, passport, avatar },
      };
    });

    const referenceCode = this.submissionReference();
    const result = await this.prisma.$transaction(async (transaction) => {
      const submission = await transaction.registrationSubmission.create({
        data: {
          eventId: event.id,
          type: submissionType,
          contactName,
          contactEmail,
          contactPhone,
          organizationName,
          referenceCode,
          accountId: federationAccount?.id,
        },
      });

      const registrations = [];
      for (const item of prepared) {
        const name = this.splitName(item.fullName);
        const media = [
          item.files.avatar && this.mediaCreate(AthleteMediaType.AVATAR, item.files.avatar, false),
          item.files.cccdFront && this.mediaCreate(AthleteMediaType.CCCD_FRONT, item.files.cccdFront, true, item.athlete.identityOcr),
          item.files.cccdBack && this.mediaCreate(AthleteMediaType.CCCD_BACK, item.files.cccdBack, true),
          item.files.passport && this.mediaCreate(AthleteMediaType.PASSPORT, item.files.passport, true, item.athlete.identityOcr),
        ].filter(Boolean) as Prisma.AthleteMediaCreateWithoutAthleteInput[];
        const createdAthlete = await transaction.athlete.create({
          data: {
            ...name,
            fullName: item.fullName,
            gender: item.athlete.gender!,
            birthDate: item.birthDate,
            weight: item.weight,
            countryId: item.athlete.countryId!,
            federationId: item.athlete.federationId || null,
            media: { create: media },
          },
        });
        const registration = await transaction.eventRegistration.create({
          data: {
            eventId: event.id,
            athleteId: createdAthlete.id,
            submissionId: submission.id,
            categoryId: item.category.id,
            federationId: item.athlete.federationId || null,
            status: RegistrationStatus.SUBMITTED,
            paymentStatus: event.paymentMode === PaymentMode.FREE ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
            feeAmount: event.paymentMode === PaymentMode.FREE ? 0 : event.registrationFee,
            currency: event.registrationCurrency,
            ticketCode: this.ticketCode(),
          },
        });
        registrations.push({
          id: registration.id,
          athleteId: createdAthlete.id,
          athleteName: createdAthlete.fullName,
          ticketCode: registration.ticketCode,
          status: registration.status,
        });
      }

      return {
        submissionId: submission.id,
        referenceCode,
        type: submission.type,
        status: RegistrationStatus.SUBMITTED,
        registrations,
      };
    });
    const batch = await this.getSubmissionTickets(referenceCode, contactEmail, true);
    const ticketEmailSent = await this.ticketEmail.send(contactEmail, batch.tickets, batch.meta);
    return { ...result, ticketEmailSent };
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

    const identity = this.identityDocumentState(profile.athlete.media);
    if (!profile.athlete.media.some((item) => item.type === AthleteMediaType.AVATAR)) {
      throw new BadRequestException('Cần tải ảnh đại diện trước khi đăng ký');
    }
    if (!identity.complete) {
      throw new BadRequestException('Cần tải đủ CCCD hai mặt hoặc hộ chiếu trước khi đăng ký');
    }

    const free = event.paymentMode === PaymentMode.FREE;
    const canConfirmImmediately = free && identity.verified;
    try {
      const registration = await this.prisma.$transaction(async (transaction) => {
        const registration = await transaction.eventRegistration.create({
          data: {
            eventId: event.id,
            athleteId: profile.athlete.id,
            accountId,
            categoryId: category.id,
            federationId: profile.athlete.federationId,
            status: canConfirmImmediately ? RegistrationStatus.CONFIRMED : RegistrationStatus.SUBMITTED,
            paymentStatus: free ? PaymentStatus.NOT_REQUIRED : PaymentStatus.PENDING,
            feeAmount: free ? 0 : event.registrationFee,
            currency: event.registrationCurrency,
            ticketCode: this.ticketCode(),
          },
        });
        if (canConfirmImmediately) {
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
      const ticket = await this.getTicket(registration.ticketCode, true);
      const ticketEmailSent = await this.ticketEmail.send(profile.email, [ticket]);
      return { ...registration, ticketEmailSent };
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

  async getTicket(ticketCode: string, includeAssets = false) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { ticketCode: ticketCode.trim().toUpperCase() },
      include: {
        event: { include: { sport: true } },
        category: { include: { sport: true } },
        federation: true,
        athlete: {
          include: {
            country: true,
            federation: true,
            statistics: true,
            media: {
              where: { type: AthleteMediaType.AVATAR },
              select: { data: true, mimeType: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!registration) throw new NotFoundException('Không tìm thấy thẻ tham dự');

    const sportId = registration.category.sportId;
    const sportStatistics = registration.athlete.statistics.filter((item) => item.sportId === sportId);
    const eventStatistics = sportStatistics.filter((item) => item.eventId === registration.eventId);
    const overallStatistics = sportStatistics.filter((item) => item.eventId === null);
    const careerStatistics = overallStatistics.length ? overallStatistics : sportStatistics;

    return {
      ticketCode: registration.ticketCode,
      status: registration.status,
      paymentStatus: registration.paymentStatus,
      isValid: registration.status === RegistrationStatus.CONFIRMED,
      issuedAt: registration.createdAt,
      event: {
        id: registration.event.id,
        name: registration.event.name,
        startDate: registration.event.startDate,
        endDate: registration.event.endDate,
        location: registration.event.location,
        logoUrl: registration.event.logoUrl,
        ticketBackgroundUrl: registration.event.ticketBackgroundSize
          ? `/api/events/${registration.event.id}/ticket-background`
          : null,
      },
      sport: {
        id: registration.category.sport.id,
        code: registration.category.sport.code,
        name: registration.category.sport.name,
      },
      category: {
        id: registration.category.id,
        name: registration.category.name,
        gender: registration.category.gender,
        discipline: registration.category.discipline,
        uniform: registration.category.uniform,
        beltLevel: registration.category.beltLevel,
        minAge: registration.category.minAge,
        maxAge: registration.category.maxAge,
        minWeight: registration.category.minWeight,
        maxWeight: registration.category.maxWeight,
      },
      athlete: {
        id: registration.athlete.id,
        fullName: registration.athlete.fullName,
        birthDate: registration.athlete.birthDate,
        gender: registration.athlete.gender,
        weight: registration.athlete.weight,
        country: registration.athlete.country,
        federation: registration.federation || registration.athlete.federation,
        avatarUrl: `/api/participant-auth/avatar/${registration.athlete.id}`,
      },
      achievements: {
        event: this.aggregateStatistics(eventStatistics),
        career: this.aggregateStatistics(careerStatistics),
      },
      ...(includeAssets ? {
        assets: {
          backgroundData: registration.event.ticketBackgroundData,
          backgroundMimeType: registration.event.ticketBackgroundMimeType,
          avatarData: registration.athlete.media[0]?.data || null,
          avatarMimeType: registration.athlete.media[0]?.mimeType || null,
        },
      } : {}),
    };
  }

  async getSubmissionTickets(referenceCode: string, contactEmail: string, includeAssets = false) {
    const submission = await this.prisma.registrationSubmission.findUnique({
      where: { referenceCode: referenceCode.trim().toUpperCase() },
      include: { registrations: { select: { ticketCode: true }, orderBy: { createdAt: 'asc' } } },
    });
    if (!submission || submission.contactEmail.toLowerCase() !== contactEmail.trim().toLowerCase()) {
      throw new NotFoundException('Không tìm thấy bộ vé với mã hồ sơ và email này');
    }
    const tickets = await Promise.all(submission.registrations.map((item) => this.getTicket(item.ticketCode, includeAssets)));
    return {
      meta: {
        referenceCode: submission.referenceCode,
        organizationName: submission.organizationName,
        contactName: submission.contactName,
      },
      tickets,
    };
  }

  async listAllRegistrations(eventId?: string) {
    return this.prisma.eventRegistration.findMany({
      where: eventId ? { eventId } : undefined,
      include: this.registrationInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRegistrationStatus(id: string, status: RegistrationStatus) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id },
      include: {
        account: { select: { email: true } },
        submission: { select: { contactEmail: true } },
      },
    });
    if (!registration) throw new NotFoundException('Không tìm thấy lượt đăng ký');
    const athlete = await this.prisma.athlete.findUnique({
      where: { id: registration.athleteId },
      select: {
        countryId: true,
        media: {
          select: { type: true, verificationStatus: true },
          where: { type: { in: [AthleteMediaType.CCCD_FRONT, AthleteMediaType.CCCD_BACK, AthleteMediaType.PASSPORT] } },
        },
      },
    });
    if (!athlete) throw new NotFoundException('Không tìm thấy vận động viên');
    if (status === RegistrationStatus.CONFIRMED && !this.identityDocumentState(athlete.media).verified) {
      throw new BadRequestException('Chỉ có thể xác nhận khi CCCD hai mặt hoặc hộ chiếu đã được xác thực');
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
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
    if (status === RegistrationStatus.CONFIRMED) {
      const email = registration.account?.email || registration.submission?.contactEmail;
      if (email) {
        try {
          const ticket = await this.getTicket(registration.ticketCode, true);
          await this.ticketEmail.send(email, [ticket]);
        } catch (error) {
          this.logger.error('Không thể gửi lại vé sau khi duyệt hồ sơ', error instanceof Error ? error.stack : String(error));
        }
      }
    }
    return updated;
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
      event: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          location: true,
          logoUrl: true,
          ticketBackgroundSize: true,
          sport: true,
          organizer: true,
        },
      },
      category: { include: { sport: true } },
      athlete: {
        include: {
          country: true,
          federation: true,
          statistics: {
            select: {
              eventId: true,
              sportId: true,
              categoryId: true,
              totalWins: true,
              totalLosses: true,
              totalDraws: true,
              totalMatches: true,
              goldMedals: true,
              silverMedals: true,
              bronzeMedals: true,
            },
          },
          media: { select: mediaSelect, orderBy: { type: 'asc' as const } },
        },
      },
      submission: true,
    } as const;
  }

  private identityDocumentState(
    media: Array<{ type: AthleteMediaType; verificationStatus: DocumentVerificationStatus | null }>,
  ) {
    const byType = new Map(media.map((item) => [item.type, item.verificationStatus]));
    const hasCccd = byType.has(AthleteMediaType.CCCD_FRONT) && byType.has(AthleteMediaType.CCCD_BACK);
    const hasPassport = byType.has(AthleteMediaType.PASSPORT);
    const cccdVerified = hasCccd
      && byType.get(AthleteMediaType.CCCD_FRONT) === DocumentVerificationStatus.VERIFIED
      && byType.get(AthleteMediaType.CCCD_BACK) === DocumentVerificationStatus.VERIFIED;
    const passportVerified = hasPassport
      && byType.get(AthleteMediaType.PASSPORT) === DocumentVerificationStatus.VERIFIED;
    return { complete: hasCccd || hasPassport, verified: cccdVerified || passportVerified };
  }

  private aggregateStatistics(statistics: Array<{
    totalWins: number;
    totalLosses: number;
    totalDraws: number;
    totalMatches: number;
    goldMedals: number;
    silverMedals: number;
    bronzeMedals: number;
  }>) {
    return statistics.reduce((total, item) => ({
      totalWins: total.totalWins + item.totalWins,
      totalLosses: total.totalLosses + item.totalLosses,
      totalDraws: total.totalDraws + item.totalDraws,
      totalMatches: total.totalMatches + item.totalMatches,
      goldMedals: total.goldMedals + item.goldMedals,
      silverMedals: total.silverMedals + item.silverMedals,
      bronzeMedals: total.bronzeMedals + item.bronzeMedals,
    }), {
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      totalMatches: 0,
      goldMedals: 0,
      silverMedals: 0,
      bronzeMedals: 0,
    });
  }

  private mediaCreate(
    type: AthleteMediaType,
    file: Express.Multer.File,
    requiresVerification: boolean,
    previewOcr?: GuestAthleteInput['identityOcr'],
  ) {
    const hasConfirmedPreview = Boolean(previewOcr?.userConfirmed && previewOcr.fields);
    return {
      type,
      data: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      verificationStatus: requiresVerification ? DocumentVerificationStatus.PENDING : null,
      ...(hasConfirmedPreview ? {
        ocrStatus: DocumentOcrStatus.COMPLETED,
        ocrProvider: previewOcr?.provider?.slice(0, 50) || 'FPT_AI',
        ocrConfidence: typeof previewOcr?.confidence === 'number' ? previewOcr.confidence : null,
        ocrData: {
          fields: previewOcr?.fields || {},
          fieldConfidence: previewOcr?.fieldConfidence || {},
          confirmedFields: previewOcr?.fields || {},
          userConfirmed: true,
          confirmedAt: new Date().toISOString(),
          source: 'PUBLIC_PREVIEW',
        } as Prisma.InputJsonValue,
      } : {}),
    } satisfies Prisma.AthleteMediaCreateWithoutAthleteInput;
  }

  private ocrPersistence(result: IdentityOcrResult) {
    const status = result.status === 'COMPLETED'
      ? DocumentOcrStatus.COMPLETED
      : result.status === 'FAILED'
        ? DocumentOcrStatus.FAILED
        : DocumentOcrStatus.NOT_REQUESTED;
    return {
      ocrStatus: status,
      ocrProvider: result.provider,
      ocrConfidence: result.confidence,
      ocrData: {
        fields: result.fields,
        fieldConfidence: result.fieldConfidence,
        userConfirmed: false,
        ...(result.message ? { message: result.message } : {}),
      } as Prisma.InputJsonValue,
    };
  }

  private ocrGender(value?: string) {
    if (!value) return null;
    const normalized = value.trim().toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (['nam', 'male', 'm'].includes(normalized)) return Gender.MALE;
    if (['nu', 'female', 'f'].includes(normalized)) return Gender.FEMALE;
    return null;
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
    if (!this.hasValidFileSignature(file)) {
      throw new BadRequestException('Nội dung tệp không đúng định dạng ảnh hoặc PDF đã khai báo');
    }
  }

  private hasValidFileSignature(file: Express.Multer.File) {
    const bytes = file.buffer;
    if (file.mimetype === 'image/jpeg') {
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return bytes.length >= 8
        && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (file.mimetype === 'image/webp') {
      return bytes.length >= 12
        && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
        && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    }
    if (file.mimetype === 'application/pdf') {
      return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    return false;
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

  private submissionReference() {
    return `SDR-${new Date().getUTCFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;
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
