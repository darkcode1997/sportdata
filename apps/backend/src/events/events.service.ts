import { validateEventAgeLimits } from './event-age-limits';
import { validateTicketDesign } from './ticket-design';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { QueryEligibleAthletesDto } from './dto/query-eligible-athletes.dto';
import { CreateEventFopDto, UpdateEventFopDto } from './dto/event-fop.dto';
import { EventAgeLimitMode, EventLevel, PaymentMode, PaymentProvider, Prisma } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto) {
    const {
      categoryIds,
      athleteIds,
      sportIds,
      sportId,
      organizerId,
      participatingFederationIds,
      level = EventLevel.INTERNATIONAL,
      allowIndependentAthletes = true,
      ticketDesign,
      ...data
    } = createEventDto;
    const selectedSportIds = Array.from(new Set(sportIds?.length ? sportIds : sportId ? [sportId] : []));
    if (!selectedSportIds.length) {
      throw new BadRequestException('Sự kiện phải có ít nhất một bộ môn');
    }
    const selectedCategoryIds = Array.from(new Set(categoryIds || []));
    const selectedAthleteIds = Array.from(new Set(athleteIds || []));
    const selectedFederationIds = this.normalizeParticipatingFederations(
      participatingFederationIds,
      organizerId,
      level,
    );
    this.validateOrganizerRequirement(level, organizerId);
    await this.validateCategories(selectedCategoryIds, selectedSportIds);
    await this.validateFederations(organizerId, selectedFederationIds);
    await this.validateAthletes(
      selectedAthleteIds,
      selectedCategoryIds,
      selectedSportIds,
      selectedFederationIds,
      allowIndependentAthletes,
    );
    validateEventAgeLimits({
      ageLimitMode: data.ageLimitMode ?? EventAgeLimitMode.UNRESTRICTED,
      minAge: data.minAge ?? null,
      maxAge: data.maxAge ?? null,
    });
    this.validateRegistrationConfig(
      data.registrationEnabled ?? false,
      data.registrationOpenAt,
      data.registrationCloseAt,
      data.startDate,
    );
    Object.assign(data, this.normalizePaymentConfig(
      data.paymentMode ?? PaymentMode.FREE,
      data.registrationFee ?? 0,
      data.paymentProviders,
    ));

    const event = await this.prisma.event.create({
      data: {
        ...data,
        ...(ticketDesign !== undefined ? { ticketDesign: this.designInput(ticketDesign) } : {}),
        level,
        allowIndependentAthletes,
        sport: { connect: { id: selectedSportIds[0] } },
        sports: { connect: selectedSportIds.map((id) => ({ id })) },
        organizer: organizerId ? { connect: { id: organizerId } } : undefined,
        participatingFederations: selectedFederationIds.length
          ? { connect: selectedFederationIds.map((id) => ({ id })) }
          : undefined,
        categories: selectedCategoryIds.length
          ? { connect: selectedCategoryIds.map((id) => ({ id })) }
          : undefined,
        athletes: selectedAthleteIds.length
          ? { connect: selectedAthleteIds.map((id) => ({ id })) }
          : undefined,
      },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async findAll(query: QueryEventsDto) {
    const {
      sportId,
      level,
      organizerId,
      countryId,
      startDateFrom,
      startDateTo,
      isPublished,
      search,
      page = 1,
      limit = 10,
    } = query;

    const where: any = {};

    if (sportId) {
      where.OR = [
        { sportId },
        { sports: { some: { id: sportId } } },
      ];
    }

    if (level) where.level = level;
    if (organizerId) where.organizerId = organizerId;

    const andConditions: Prisma.EventWhereInput[] = [];
    if (countryId) {
      andConditions.push({
        OR: [
          { organizer: { is: { countryId } } },
          { participatingFederations: { some: { countryId } } },
          { teams: { some: { countryId } } },
          { entries: { some: { countryId } } },
        ],
      });
    }

    if (startDateFrom || startDateTo) {
      where.startDate = {};
      if (startDateFrom) {
        where.startDate.gte = new Date(startDateFrom);
      }
      if (startDateTo) {
        where.startDate.lte = new Date(startDateTo);
      }
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
          { organizer: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { participatingFederations: { some: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    if (andConditions.length) where.AND = andConditions;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: this.getEventListSelect(),
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      items: items.map((event) => this.serializeEvent(event)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, includeAthletes = false) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: this.getEventInclude(includeAthletes),
    });

    if (!event) {
      throw new NotFoundException(`Không tìm thấy sự kiện có mã ${id}`);
    }

    return this.serializeEvent(event);
  }

  async createFop(eventId: string, dto: CreateEventFopDto) {
    await this.ensureEvent(eventId);
    const name = this.normalizeFopName(dto.name);
    await this.ensureFopNameAvailable(eventId, name);
    await this.validateFopVenue(eventId, dto.venueId);

    return this.prisma.fop.create({
      data: {
        eventId,
        name,
        venueId: dto.venueId || null,
      },
      include: this.getFopInclude(),
    });
  }

  async updateFop(eventId: string, fopId: string, dto: UpdateEventFopDto) {
    const existing = await this.prisma.fop.findFirst({
      where: { id: fopId, eventId },
    });
    if (!existing) throw new NotFoundException('Không tìm thấy sân/FOP trong sự kiện này');

    const name = dto.name === undefined ? existing.name : this.normalizeFopName(dto.name);
    if (name !== existing.name) await this.ensureFopNameAvailable(eventId, name, fopId);
    await this.validateFopVenue(eventId, dto.venueId);

    return this.prisma.$transaction(async (transaction) => {
      const fop = await transaction.fop.update({
        where: { id: fopId },
        data: {
          name,
          ...(dto.venueId !== undefined ? { venueId: dto.venueId || null } : {}),
        },
        include: this.getFopInclude(),
      });
      if (name !== existing.name) {
        await transaction.match.updateMany({
          where: { fopId },
          data: { fop: name },
        });
      }
      return fop;
    });
  }

  async removeFop(eventId: string, fopId: string) {
    const fop = await this.prisma.fop.findFirst({
      where: { id: fopId, eventId },
      include: { _count: { select: { matches: true, draws: true, timeSlots: true } } },
    });
    if (!fop) throw new NotFoundException('Không tìm thấy sân/FOP trong sự kiện này');

    const usageCount = fop._count.matches + fop._count.draws + fop._count.timeSlots;
    if (usageCount) {
      throw new BadRequestException(
        'Không thể xóa sân/FOP đang được dùng cho trận đấu, nhánh đấu hoặc khung giờ',
      );
    }

    await this.prisma.fop.delete({ where: { id: fopId } });
    return { id: fopId };
  }

  async findEligibleAthletes(
    eventId: string,
    categoryId: string,
    query: QueryEligibleAthletesDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        allowIndependentAthletes: true,
        categories: {
          where: { id: categoryId },
          select: { id: true },
        },
        participatingFederations: { select: { id: true } },
      },
    });
    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${eventId}`);
    if (!event.categories.length) {
      throw new NotFoundException('Hạng đấu không thuộc sự kiện này');
    }

    const { search, countryId, federationId, page = 1, limit = 30 } = query;
    const participatingFederationIds = event.participatingFederations.map((item) => item.id);
    const where: any = {
      events: { some: { id: eventId } },
      categories: { some: { id: categoryId } },
      ...(countryId ? { countryId } : {}),
      ...(federationId ? { federationId } : {}),
    };
    if (participatingFederationIds.length) {
      where.AND = [{
        OR: [
          { federationId: { in: participatingFederationIds } },
          ...(event.allowIndependentAthletes ? [{ federationId: null }] : []),
        ],
      }];
    }
    if (search?.trim()) {
      const value = search.trim();
      where.OR = [
        { fullName: { contains: value, mode: 'insensitive' } },
        { firstName: { contains: value, mode: 'insensitive' } },
        { lastName: { contains: value, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.athlete.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          fullName: true,
          gender: true,
          birthDate: true,
          weight: true,
          photoUrl: true,
          country: {
            select: { id: true, code: true, name: true, flagUrl: true },
          },
          federation: {
            select: { id: true, code: true, name: true, type: true },
          },
        },
      }),
      this.prisma.athlete.count({ where }),
    ]);

    const entrySeeds = items.length
      ? await this.prisma.competitionEntry.findMany({
          where: { eventId, categoryId, athleteId: { in: items.map((item) => item.id) } },
          select: { athleteId: true, seed: true },
        })
      : [];
    const seedByAthlete = new Map(entrySeeds.map((entry) => [entry.athleteId, entry.seed]));
    const seededItems = items
      .map((item) => ({ ...item, seed: seedByAthlete.get(item.id) ?? null }))
      .sort((left, right) => (
        (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER)
        || left.fullName.localeCompare(right.fullName, 'vi')
      ));

    return {
      items: seededItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const {
      categoryIds,
      athleteIds,
      sportIds,
      sportId,
      organizerId,
      participatingFederationIds,
      level,
      allowIndependentAthletes,
      ticketDesign,
      ...data
    } = updateEventDto;
    if (sportIds && !sportIds.length) {
      throw new BadRequestException('Sự kiện phải có ít nhất một bộ môn');
    }
    const selectedSportIds = sportIds?.length
      ? Array.from(new Set(sportIds))
      : sportId
        ? [sportId]
        : undefined;

    const existingEvent = await this.findOne(id, true);
    const resultingSportIds = selectedSportIds || existingEvent.sports.map((sport) => sport.id);
    const resultingCategoryIds = categoryIds !== undefined
      ? Array.from(new Set(categoryIds))
      : existingEvent.categories.map((category) => category.id);
    const resultingAthleteIds = athleteIds !== undefined
      ? Array.from(new Set(athleteIds))
      : existingEvent.athletes.map((athlete) => athlete.id);
    const resultingLevel = level || existingEvent.level;
    const resultingOrganizerId = organizerId === undefined
      ? existingEvent.organizerId
      : organizerId;
    const resultingFederationIds = this.normalizeParticipatingFederations(
      participatingFederationIds === undefined
        ? existingEvent.participatingFederations.map((item) => item.id)
        : participatingFederationIds,
      resultingOrganizerId || undefined,
      resultingLevel,
    );
    const resultingAllowIndependent = allowIndependentAthletes
      ?? existingEvent.allowIndependentAthletes;
    this.validateOrganizerRequirement(resultingLevel, resultingOrganizerId || undefined);
    await this.validateCategories(resultingCategoryIds, resultingSportIds);
    await this.validateFederations(resultingOrganizerId || undefined, resultingFederationIds);
    if (
      athleteIds !== undefined
      || categoryIds !== undefined
      || selectedSportIds !== undefined
      || participatingFederationIds !== undefined
      || organizerId !== undefined
      || level !== undefined
      || allowIndependentAthletes !== undefined
    ) {
      await this.validateAthletes(
        resultingAthleteIds,
        resultingCategoryIds,
        resultingSportIds,
        resultingFederationIds,
        resultingAllowIndependent,
      );
    }
    validateEventAgeLimits({
      ageLimitMode: data.ageLimitMode ?? existingEvent.ageLimitMode,
      minAge: data.minAge === undefined ? existingEvent.minAge : data.minAge,
      maxAge: data.maxAge === undefined ? existingEvent.maxAge : data.maxAge,
    });
    this.validateRegistrationConfig(
      data.registrationEnabled ?? existingEvent.registrationEnabled,
      data.registrationOpenAt === undefined ? existingEvent.registrationOpenAt : data.registrationOpenAt,
      data.registrationCloseAt === undefined ? existingEvent.registrationCloseAt : data.registrationCloseAt,
      data.startDate || existingEvent.startDate,
    );
    Object.assign(data, this.normalizePaymentConfig(
      data.paymentMode ?? existingEvent.paymentMode,
      data.registrationFee ?? existingEvent.registrationFee,
      data.paymentProviders ?? existingEvent.paymentProviders,
    ));

    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        ...(ticketDesign !== undefined ? { ticketDesign: this.designInput(ticketDesign) } : {}),
        ...(level !== undefined ? { level } : {}),
        ...(allowIndependentAthletes !== undefined ? { allowIndependentAthletes } : {}),
        ...(organizerId !== undefined
          ? organizerId
            ? { organizer: { connect: { id: organizerId } } }
            : { organizer: { disconnect: true } }
          : {}),
        participatingFederations: {
          set: resultingFederationIds.map((fedId) => ({ id: fedId })),
        },
        ...(selectedSportIds
          ? {
              sport: { connect: { id: selectedSportIds[0] } },
              sports: { set: selectedSportIds.map((id) => ({ id })) },
            }
          : {}),
        categories: categoryIds !== undefined
          ? { set: resultingCategoryIds.map((catId) => ({ id: catId })) }
          : undefined,
        athletes: athleteIds !== undefined
          ? { set: resultingAthleteIds.map((athId) => ({ id: athId })) }
          : undefined,
      },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async uploadTicketBackground(id: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh nền vé');
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      throw new BadRequestException('Ảnh nền vé chỉ hỗ trợ JPG hoặc PNG để bảo đảm tương thích PDF');
    }
    if (file.size > 6 * 1024 * 1024) {
      throw new BadRequestException('Ảnh nền vé không được vượt quá 6 MB');
    }
    const validSignature = file.mimetype === 'image/jpeg'
      ? file.buffer.length >= 3 && file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff
      : file.buffer.length >= 8 && file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (!validSignature) throw new BadRequestException('Nội dung tệp không đúng định dạng ảnh đã khai báo');
    await this.ensureEvent(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ticketBackgroundData: file.buffer,
        ticketBackgroundMimeType: file.mimetype,
        ticketBackgroundSize: file.size,
      },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async removeTicketBackground(id: string) {
    await this.ensureEvent(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: {
        ticketBackgroundData: null,
        ticketBackgroundMimeType: null,
        ticketBackgroundSize: null,
      },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async getTicketBackground(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        ticketBackgroundData: true,
        ticketBackgroundMimeType: true,
      },
    });
    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${id}`);
    if (!event.ticketBackgroundData || !event.ticketBackgroundMimeType) {
      throw new NotFoundException('Sự kiện chưa có ảnh nền vé');
    }
    return {
      data: event.ticketBackgroundData,
      mimeType: event.ticketBackgroundMimeType,
      etag: createHash('sha256').update(event.ticketBackgroundData).digest('hex'),
    };
  }

  async uploadEventImage(
    id: string,
    kind: 'banner' | 'logo',
    file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException(`Vui lòng chọn ảnh ${kind === 'banner' ? 'banner' : 'logo'}`);
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WebP');
    }
    if (file.size > 6 * 1024 * 1024) {
      throw new BadRequestException('Ảnh không được vượt quá 6 MB');
    }
    const isJpeg = file.buffer.length >= 3
      && file.buffer[0] === 0xff
      && file.buffer[1] === 0xd8
      && file.buffer[2] === 0xff;
    const isPng = file.buffer.length >= 8
      && file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = file.buffer.length >= 12
      && file.buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    const validSignature = file.mimetype === 'image/jpeg'
      ? isJpeg
      : file.mimetype === 'image/png'
        ? isPng
        : isWebp;
    if (!validSignature) {
      throw new BadRequestException('Nội dung tệp không đúng định dạng ảnh đã khai báo');
    }

    await this.ensureEvent(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: kind === 'banner'
        ? { bannerData: file.buffer, bannerMimeType: file.mimetype, bannerSize: file.size }
        : { logoData: file.buffer, logoMimeType: file.mimetype, logoSize: file.size },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async removeEventImage(id: string, kind: 'banner' | 'logo') {
    await this.ensureEvent(id);
    const event = await this.prisma.event.update({
      where: { id },
      data: kind === 'banner'
        ? { bannerData: null, bannerMimeType: null, bannerSize: null }
        : { logoData: null, logoMimeType: null, logoSize: null },
      include: this.getEventInclude(true),
    });
    return this.serializeEvent(event);
  }

  async getEventImage(id: string, kind: 'banner' | 'logo') {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        bannerData: true,
        bannerMimeType: true,
        logoData: true,
        logoMimeType: true,
      },
    });
    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${id}`);
    const data = kind === 'banner' ? event.bannerData : event.logoData;
    const mimeType = kind === 'banner' ? event.bannerMimeType : event.logoMimeType;
    if (!data || !mimeType) {
      throw new NotFoundException(`Sự kiện chưa có ảnh ${kind === 'banner' ? 'banner' : 'logo'}`);
    }
    return {
      data,
      mimeType,
      etag: createHash('sha256').update(data).digest('hex'),
    };
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.statistic.deleteMany({ where: { eventId: id } });
      await transaction.match.deleteMany({ where: { eventId: id } });
      await transaction.draw.deleteMany({ where: { eventId: id } });
      await transaction.event.delete({ where: { id } });
    });

    return { id };
  }

  private getEventInclude(includeAthletes = false): Prisma.EventInclude {
    return {
      sport: true,
      sports: true,
      organizer: { include: { country: true } },
      participatingFederations: {
        include: { country: true },
        orderBy: { name: 'asc' as const },
      },
      fops: {
        include: {
          venue: { select: { id: true, code: true, name: true } },
          _count: { select: { matches: true, draws: true, timeSlots: true } },
        },
        orderBy: { name: 'asc' as const },
      },
      categories: {
        include: { sport: true },
        orderBy: { name: 'asc' as const },
      },
      ...(includeAthletes ? {
        athletes: {
          select: { id: true },
          orderBy: { fullName: 'asc' as const },
        },
      } : {}),
      _count: {
        select: {
          matches: true,
          athletes: true,
          registrations: true,
        },
      },
    };
  }

  private getEventListSelect() {
    return {
      id: true,
      name: true,
      sportId: true,
      description: true,
      startDate: true,
      endDate: true,
      location: true,
      bannerUrl: true,
      logoUrl: true,
      bannerMimeType: true,
      bannerSize: true,
      logoMimeType: true,
      logoSize: true,
      ticketBackgroundMimeType: true,
      ticketBackgroundSize: true,
      ticketDesign: true,
      ticketThemePreset: true,
      ticketLayout: true,
      ticketPrimaryColor: true,
      ticketSecondaryColor: true,
      ticketAccentColor: true,
      isPublished: true,
      level: true,
      allowIndependentAthletes: true,
      ageLimitMode: true,
      minAge: true,
      maxAge: true,
      registrationEnabled: true,
      registrationOpenAt: true,
      registrationCloseAt: true,
      registrationFee: true,
      registrationCurrency: true,
      paymentMode: true,
      paymentProviders: true,
      bankCode: true,
      bankAccountNumber: true,
      bankAccountName: true,
      organizerId: true,
      organizer: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          country: { select: { id: true, code: true, name: true, flagUrl: true } },
        },
      },
      participatingFederations: {
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          country: { select: { id: true, code: true, name: true, flagUrl: true } },
        },
      },
      createdAt: true,
      updatedAt: true,
      sport: true,
      sports: true,
      _count: {
        select: {
          matches: true,
          athletes: true,
          categories: true,
          fops: true,
          registrations: true,
        },
      },
    };
  }

  private serializeEvent(event: any) {
    const {
      ticketBackgroundData: _ticketBackgroundData,
      bannerData: _bannerData,
      logoData: _logoData,
      ...safeEvent
    } = event;
    const imageVersion = event.updatedAt ? new Date(event.updatedAt).getTime() : undefined;
    return {
      ...safeEvent,
      bannerUrl: event.bannerSize
        ? `/api/events/${event.id}/banner-image${imageVersion ? `?v=${imageVersion}` : ''}`
        : event.bannerUrl,
      logoUrl: event.logoSize
        ? `/api/events/${event.id}/logo-image${imageVersion ? `?v=${imageVersion}` : ''}`
        : event.logoUrl,
      ticketBackgroundUrl: event.ticketBackgroundSize
        ? `/api/events/${event.id}/ticket-background${imageVersion ? `?v=${imageVersion}` : ''}`
        : null,
    };
  }

  private designInput(value: unknown) {
    if (value === null) return Prisma.DbNull;
    try { return validateTicketDesign(value) as unknown as Prisma.InputJsonValue; }
    catch (error) { throw new BadRequestException((error as Error).message); }
  }

  private async ensureEvent(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id }, select: { id: true } });
    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${id}`);
    return event;
  }

  private getFopInclude() {
    return {
      venue: { select: { id: true, code: true, name: true } },
      _count: { select: { matches: true, draws: true, timeSlots: true } },
    } as const;
  }

  private normalizeFopName(name: string) {
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized) throw new BadRequestException('Tên sân/FOP không được để trống');
    return normalized;
  }

  private async ensureFopNameAvailable(eventId: string, name: string, excludeId?: string) {
    const duplicate = await this.prisma.fop.findFirst({
      where: {
        eventId,
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (duplicate) throw new ConflictException(`Sự kiện đã có sân/FOP tên “${name}”`);
  }

  private async validateFopVenue(eventId: string, venueId: string | null | undefined) {
    if (!venueId) return;
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, events: { some: { id: eventId } } },
      select: { id: true },
    });
    if (!venue) throw new BadRequestException('Địa điểm không thuộc sự kiện này');
  }

  private async validateCategories(categoryIds: string[] | undefined, sportIds: string[]) {
    if (!categoryIds?.length) return;
    const validCategoryCount = await this.prisma.category.count({
      where: {
        id: { in: categoryIds },
        sportId: { in: sportIds },
      },
    });
    if (validCategoryCount !== new Set(categoryIds).size) {
      throw new BadRequestException('Hạng mục phải thuộc một trong các bộ môn của sự kiện');
    }
  }

  private async validateAthletes(
    athleteIds: string[],
    categoryIds: string[],
    sportIds: string[],
    participatingFederationIds: string[] = [],
    allowIndependentAthletes = true,
  ) {
    if (!athleteIds.length) return;
    if (!categoryIds.length) {
      throw new BadRequestException(
        'Phải chọn hạng mục thi đấu trước khi thêm vận động viên',
      );
    }

    const athletes = await this.prisma.athlete.findMany({
      where: { id: { in: athleteIds } },
      select: {
        id: true,
        fullName: true,
        federationId: true,
        categories: {
          where: {
            id: { in: categoryIds },
            sportId: { in: sportIds },
          },
          select: { id: true },
        },
      },
    });
    const athleteById = new Map(athletes.map((athlete) => [athlete.id, athlete]));
    const invalidAthletes = athleteIds.filter((athleteId) => {
      const athlete = athleteById.get(athleteId);
      if (!athlete || athlete.categories.length === 0) return true;
      if (!participatingFederationIds.length) return false;
      return athlete.federationId
        ? !participatingFederationIds.includes(athlete.federationId)
        : !allowIndependentAthletes;
    });

    if (invalidAthletes.length) {
      const names = invalidAthletes.map(
        (athleteId) => athleteById.get(athleteId)?.fullName || athleteId,
      );
      throw new BadRequestException(
        `Vận động viên không thuộc hạng mục hoặc đơn vị được tham gia: ${names.join(', ')}`,
      );
    }
  }

  private normalizeParticipatingFederations(
    federationIds: string[] | undefined,
    organizerId: string | undefined,
    level: EventLevel,
  ) {
    const ids = new Set((federationIds || []).filter(Boolean));
    if (level === EventLevel.CENTER_INTERNAL && organizerId) ids.add(organizerId);
    return [...ids];
  }

  private async validateFederations(
    organizerId: string | undefined,
    participatingFederationIds: string[],
  ) {
    const ids = [...new Set([
      ...(organizerId ? [organizerId] : []),
      ...participatingFederationIds,
    ])];
    if (!ids.length) return;
    const count = await this.prisma.federation.count({ where: { id: { in: ids } } });
    if (count !== ids.length) {
      throw new BadRequestException('Đơn vị tổ chức hoặc đơn vị tham gia không tồn tại');
    }
  }

  private validateOrganizerRequirement(level: EventLevel, organizerId?: string) {
    if (level === EventLevel.CENTER_INTERNAL && !organizerId) {
      throw new BadRequestException('Sự kiện nội bộ phải chọn trung tâm, CLB hoặc đơn vị tổ chức');
    }
  }

  private validateRegistrationConfig(
    enabled: boolean,
    openAt?: string | Date | null,
    closeAt?: string | Date | null,
    eventStart?: string | Date,
  ) {
    if (enabled && (!openAt || !closeAt)) {
      throw new BadRequestException('Sự kiện mở đăng ký phải có thời gian mở và đóng đăng ký');
    }
    if (!openAt || !closeAt) return;
    const open = new Date(openAt);
    const close = new Date(closeAt);
    if (close < open) throw new BadRequestException('Thời gian đóng đăng ký phải sau thời gian mở');
    if (eventStart && close > new Date(eventStart)) {
      throw new BadRequestException('Thời gian đóng đăng ký không được sau thời gian bắt đầu sự kiện');
    }
  }

  private normalizePaymentConfig(
    paymentMode: PaymentMode,
    registrationFee: number,
    paymentProviders?: PaymentProvider[],
  ) {
    if (paymentMode !== PaymentMode.FREE && registrationFee <= 0) {
      throw new BadRequestException('Sự kiện thu phí phải có lệ phí mỗi hạng đấu lớn hơn 0');
    }
    if (paymentMode === PaymentMode.FREE) {
      return { paymentMode, registrationFee: 0, paymentProviders: [] as PaymentProvider[] };
    }
    if (paymentMode === PaymentMode.MANUAL) {
      return { paymentMode, registrationFee, paymentProviders: [PaymentProvider.BANK_QR] };
    }
    return {
      paymentMode,
      registrationFee,
      paymentProviders: paymentProviders?.length
        ? Array.from(new Set(paymentProviders))
        : [PaymentProvider.MOMO, PaymentProvider.VNPAY, PaymentProvider.VISA],
    };
  }
}
