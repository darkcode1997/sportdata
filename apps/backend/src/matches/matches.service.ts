import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { QueryMatchDto } from './dto/query-match.dto';
import { GenerateDrawDto, SeedingMode } from './dto/generate-draw.dto';
import {
  BracketSide,
  DrawType,
  EntryStatus,
  Match,
  MatchStatus,
  MatchType,
  Prisma,
  ResultStatus,
  WinMethod,
} from '@prisma/client';

const MATCH_INCLUDE = {
  event: { select: { id: true, name: true } },
  category: {
    select: {
      id: true,
      name: true,
      gender: true,
      discipline: true,
      uniform: true,
      beltLevel: true,
      matchDurationSeconds: true,
      minAge: true,
      maxAge: true,
      minWeight: true,
      maxWeight: true,
      sport: { select: { id: true, name: true, code: true } },
    },
  },
  division: { select: { id: true, name: true } },
  fopRecord: { select: { id: true, name: true } },
  draw: { select: { id: true, name: true, type: true, bracketSize: true, sortOrder: true } },
  athlete1: {
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      country: { select: { code: true, name: true, flagUrl: true } },
      federation: { select: { id: true, name: true } },
    },
  },
  athlete2: {
    select: {
      id: true,
      fullName: true,
      photoUrl: true,
      country: { select: { code: true, name: true, flagUrl: true } },
      federation: { select: { id: true, name: true } },
    },
  },
  team1: {
    select: {
      id: true,
      name: true,
      code: true,
      country: { select: { code: true, name: true, flagUrl: true } },
    },
  },
  team2: {
    select: {
      id: true,
      name: true,
      code: true,
      country: { select: { code: true, name: true, flagUrl: true } },
    },
  },
  winner: {
    select: {
      id: true,
      fullName: true,
    },
  },
  winnerTeam: { select: { id: true, name: true, code: true } },
  session: { select: { id: true, name: true, startTime: true, endTime: true } },
};

type SeedAthlete = {
  id: string;
  countryId: string;
  federationId: string | null;
  seed?: number | null;
};

type GeneratedMatch = Prisma.MatchCreateManyInput;

type ScheduledFop = {
  id: string;
  name: string;
};

type DateAssignableMatch = {
  id: string;
  matchNumber?: number | null;
  round?: number | null;
  winnerToMatchId?: string | null;
  loserToMatchId?: string | null;
  matchDate: Date | string;
};

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async assertScoreboardReady(db: PrismaService | Prisma.TransactionClient, match: Match) {
    if (!match.athlete1Id || !match.athlete2Id || match.athlete1Id === match.athlete2Id) {
      throw new BadRequestException('Cần đủ hai VĐV khác nhau trước khi bắt đầu');
    }
    if (!match.fopId || !match.startTime || !match.endTime || match.endTime <= match.startTime) {
      throw new BadRequestException('Cần xếp sân/FOP, giờ bắt đầu và kết thúc trước khi thi đấu');
    }
    const event = await db.event.findUnique({ where: { id: match.eventId }, select: { startDate: true, endDate: true } });
    if (!event) throw new BadRequestException('Không tìm thấy sự kiện');
    this.assertInsideEventDates(event, match.matchDate, match.startTime, match.endTime);
    const fop = await db.fop.findFirst({ where: { id: match.fopId, eventId: match.eventId }, include: { venue: true } });
    if (!fop || fop.venue?.isActive === false) throw new BadRequestException('Sân/FOP không khả dụng');
    if (match.sessionId) {
      const session = await db.competitionSession.findUnique({ where: { id: match.sessionId } });
      if (!session || session.eventId !== match.eventId || match.startTime < session.startTime || match.endTime > session.endTime) {
        throw new BadRequestException('Giờ thi đấu không nằm trong ca đã xếp');
      }
    }
    if (match.timeSlotId) {
      const slot = await db.timeSlot.findUnique({ where: { id: match.timeSlotId } });
      if (!slot || slot.fopId !== match.fopId || match.startTime < slot.startTime || match.endTime > slot.endTime) {
        throw new BadRequestException('Trận đấu không khớp sân hoặc khung giờ đã xếp');
      }
    }
    if (match.startTime.getTime() > Date.now()) throw new BadRequestException('Chưa đến giờ thi đấu theo lịch');
    const feeder = await db.match.findFirst({ where: {
      OR: [{ winnerToMatchId: match.id }, { loserToMatchId: match.id }], status: { not: MatchStatus.FINISHED },
    } });
    if (feeder) throw new BadRequestException('Trận đấu nguồn chưa hoàn thành');
    const athletes = [match.athlete1Id, match.athlete2Id];
    const live = await db.match.findFirst({ where: {
      id: { not: match.id }, status: MatchStatus.RUNNING,
      OR: [{ fopId: match.fopId }, { athlete1Id: { in: athletes } }, { athlete2Id: { in: athletes } }],
    } });
    if (live) throw new ConflictException('Sân hoặc VĐV đang thi đấu ở trận khác');
    await this.assertFopAvailability(db, match.eventId, match.fopId, match.startTime, match.endTime, match.id);
    await this.assertParticipantAvailability(db, match.eventId, match.categoryId, athletes, match.startTime, match.endTime, match.id);
    const category = await db.category.findUnique({ where: { id: match.categoryId } });
    const rule = await db.sportSchedulingRule.findUnique({ where: { eventId_sportId: { eventId: match.eventId, sportId: category.sportId } } });
    const recent = await db.match.findMany({ where: { eventId: match.eventId, status: MatchStatus.FINISHED,
      OR: [{ athlete1Id: { in: athletes } }, { athlete2Id: { in: athletes } }],
    }, select: { resultData: true, resultEnteredAt: true } });
    const restMs = (rule?.minRestMinutes ?? 60) * 60_000;
    if (recent.some((item) => {
      const finishedAt = (item.resultData as any)?.scoreboard?.finishedAt || item.resultEnteredAt?.toISOString();
      return finishedAt && Date.now() - Date.parse(finishedAt) < restMs;
    })) throw new ConflictException('VĐV chưa đủ thời gian nghỉ sau trận vừa kết thúc');
  }

  async findAll(query: QueryMatchDto, includeUnpublishedResults = false) {
    const {
      search,
      eventId,
      categoryId,
      sportId,
      fopId,
      venue,
      athleteId,
      date,
      status,
      page = 1,
      limit = 20,
      pagination = 'page',
      cursor,
    } = query;

    const where: Prisma.MatchWhereInput = {};

    if (eventId) where.eventId = eventId;
    if (categoryId) where.categoryId = categoryId;
    if (sportId) where.category = { sportId };
    if (fopId) where.fopId = fopId;
    const additionalFilters: Prisma.MatchWhereInput[] = [];
    if (search?.trim()) {
      const keyword = search.trim();
      additionalFilters.push({
        OR: [
          { athlete1: { fullName: { contains: keyword, mode: 'insensitive' } } },
          { athlete2: { fullName: { contains: keyword, mode: 'insensitive' } } },
          { event: { name: { contains: keyword, mode: 'insensitive' } } },
        ],
      });
    }
    if (athleteId) {
      additionalFilters.push({ OR: [{ athlete1Id: athleteId }, { athlete2Id: athleteId }] });
    }
    if (venue?.trim()) {
      additionalFilters.push({
        OR: [
          { fop: { contains: venue.trim(), mode: 'insensitive' } },
          { fopRecord: { name: { contains: venue.trim(), mode: 'insensitive' } } },
        ],
      });
    }
    if (additionalFilters.length) where.AND = additionalFilters;
    if (status) where.status = status;
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00+07:00`);
      const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
      where.matchDate = {
        gte: startOfDay,
        lt: endOfDay,
      };
    }

    const orderBy: Prisma.MatchOrderByWithRelationInput[] = [
      { matchDate: 'asc' },
      { startTime: 'asc' },
      { matchNumber: 'asc' },
      { id: 'asc' },
    ];

    if (pagination === 'cursor') {
      const rows = await this.prisma.match.findMany({
        where,
        include: MATCH_INCLUDE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        take: limit + 1,
        orderBy,
      });
      const hasMore = rows.length > limit;
      const rawItems = hasMore ? rows.slice(0, limit) : rows;
      const items = includeUnpublishedResults
        ? rawItems
        : rawItems.map((match) => this.hideUnpublishedResult(match));
      return {
        items,
        meta: {
          limit,
          hasMore,
          nextCursor: hasMore ? rawItems.at(-1)?.id || null : null,
        },
      };
    }

    const skip = (page - 1) * limit;

    const [rawItems, total] = await Promise.all([
      this.prisma.match.findMany({
        where,
        include: MATCH_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.match.count({ where }),
    ]);

    return {
      items: includeUnpublishedResults
        ? rawItems
        : rawItems.map((match) => this.hideUnpublishedResult(match)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findScheduleSummary(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${eventId}`);

    const dates = await this.prisma.$queryRaw<Array<{ date: string; count: number }>>(Prisma.sql`
      SELECT (("matchDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh')::date::text AS "date",
        COUNT(*)::int AS "count"
      FROM "Match"
      WHERE "eventId" = ${eventId}
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    const liveMatch = await this.prisma.match.findFirst({
      where: { eventId, status: MatchStatus.RUNNING },
      orderBy: [{ matchDate: 'asc' }, { matchNumber: 'asc' }],
      select: {
        id: true,
        categoryId: true,
        matchDate: true,
        category: { select: { sportId: true } },
      },
    });

    return {
      dates,
      total: dates.reduce((sum, item) => sum + Number(item.count), 0),
      liveMatch: liveMatch
        ? {
          id: liveMatch.id,
          date: new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Ho_Chi_Minh',
          }).format(liveMatch.matchDate),
          categoryId: liveMatch.categoryId,
          sportId: liveMatch.category.sportId,
        }
        : null,
    };
  }

  async findOne(id: string, includeUnpublishedResults = false) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: MATCH_INCLUDE,
    });

    if (!match) {
      throw new NotFoundException(`Không tìm thấy trận đấu có mã ${id}`);
    }

    return includeUnpublishedResults ? match : this.hideUnpublishedResult(match);
  }

  async create(createMatchDto: CreateMatchDto) {
    if (createMatchDto.status === MatchStatus.RUNNING) throw new BadRequestException('Bắt đầu trận qua bảng điểm sau khi xếp lịch');
    const createsResult = [
      'athlete1Score',
      'athlete2Score',
      'athlete1Advantages',
      'athlete2Advantages',
      'athlete1Penalties',
      'athlete2Penalties',
      'winnerId',
      'winMethod',
    ].some((field) => (createMatchDto as unknown as Record<string, unknown>)[field] !== undefined);
    if (createsResult || createMatchDto.status === MatchStatus.FINISHED) {
      throw new BadRequestException(
        'Hãy tạo trận ở trạng thái chưa hoàn thành và nhập kết quả qua quy trình Kết quả & phê duyệt',
      );
    }
    if (createMatchDto.athlete1Id && createMatchDto.athlete1Id === createMatchDto.athlete2Id) {
      throw new BadRequestException('Hai vận động viên của một trận phải khác nhau');
    }
    const [category, event] = await Promise.all([
      this.prisma.category.findFirst({
        where: {
          id: createMatchDto.categoryId,
          events: { some: { id: createMatchDto.eventId } },
        },
        select: { matchDurationSeconds: true },
      }),
      this.prisma.event.findUnique({
        where: { id: createMatchDto.eventId },
        select: { startDate: true, endDate: true },
      }),
    ]);
    if (!category) {
      throw new BadRequestException('Hạng đấu không thuộc sự kiện đã chọn');
    }
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện đã chọn');

    if (createMatchDto.fopId) {
      const fopExists = await this.prisma.fop.count({
        where: { id: createMatchDto.fopId, eventId: createMatchDto.eventId },
      });
      if (!fopExists) {
        throw new BadRequestException('Sân/FOP không thuộc sự kiện đã chọn');
      }
    }

    const participantIds = Array.from(new Set([
      createMatchDto.athlete1Id,
      createMatchDto.athlete2Id,
      createMatchDto.winnerId,
    ].filter((id): id is string => Boolean(id))));
    if (participantIds.length) {
      const eligibleCount = await this.prisma.athlete.count({
        where: {
          id: { in: participantIds },
          events: { some: { id: createMatchDto.eventId } },
          categories: { some: { id: createMatchDto.categoryId } },
        },
      });
      if (eligibleCount !== participantIds.length) {
        throw new BadRequestException(
          'Vận động viên chưa đăng ký hạng đấu này trong sự kiện',
        );
      }
    }

    const startTime = createMatchDto.startTime
      ? new Date(createMatchDto.startTime)
      : undefined;
    let endTime = createMatchDto.endTime
      ? new Date(createMatchDto.endTime)
      : undefined;
    if (startTime && !endTime) {
      const durationSeconds = category.matchDurationSeconds || 300;
      endTime = new Date(startTime.getTime() + durationSeconds * 1_000);
    }
    const matchDate = new Date(createMatchDto.matchDate);
    this.assertInsideEventDates(event, matchDate, startTime, endTime);
    if (startTime && endTime) {
      await this.assertFopAvailability(
        this.prisma,
        createMatchDto.eventId,
        createMatchDto.fopId,
        startTime,
        endTime,
      );
      await this.assertParticipantAvailability(
        this.prisma,
        createMatchDto.eventId,
        createMatchDto.categoryId,
        participantIds,
        startTime,
        endTime,
      );
    }

    const data: Prisma.MatchCreateInput = {
      event: { connect: { id: createMatchDto.eventId } },
      category: { connect: { id: createMatchDto.categoryId } },
      matchDate,
      ...(createMatchDto.divisionId && {
        division: { connect: { id: createMatchDto.divisionId } },
      }),
      ...(createMatchDto.drawId && {
        draw: { connect: { id: createMatchDto.drawId } },
      }),
      matchNumber: createMatchDto.matchNumber,
      fop: createMatchDto.fop,
      ...(createMatchDto.fopId && {
        fopRecord: { connect: { id: createMatchDto.fopId } },
      }),
      startTime,
      endTime,
      athlete1: createMatchDto.athlete1Id
        ? { connect: { id: createMatchDto.athlete1Id } }
        : undefined,
      athlete2: createMatchDto.athlete2Id
        ? { connect: { id: createMatchDto.athlete2Id } }
        : undefined,
      athlete1Score: createMatchDto.athlete1Score ?? 0,
      athlete2Score: createMatchDto.athlete2Score ?? 0,
      athlete1Advantages: createMatchDto.athlete1Advantages ?? 0,
      athlete2Advantages: createMatchDto.athlete2Advantages ?? 0,
      athlete1Penalties: createMatchDto.athlete1Penalties ?? 0,
      athlete2Penalties: createMatchDto.athlete2Penalties ?? 0,
      status: createMatchDto.status,
      matchType: createMatchDto.matchType,
      winner: createMatchDto.winnerId
        ? { connect: { id: createMatchDto.winnerId } }
        : undefined,
      winMethod: createMatchDto.winMethod,
      round: createMatchDto.round,
      bracketPosition: createMatchDto.bracketPosition,
      winnerToMatch: createMatchDto.winnerToMatchId
        ? { connect: { id: createMatchDto.winnerToMatchId } }
        : undefined,
      winnerToSide: createMatchDto.winnerToSide,
      loserToMatch: createMatchDto.loserToMatchId
        ? { connect: { id: createMatchDto.loserToMatchId } }
        : undefined,
      loserToSide: createMatchDto.loserToSide,
      pool: createMatchDto.pool,
      notes: createMatchDto.notes,
    };

    try {
      return await this.prisma.match.create({
        data,
        include: MATCH_INCLUDE,
      });
    } catch (error) {
      this.rethrowScheduleConstraint(error);
    }
  }

  async update(id: string, updateMatchDto: UpdateMatchDto) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "Match" WHERE id = ${id} FOR UPDATE`;
      const previous = await transaction.match.findUnique({ where: { id } });
      if (!previous) {
        throw new NotFoundException(`Không tìm thấy trận đấu có mã ${id}`);
      }
      if (updateMatchDto.status === MatchStatus.RUNNING) throw new BadRequestException('Bắt đầu trận qua bảng điểm');
      if (previous.status === MatchStatus.RUNNING) throw new BadRequestException('Trận đang thi đấu; sử dụng bảng điểm để điều hành');
      const changesResult = [
        'athlete1Score',
        'athlete2Score',
        'athlete1Advantages',
        'athlete2Advantages',
        'athlete1Penalties',
        'athlete2Penalties',
        'winnerId',
        'winMethod',
      ].some((field) => (updateMatchDto as Record<string, unknown>)[field] !== undefined);
      const changesFinishedStatus = updateMatchDto.status !== undefined
        && updateMatchDto.status !== previous.status
        && (updateMatchDto.status === MatchStatus.FINISHED || previous.status === MatchStatus.FINISHED);
      if (changesResult || changesFinishedStatus) {
        throw new BadRequestException(
          'Kết quả và trạng thái hoàn thành chỉ được thay đổi qua quy trình Kết quả & phê duyệt',
        );
      }
      if (previous.resultStatus === ResultStatus.LOCKED && changesResult) {
        throw new BadRequestException('Kết quả đã khóa; phải mở khóa qua quy trình phê duyệt trước khi sửa');
      }
      const changesSchedule = [
        'eventId',
        'categoryId',
        'matchDate',
        'startTime',
        'endTime',
        'fopId',
        'fop',
      ].some((field) => (updateMatchDto as Record<string, unknown>)[field] !== undefined);
      if (previous.scheduleLocked && changesSchedule) {
        throw new BadRequestException('Lịch thi đấu đã khóa; hãy mở khóa lịch trước khi thay đổi');
      }

      const resultingEventId = updateMatchDto.eventId || previous.eventId;
      const resultingCategoryId = updateMatchDto.categoryId || previous.categoryId;
      const resultingAthlete1Id = updateMatchDto.athlete1Id !== undefined
        ? updateMatchDto.athlete1Id
        : previous.athlete1Id;
      const resultingAthlete2Id = updateMatchDto.athlete2Id !== undefined
        ? updateMatchDto.athlete2Id
        : previous.athlete2Id;
      if (resultingAthlete1Id && resultingAthlete1Id === resultingAthlete2Id) {
        throw new BadRequestException('Hai vận động viên của một trận phải khác nhau');
      }
      const [category, event] = await Promise.all([
        transaction.category.findFirst({
          where: {
            id: resultingCategoryId,
            events: { some: { id: resultingEventId } },
          },
          select: { matchDurationSeconds: true },
        }),
        transaction.event.findUnique({
          where: { id: resultingEventId },
          select: { startDate: true, endDate: true },
        }),
      ]);
      if (!category) {
        throw new BadRequestException('Hạng đấu không thuộc sự kiện đã chọn');
      }
      if (!event) throw new NotFoundException('Không tìm thấy sự kiện đã chọn');

      const resultingFopId = updateMatchDto.fopId !== undefined
        ? updateMatchDto.fopId
        : previous.fopId;
      if (resultingFopId) {
        const fopExists = await transaction.fop.count({
          where: { id: resultingFopId, eventId: resultingEventId },
        });
        if (!fopExists) {
          throw new BadRequestException('Sân/FOP không thuộc sự kiện đã chọn');
        }
      }

      const participantIds = Array.from(new Set([
        updateMatchDto.athlete1Id !== undefined
          ? updateMatchDto.athlete1Id
          : previous.athlete1Id,
        updateMatchDto.athlete2Id !== undefined
          ? updateMatchDto.athlete2Id
          : previous.athlete2Id,
        updateMatchDto.winnerId !== undefined
          ? updateMatchDto.winnerId
          : previous.winnerId,
      ].filter((athleteId): athleteId is string => Boolean(athleteId))));
      if (participantIds.length) {
        const eligibleCount = await transaction.athlete.count({
          where: {
            id: { in: participantIds },
            events: { some: { id: resultingEventId } },
            categories: { some: { id: resultingCategoryId } },
          },
        });
        if (eligibleCount !== participantIds.length) {
          throw new BadRequestException(
            'Vận động viên chưa đăng ký hạng đấu này trong sự kiện',
          );
        }
      }

      const resultingStartTime = updateMatchDto.startTime !== undefined
        ? updateMatchDto.startTime ? new Date(updateMatchDto.startTime) : null
        : previous.startTime;
      let resultingEndTime = updateMatchDto.endTime !== undefined
        ? updateMatchDto.endTime ? new Date(updateMatchDto.endTime) : null
        : previous.endTime;
      if (updateMatchDto.startTime && updateMatchDto.endTime === undefined) {
        resultingEndTime = new Date(
          new Date(updateMatchDto.startTime).getTime() + (category.matchDurationSeconds || 300) * 1_000,
        );
      }
      const resultingMatchDate = updateMatchDto.matchDate
        ? new Date(updateMatchDto.matchDate)
        : previous.matchDate;
      this.assertInsideEventDates(event, resultingMatchDate, resultingStartTime, resultingEndTime);
      if (resultingStartTime && resultingEndTime) {
        await this.assertFopAvailability(
          transaction,
          resultingEventId,
          resultingFopId,
          resultingStartTime,
          resultingEndTime,
          id,
        );
        const scheduledAthleteIds = Array.from(new Set([
          resultingAthlete1Id,
          resultingAthlete2Id,
        ].filter((athleteId): athleteId is string => Boolean(athleteId))));
        await this.assertParticipantAvailability(
          transaction,
          resultingEventId,
          resultingCategoryId,
          scheduledAthleteIds,
          resultingStartTime,
          resultingEndTime,
          id,
        );
      }

      const data: Prisma.MatchUpdateInput = {};

      if (updateMatchDto.eventId) {
        data.event = { connect: { id: updateMatchDto.eventId } };
      }
      if (updateMatchDto.categoryId) {
        data.category = { connect: { id: updateMatchDto.categoryId } };
      }
      if (updateMatchDto.divisionId !== undefined) {
        data.division = updateMatchDto.divisionId
          ? { connect: { id: updateMatchDto.divisionId } }
          : { disconnect: true };
      }
      if (updateMatchDto.drawId !== undefined) {
        data.draw = updateMatchDto.drawId
          ? { connect: { id: updateMatchDto.drawId } }
          : { disconnect: true };
      }
      if (updateMatchDto.matchNumber !== undefined) {
        data.matchNumber = updateMatchDto.matchNumber;
      }
      if (updateMatchDto.fop !== undefined) data.fop = updateMatchDto.fop;
      if (updateMatchDto.fopId !== undefined) {
        data.fopRecord = updateMatchDto.fopId
          ? { connect: { id: updateMatchDto.fopId } }
          : { disconnect: true };
      }
      if (updateMatchDto.matchDate) data.matchDate = new Date(updateMatchDto.matchDate);
      if (updateMatchDto.startTime !== undefined) {
        data.startTime = updateMatchDto.startTime
          ? new Date(updateMatchDto.startTime)
          : null;
      }
      if (updateMatchDto.endTime !== undefined) {
        data.endTime = updateMatchDto.endTime ? new Date(updateMatchDto.endTime) : null;
      } else if (updateMatchDto.startTime) {
        const durationSeconds = category.matchDurationSeconds || 300;
        data.endTime = new Date(
          new Date(updateMatchDto.startTime).getTime() + durationSeconds * 1_000,
        );
      }
      if (updateMatchDto.athlete1Id !== undefined) {
        data.athlete1 = updateMatchDto.athlete1Id
          ? { connect: { id: updateMatchDto.athlete1Id } }
          : { disconnect: true };
      }
      if (updateMatchDto.athlete2Id !== undefined) {
        data.athlete2 = updateMatchDto.athlete2Id
          ? { connect: { id: updateMatchDto.athlete2Id } }
          : { disconnect: true };
      }
      if (updateMatchDto.athlete1Score !== undefined) data.athlete1Score = updateMatchDto.athlete1Score;
      if (updateMatchDto.athlete2Score !== undefined) data.athlete2Score = updateMatchDto.athlete2Score;
      if (updateMatchDto.athlete1Advantages !== undefined) data.athlete1Advantages = updateMatchDto.athlete1Advantages;
      if (updateMatchDto.athlete2Advantages !== undefined) data.athlete2Advantages = updateMatchDto.athlete2Advantages;
      if (updateMatchDto.athlete1Penalties !== undefined) data.athlete1Penalties = updateMatchDto.athlete1Penalties;
      if (updateMatchDto.athlete2Penalties !== undefined) data.athlete2Penalties = updateMatchDto.athlete2Penalties;
      if (updateMatchDto.status) data.status = updateMatchDto.status;
      if (updateMatchDto.matchType) data.matchType = updateMatchDto.matchType;
      if (updateMatchDto.winnerId !== undefined) {
        data.winner = updateMatchDto.winnerId
          ? { connect: { id: updateMatchDto.winnerId } }
          : { disconnect: true };
      }
      if (updateMatchDto.winMethod !== undefined) data.winMethod = updateMatchDto.winMethod;
      if (updateMatchDto.round !== undefined) data.round = updateMatchDto.round;
      if (updateMatchDto.bracketPosition !== undefined) data.bracketPosition = updateMatchDto.bracketPosition;
      if (updateMatchDto.winnerToMatchId !== undefined) {
        data.winnerToMatch = updateMatchDto.winnerToMatchId
          ? { connect: { id: updateMatchDto.winnerToMatchId } }
          : { disconnect: true };
      }
      if (updateMatchDto.winnerToSide !== undefined) data.winnerToSide = updateMatchDto.winnerToSide;
      if (updateMatchDto.loserToMatchId !== undefined) {
        data.loserToMatch = updateMatchDto.loserToMatchId
          ? { connect: { id: updateMatchDto.loserToMatchId } }
          : { disconnect: true };
      }
      if (updateMatchDto.loserToSide !== undefined) data.loserToSide = updateMatchDto.loserToSide;
      if (updateMatchDto.pool !== undefined) data.pool = updateMatchDto.pool;
      if (updateMatchDto.notes !== undefined) data.notes = updateMatchDto.notes;

      const updated = await transaction.match.update({ where: { id }, data });
      await this.syncProgression(transaction, previous, updated);

      return transaction.match.findUnique({
        where: { id },
        include: MATCH_INCLUDE,
      });
      });
    } catch (error) {
      this.rethrowScheduleConstraint(error);
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.match.delete({ where: { id } });
  }

  async findGroupedByEventId(eventId: string, includeUnpublishedResults = false) {
    const matches = await this.prisma.match.findMany({
      where: { eventId },
      include: MATCH_INCLUDE,
      orderBy: [{ matchDate: 'asc' }, { categoryId: 'asc' }, { matchNumber: 'asc' }],
    });

    const grouped: Record<string, Record<string, Match[]>> = {};

    for (const match of matches) {
      const dateKey = new Date(match.matchDate).toISOString().split('T')[0];
      const categoryKey = match.category?.name || match.categoryId;

      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][categoryKey]) {
        grouped[dateKey][categoryKey] = [];
      }
      grouped[dateKey][categoryKey].push(
        (includeUnpublishedResults ? match : this.hideUnpublishedResult(match)) as Match,
      );
    }

    return grouped;
  }

  async findDraws(eventId: string, categoryId: string, includeUnpublishedResults = false) {
    const draws = await this.prisma.draw.findMany({
      where: { eventId, categoryId },
      include: {
        fops: {
          orderBy: { name: 'asc' },
        },
        matches: {
          include: MATCH_INCLUDE,
          orderBy: [{ round: 'asc' }, { bracketPosition: 'asc' }, { matchNumber: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      eventId,
      categoryId,
      draws: includeUnpublishedResults
        ? draws
        : draws.map((draw) => ({
          ...draw,
          matches: draw.matches.map((match) => this.hideUnpublishedResult(match)),
        })),
    };
  }

  async generateDraw(eventId: string, categoryId: string, dto: GenerateDrawDto) {
    const drawType = dto.type || DrawType.MAIN_TREE;
    const supportedTypes: DrawType[] = [DrawType.MAIN_TREE, DrawType.REPECHAGE, DrawType.DOUBLE_ELIMINATION];
    if (!supportedTypes.includes(drawType)) {
      throw new BadRequestException('Sinh cây tự động chỉ hỗ trợ nhánh chính, đấu vớt và loại kép');
    }
    if (drawType === DrawType.DOUBLE_ELIMINATION && dto.athleteIds.length < 4) {
      throw new BadRequestException('Thể thức loại kép cần ít nhất 4 vận động viên');
    }

    if (drawType === DrawType.REPECHAGE && dto.athleteIds.length < 6) {
      throw new BadRequestException('Dưới 6 VĐV cần dùng đấu vòng tròn, không sinh nhánh Repechage');
    }

    const [event, category, athletes, entries] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eventId }, select: { id: true, startDate: true, endDate: true } }),
      this.prisma.category.findFirst({
        where: { id: categoryId, events: { some: { id: eventId } } },
        select: { id: true, name: true },
      }),
      this.prisma.athlete.findMany({
        where: {
          id: { in: dto.athleteIds },
          events: { some: { id: eventId } },
          categories: { some: { id: categoryId } },
        },
        select: { id: true, countryId: true, federationId: true },
      }),
      this.prisma.competitionEntry.findMany({
        where: {
          eventId,
          categoryId,
          athleteId: { in: dto.athleteIds },
          status: EntryStatus.VERIFIED,
        },
        select: { athleteId: true, seed: true },
      }),
    ]);

    if (!event) throw new NotFoundException(`Không tìm thấy sự kiện có mã ${eventId}`);
    if (!category) throw new NotFoundException(`Không tìm thấy hạng mục có mã ${categoryId}`);
    if (athletes.length !== dto.athleteIds.length) {
      throw new BadRequestException(
        'Một hoặc nhiều vận động viên chưa đăng ký hạng đấu này trong sự kiện',
      );
    }
    if (dto.divisionId) {
      const division = await this.prisma.division.findFirst({
        where: { id: dto.divisionId, categoryId },
        select: { id: true },
      });
      if (!division) throw new BadRequestException('Phân hạng không thuộc hạng mục này');
    }

    const seeds = new Map(entries.map((entry) => [entry.athleteId, entry.seed]));
    const orderedAthletes = dto.athleteIds.map((id) => ({
      ...(athletes.find((athlete) => athlete.id === id) as SeedAthlete),
      seed: seeds.get(id) ?? null,
    }));
    const fopNames = Array.from(new Set(
      (dto.fops?.length ? dto.fops : dto.fop ? [dto.fop] : [])
        .map((name) => name.trim())
        .filter(Boolean),
    ));
    const bracketSize = this.nextPowerOfTwo(orderedAthletes.length);
    const seededSlots = this.seedAthletes(
      orderedAthletes,
      bracketSize,
      dto.seedingMode || 'STANDARD',
    );
    const baseName = dto.name?.trim() || `${category.name} - MAIN TREE POOL 1`;
    const conflictingDraw = await this.prisma.draw.findFirst({
      where: {
        eventId,
        categoryId,
        name: { in: [baseName, `${baseName} - REPECHAGE`, `${baseName} - DOUBLE-ELIMINATION TREE`] },
      },
      select: { name: true },
    });
    if (conflictingDraw) {
      throw new BadRequestException(`Draw "${conflictingDraw.name}" already exists`);
    }

    const maximumMatch = await this.prisma.match.aggregate({
      where: { eventId },
      _max: { matchNumber: true },
    });
    const number = { value: dto.startMatchNumber || (maximumMatch._max.matchNumber || 0) + 1 };
    const mainDrawId = randomUUID();

    await this.prisma.$transaction(async (transaction) => {
      const fops: ScheduledFop[] = [];
      for (const name of fopNames) {
        fops.push(await transaction.fop.upsert({
          where: { eventId_name: { eventId, name } },
          update: {},
          create: { name, eventId },
          select: { id: true, name: true },
        }));
      }

      const fopCursor = { value: 0 };
      const mainRounds = this.buildWinnerBracket({
        drawId: mainDrawId,
        eventId,
        categoryId,
        divisionId: dto.divisionId,
        matchDate: event.startDate,
        fops,
        fopCursor,
        slots: seededSlots,
        number,
      });
      const generatedMatches = mainRounds.flat();
      let loserDrawId: string | undefined;

      if (drawType === DrawType.DOUBLE_ELIMINATION) {
        loserDrawId = randomUUID();
        generatedMatches.push(
          ...this.buildDoubleEliminationBracket({
            drawId: loserDrawId,
            eventId,
            categoryId,
            divisionId: dto.divisionId,
            matchDate: event.startDate,
            fops,
            fopCursor,
            winnersRounds: mainRounds,
            number,
          }),
        );
      }
      if (drawType === DrawType.REPECHAGE) {
        loserDrawId = randomUUID();
        generatedMatches.push(...this.buildRepechageBracket({
          drawId: loserDrawId, eventId, categoryId, divisionId: dto.divisionId,
          matchDate: event.startDate, fops, fopCursor, winnersRounds: mainRounds, number,
        }));
      }
      this.resolveGeneratedWalkovers(generatedMatches);
      this.assignEvenMatchDates(
        generatedMatches as Array<GeneratedMatch & DateAssignableMatch>,
        event.startDate,
        event.endDate,
      );

      await transaction.draw.create({
        data: {
          id: mainDrawId,
          name: baseName,
          type: DrawType.MAIN_TREE,
          eventId,
          categoryId,
          divisionId: dto.divisionId,
          bracketSize,
          sortOrder: 10,
          fops: fops.length
            ? { connect: fops.map(({ id }) => ({ id })) }
            : undefined,
        },
      });
      if (loserDrawId) {
        await transaction.draw.create({
          data: {
            id: loserDrawId,
            name: `${baseName} - ${drawType === DrawType.REPECHAGE ? 'REPECHAGE' : 'DOUBLE-ELIMINATION TREE'}`,
            type: drawType,
            eventId,
            categoryId,
            divisionId: dto.divisionId,
            bracketSize: Math.max(2, (drawType === DrawType.REPECHAGE ? Math.min(32, bracketSize) : bracketSize) / 2),
            sortOrder: 20,
            fops: fops.length
              ? { connect: fops.map(({ id }) => ({ id })) }
              : undefined,
          },
        });
      }
      await transaction.match.createMany({ data: generatedMatches });
    });

    return this.findDraws(eventId, categoryId);
  }

  async distributeEventMatchDates(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');

    const daySlots = this.eventDaySlots(event.startDate, event.endDate);
    if (daySlots.length < 2) {
      throw new BadRequestException('Sự kiện chỉ diễn ra trong một ngày, không thể chia lịch theo nhiều ngày');
    }

    const [matches, activeMatchCount] = await Promise.all([
      this.prisma.match.findMany({
        where: {
          eventId,
          startTime: null,
          scheduleLocked: false,
          status: { not: MatchStatus.CANCELLED },
        },
        orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.match.count({
        where: { eventId, status: { not: MatchStatus.CANCELLED } },
      }),
    ]);
    if (!matches.length) {
      throw new BadRequestException('Không có trận chưa xếp giờ để chia đều theo ngày');
    }

    const assignments = this.evenMatchDateAssignments(matches, event.startDate, event.endDate);
    const changed = assignments.filter(({ match, matchDate }) => (
      new Date(match.matchDate).getTime() !== matchDate.getTime()
    ));
    if (changed.length) {
      await this.prisma.$transaction(changed.map(({ match, matchDate }) => this.prisma.match.update({
        where: { id: match.id },
        data: { matchDate },
      })));
    }

    const distribution = assignments.reduce<Record<string, number>>((result, { matchDate }) => {
      const date = this.localDateKey(matchDate);
      result[date] = (result[date] || 0) + 1;
      return result;
    }, {});
    return {
      eventId,
      eligible: matches.length,
      updated: changed.length,
      skippedScheduledOrLocked: Math.max(0, activeMatchCount - matches.length),
      eventDayCount: daySlots.length,
      usedDayCount: Object.keys(distribution).length,
      distribution,
    };
  }

  private buildWinnerBracket(input: {
    drawId: string;
    eventId: string;
    categoryId: string;
    divisionId?: string;
    matchDate: Date;
    fops: ScheduledFop[];
    fopCursor: { value: number };
    slots: Array<SeedAthlete | null>;
    number: { value: number };
  }) {
    const roundCount = Math.log2(input.slots.length);
    const rounds: GeneratedMatch[][] = [];

    for (let round = 1; round <= roundCount; round += 1) {
      const matchCount = input.slots.length / 2 ** round;
      const roundMatches = Array.from({ length: matchCount }, (_, position) => {
        const fop = this.takeNextFop(input.fops, input.fopCursor);
        return {
          id: randomUUID(),
          eventId: input.eventId,
          categoryId: input.categoryId,
          divisionId: input.divisionId,
          drawId: input.drawId,
          matchNumber: input.number.value++,
          fop: fop?.name,
          fopId: fop?.id,
          matchDate: input.matchDate,
          athlete1Id: round === 1 ? input.slots[position * 2]?.id || null : null,
          athlete2Id: round === 1 ? input.slots[position * 2 + 1]?.id || null : null,
          status: MatchStatus.SCHEDULED,
          matchType: this.matchTypeForCount(matchCount),
          round,
          bracketPosition: position,
          notes: `Generated winner bracket · round ${round}`,
        } satisfies GeneratedMatch;
      });
      rounds.push(roundMatches);
    }

    for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
      for (let position = 0; position < rounds[roundIndex].length; position += 1) {
        const match = rounds[roundIndex][position];
        if (roundIndex < rounds.length - 1) {
          const target = rounds[roundIndex + 1][Math.floor(position / 2)];
          match.winnerToMatchId = target.id;
          match.winnerToSide = position % 2 === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2;
        }
      }
    }

    return rounds;
  }

  private buildDoubleEliminationBracket(input: {
    drawId: string;
    eventId: string;
    categoryId: string;
    divisionId?: string;
    matchDate: Date;
    fops: ScheduledFop[];
    fopCursor: { value: number };
    winnersRounds: GeneratedMatch[][];
    number: { value: number };
  }) {
    const winnerRoundCount = input.winnersRounds.length;
    const loserRoundCount = winnerRoundCount * 2 - 2;
    const loserRounds: GeneratedMatch[][] = [];

    for (let stage = 1; stage <= loserRoundCount; stage += 1) {
      const pair = Math.ceil(stage / 2);
      const matchCount = input.winnersRounds[0].length / 2 ** pair;
      loserRounds.push(Array.from({ length: matchCount }, (_, position) => {
        const fop = this.takeNextFop(input.fops, input.fopCursor);
        return {
          id: randomUUID(),
          eventId: input.eventId,
          categoryId: input.categoryId,
          divisionId: input.divisionId,
          drawId: input.drawId,
          matchNumber: input.number.value++,
          fop: fop?.name,
          fopId: fop?.id,
          matchDate: input.matchDate,
          status: MatchStatus.SCHEDULED,
          matchType: MatchType.ELIMINATION,
          round: stage,
          bracketPosition: position,
          notes: `Generated double-elimination loser bracket · round ${stage}`,
        } satisfies GeneratedMatch;
      }));
    }

    const finalFop = this.takeNextFop(input.fops, input.fopCursor);
    const grandFinal: GeneratedMatch = {
      id: randomUUID(),
      eventId: input.eventId,
      categoryId: input.categoryId,
      divisionId: input.divisionId,
      drawId: input.drawId,
      matchNumber: input.number.value++,
      fop: finalFop?.name,
      fopId: finalFop?.id,
      matchDate: input.matchDate,
      status: MatchStatus.SCHEDULED,
      matchType: MatchType.FINAL,
      round: loserRoundCount + 1,
      bracketPosition: 0,
      notes: 'Generated double-elimination grand final',
    };

    input.winnersRounds[0].forEach((match, position) => {
      const target = loserRounds[0][Math.floor(position / 2)];
      match.loserToMatchId = target.id;
      match.loserToSide = position % 2 === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2;
    });

    for (let stageIndex = 0; stageIndex < loserRounds.length; stageIndex += 1) {
      const stage = stageIndex + 1;
      const current = loserRounds[stageIndex];
      const next = loserRounds[stageIndex + 1];

      if (next) {
        current.forEach((match, position) => {
          match.winnerToMatchId = next[stage % 2 === 1 ? position : Math.floor(position / 2)].id;
          match.winnerToSide = stage % 2 === 1
            ? BracketSide.ATHLETE1
            : position % 2 === 0
              ? BracketSide.ATHLETE1
              : BracketSide.ATHLETE2;
        });
      }

      if (stage % 2 === 0) {
        const winnerRoundIndex = stage / 2;
        input.winnersRounds[winnerRoundIndex].forEach((match, position) => {
          match.loserToMatchId = current[position].id;
          match.loserToSide = BracketSide.ATHLETE2;
        });
      }
    }

    const winnerFinal = input.winnersRounds.at(-1)?.[0];
    const loserFinal = loserRounds.at(-1)?.[0];
    if (winnerFinal && loserFinal) {
      winnerFinal.winnerToMatchId = grandFinal.id;
      winnerFinal.winnerToSide = BracketSide.ATHLETE1;
      loserFinal.winnerToMatchId = grandFinal.id;
      loserFinal.winnerToSide = BracketSide.ATHLETE2;
    }

    return [...loserRounds.flat(), grandFinal];
  }

  private buildRepechageBracket(input: {
    drawId: string;
    eventId: string;
    categoryId: string;
    divisionId?: string;
    matchDate: Date;
    fops: ScheduledFop[];
    fopCursor: { value: number };
    winnersRounds: GeneratedMatch[][];
    number: { value: number };
  }) {
    // JJIF Sporting Code, Appendix 9: two bronze matches; gold stays in the main tree.
    // Above 32 places, earlier qualifying rounds remain single elimination (4.2.5).
    const eligibleRounds = input.winnersRounds.slice(-5);
    const roundCount = eligibleRounds.length * 2 - 4;
    const rounds: GeneratedMatch[][] = [];
    for (let stage = 1; stage <= roundCount; stage += 1) {
      const matchCount = eligibleRounds[0].length / 2 ** Math.ceil(stage / 2);
      rounds.push(Array.from({ length: matchCount }, (_, position) => {
        const fop = this.takeNextFop(input.fops, input.fopCursor);
        return {
          id: randomUUID(), eventId: input.eventId, categoryId: input.categoryId,
          divisionId: input.divisionId, drawId: input.drawId,
          matchNumber: input.number.value++, fop: fop?.name, fopId: fop?.id,
          matchDate: input.matchDate, status: MatchStatus.SCHEDULED,
          matchType: MatchType.ELIMINATION, round: stage, bracketPosition: position,
          notes: stage === roundCount
            ? `Generated repechage bronze medal ${position === 0 ? 'A' : 'B'}`
            : `Generated repechage · round ${stage}`,
        } satisfies GeneratedMatch;
      }));
    }
    eligibleRounds[0].forEach((match, position) => {
      match.loserToMatchId = rounds[0][Math.floor(position / 2)].id;
      match.loserToSide = position % 2 === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2;
    });
    rounds.forEach((current, index) => {
      const stage = index + 1;
      const next = rounds[index + 1];
      if (next) current.forEach((match, position) => {
        match.winnerToMatchId = next[stage % 2 === 1 ? position : Math.floor(position / 2)].id;
        match.winnerToSide = stage % 2 === 1 || position % 2 === 0 ? BracketSide.ATHLETE1 : BracketSide.ATHLETE2;
      });
      if (stage % 2 === 0) eligibleRounds[stage / 2].forEach((match, position) => {
        // Cross the semifinal losers into the opposite bronze path (Appendix 9.2–9.4).
        const destination = stage === roundCount ? position ^ 1 : position;
        match.loserToMatchId = current[destination].id;
        match.loserToSide = BracketSide.ATHLETE2;
      });
    });
    return rounds.flat();
  }

  private seedAthletes(
    athletes: SeedAthlete[],
    bracketSize: number,
    mode: SeedingMode,
  ): Array<SeedAthlete | null> {
    let ordered = [...athletes];
    if (mode !== 'ORDERED' && mode !== 'RANDOM') {
      ordered.sort((left, right) => (
        (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER)
      ));
    }
    if (mode === 'RANDOM') ordered = this.shuffle(ordered);
    if (mode === 'COUNTRY_SEPARATED') ordered = this.spreadByGroup(ordered, (athlete) => athlete.countryId);
    if (mode === 'FEDERATION_SEPARATED') {
      ordered = this.spreadByGroup(ordered, (athlete) => athlete.federationId || athlete.countryId);
    }
    if (mode === 'ORDERED') return [...ordered, ...Array(bracketSize - ordered.length).fill(null)];

    const seedOrder = this.standardSeedOrder(bracketSize);
    return seedOrder.map((seed) => ordered[seed - 1] || null);
  }

  private standardSeedOrder(size: number) {
    let order = [1, 2];
    while (order.length < size) {
      const sum = order.length * 2 + 1;
      order = order.flatMap((seed) => [seed, sum - seed]);
    }
    return order;
  }

  private spreadByGroup(athletes: SeedAthlete[], groupKey: (athlete: SeedAthlete) => string) {
    const groups = new Map<string, SeedAthlete[]>();
    athletes.forEach((athlete) => {
      const key = groupKey(athlete);
      groups.set(key, [...(groups.get(key) || []), athlete]);
    });
    const buckets = [...groups.values()].sort((left, right) => right.length - left.length);
    const result: SeedAthlete[] = [];
    while (result.length < athletes.length) {
      buckets.forEach((bucket) => {
        const athlete = bucket.shift();
        if (athlete) result.push(athlete);
      });
    }
    return result;
  }

  private shuffle<T>(items: T[]) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  private takeNextFop(fops: ScheduledFop[], cursor: { value: number }) {
    if (!fops.length) return undefined;
    const fop = fops[cursor.value % fops.length];
    cursor.value += 1;
    return fop;
  }

  private assignEvenMatchDates<T extends DateAssignableMatch>(matches: T[], startDate: Date, endDate: Date) {
    this.evenMatchDateAssignments(matches, startDate, endDate).forEach(({ match, matchDate }) => {
      match.matchDate = matchDate;
    });
  }

  private evenMatchDateAssignments<T extends DateAssignableMatch>(matches: T[], startDate: Date, endDate: Date) {
    const ordered = this.orderMatchesByProgression(matches);
    const dates = this.eventDaySlots(startDate, endDate);
    return ordered.map((match, index) => {
      const dayIndex = ordered.length <= 1
        ? 0
        : Math.round((index * (dates.length - 1)) / (ordered.length - 1));
      return { match, matchDate: new Date(dates[dayIndex]) };
    });
  }

  private orderMatchesByProgression<T extends DateAssignableMatch>(matches: T[]) {
    const byId = new Map(matches.map((match) => [match.id, match]));
    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map(matches.map((match) => [match.id, 0]));
    for (const match of matches) {
      for (const targetId of [match.winnerToMatchId, match.loserToMatchId]) {
        if (!targetId || targetId === match.id || !byId.has(targetId)) continue;
        const targets = outgoing.get(match.id) || new Set<string>();
        if (targets.has(targetId)) continue;
        targets.add(targetId);
        outgoing.set(match.id, targets);
        incoming.set(targetId, (incoming.get(targetId) || 0) + 1);
      }
    }
    const compare = (left: T, right: T) => (
      (left.round ?? Number.MAX_SAFE_INTEGER) - (right.round ?? Number.MAX_SAFE_INTEGER)
      || (left.matchNumber ?? Number.MAX_SAFE_INTEGER) - (right.matchNumber ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id)
    );
    const ready = matches.filter((match) => incoming.get(match.id) === 0).sort(compare);
    const ordered: T[] = [];
    while (ready.length) {
      const match = ready.shift()!;
      ordered.push(match);
      for (const targetId of outgoing.get(match.id) || []) {
        const remaining = (incoming.get(targetId) || 0) - 1;
        incoming.set(targetId, remaining);
        if (remaining === 0) {
          ready.push(byId.get(targetId)!);
          ready.sort(compare);
        }
      }
    }
    if (ordered.length < matches.length) {
      const scheduledIds = new Set(ordered.map(({ id }) => id));
      ordered.push(...matches.filter(({ id }) => !scheduledIds.has(id)).sort(compare));
    }
    return ordered;
  }

  private eventDaySlots(startDate: Date, endDate: Date) {
    const dayMs = 86_400_000;
    const dayCount = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1);
    return Array.from({ length: dayCount }, (_, index) => new Date(startDate.getTime() + index * dayMs));
  }

  private localDateKey(date: Date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private assertInsideEventDates(
    event: { startDate: Date; endDate: Date },
    matchDate: Date,
    startTime?: Date | null,
    endTime?: Date | null,
  ) {
    const firstDay = this.localDateKey(event.startDate);
    const lastDay = this.localDateKey(event.endDate);
    const values = [matchDate, startTime, endTime].filter((value): value is Date => Boolean(value));
    if (values.some((value) => {
      const day = this.localDateKey(value);
      return day < firstDay || day > lastDay;
    })) {
      throw new BadRequestException(
        `Thời gian thi đấu phải nằm trong thời gian sự kiện (${firstDay} đến ${lastDay})`,
      );
    }
  }

  private async assertFopAvailability(
    database: PrismaService | Prisma.TransactionClient,
    eventId: string,
    fopId: string | null | undefined,
    startTime: Date,
    endTime: Date,
    excludeMatchId?: string,
  ) {
    if (!fopId || endTime <= startTime) return;
    const conflict = await (database as any).match.findFirst({
      where: {
        eventId,
        fopId,
        ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}),
        status: { not: MatchStatus.CANCELLED },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: {
        id: true,
        matchNumber: true,
        startTime: true,
        endTime: true,
        fopRecord: { select: { name: true } },
      },
    });
    if (conflict) {
      const range = [conflict.startTime, conflict.endTime]
        .filter(Boolean)
        .map((value) => new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(value))
        .join(' – ');
      throw new ConflictException(
        `${conflict.fopRecord?.name || 'Sân/FOP'} đã có trận #${conflict.matchNumber || conflict.id} lúc ${range}`,
      );
    }
  }

  private nextPowerOfTwo(value: number) {
    return 2 ** Math.ceil(Math.log2(value));
  }

  private matchTypeForCount(matchCount: number) {
    if (matchCount === 1) return MatchType.FINAL;
    if (matchCount === 2) return MatchType.SEMIFINAL;
    if (matchCount === 4) return MatchType.QUARTERFINAL;
    if (matchCount === 8) return MatchType.ROUND_OF_16;
    if (matchCount === 16) return MatchType.ROUND_OF_32;
    return MatchType.ELIMINATION;
  }

  private resolveGeneratedWalkovers(matches: GeneratedMatch[]) {
    const matchById = new Map(matches.map((match) => [match.id as string, match]));
    let changed = true;
    let iteration = 0;

    while (changed && iteration < matches.length * 2) {
      changed = false;
      iteration += 1;

      for (const source of matches) {
        if (source.status !== MatchStatus.FINISHED || !source.winnerId) continue;
        const loserId = source.winnerId === source.athlete1Id ? source.athlete2Id : source.athlete1Id;
        const assignments: Array<[string | null | undefined, BracketSide | null | undefined, string | null | undefined]> = [
          [source.winnerToMatchId, source.winnerToSide, source.winnerId],
          [source.loserToMatchId, source.loserToSide, loserId],
        ];
        assignments.forEach(([targetId, side, athleteId]) => {
          if (!targetId || !side || !athleteId) return;
          const target = matchById.get(targetId);
          if (!target) return;
          const key = side === BracketSide.ATHLETE1 ? 'athlete1Id' : 'athlete2Id';
          if (!target[key]) {
            target[key] = athleteId;
            changed = true;
          }
        });
      }

      for (const match of matches) {
        if (match.status !== MatchStatus.SCHEDULED) continue;
        if ('resultStatus' in match && match.resultStatus !== ResultStatus.DRAFT) continue;
        const incoming = matches.filter((source) => (
          source.winnerToMatchId === match.id || source.loserToMatchId === match.id
        ));
        const sideResolved = (side: BracketSide) => {
          const athleteId = side === BracketSide.ATHLETE1 ? match.athlete1Id : match.athlete2Id;
          if (athleteId) return true;
          const feeders = incoming.filter((source) => (
            (source.winnerToMatchId === match.id && source.winnerToSide === side)
            || (source.loserToMatchId === match.id && source.loserToSide === side)
          ));
          return feeders.every((source) => {
            if (source.status !== MatchStatus.FINISHED) return false;
            const routedAthlete = source.winnerToMatchId === match.id && source.winnerToSide === side
              ? source.winnerId
              : !source.winnerId ? null : source.winnerId === source.athlete1Id ? source.athlete2Id : source.athlete1Id;
            // A newly resolved bye may still need to propagate on the next pass.
            return !routedAthlete;
          });
        };
        const athleteIds = [match.athlete1Id, match.athlete2Id].filter(Boolean) as string[];
        if (
          athleteIds.length <= 1
          && sideResolved(BracketSide.ATHLETE1)
          && sideResolved(BracketSide.ATHLETE2)
        ) {
          match.status = MatchStatus.FINISHED;
          match.winnerId = athleteIds[0] || null;
          match.winMethod = WinMethod.WALKOVVER;
          changed = true;
        }
      }
    }
  }

  async syncProgression(
    transaction: Prisma.TransactionClient,
    previous: Match,
    updated: Match,
  ) {
    const progressionFields: Array<keyof Match> = ['status', 'winnerId', 'winnerTeamId', 'athlete1Id', 'athlete2Id', 'team1Id', 'team2Id', 'winnerToMatchId', 'winnerToSide', 'loserToMatchId', 'loserToSide'];
    if (progressionFields.every((field) => previous[field] === updated[field])) return;
    await this.clearProgressionTarget(transaction, previous.winnerToMatchId, previous.winnerToSide, previous.winnerId);
    await this.clearProgressionTarget(
      transaction,
      previous.loserToMatchId,
      previous.loserToSide,
      this.getLoserId(previous),
    );
    await this.clearTeamProgressionTarget(
      transaction,
      previous.winnerToMatchId,
      previous.winnerToSide,
      previous.winnerTeamId,
    );
    await this.clearTeamProgressionTarget(
      transaction,
      previous.loserToMatchId,
      previous.loserToSide,
      this.getLoserTeamId(previous),
    );

    if (updated.status !== 'FINISHED') return;

    await this.assignProgressionTarget(
      transaction,
      updated.winnerToMatchId,
      updated.winnerToSide,
      updated.winnerId,
    );
    await this.assignProgressionTarget(
      transaction,
      updated.loserToMatchId,
      updated.loserToSide,
      this.getLoserId(updated),
    );
    await this.assignTeamProgressionTarget(
      transaction,
      updated.winnerToMatchId,
      updated.winnerToSide,
      updated.winnerTeamId,
    );
    await this.assignTeamProgressionTarget(
      transaction,
      updated.loserToMatchId,
      updated.loserToSide,
      this.getLoserTeamId(updated),
    );
    await this.resolveProgressionWalkovers(transaction, [updated.winnerToMatchId, updated.loserToMatchId]);
  }

  private async resolveProgressionWalkovers(transaction: Prisma.TransactionClient, targetIds: Array<string | null>) {
    const pending = targetIds.filter((id): id is string => Boolean(id));
    const visited = new Set<string>();
    while (pending.length) {
      const id = pending.shift()!;
      if (visited.has(id)) continue;
      await transaction.$queryRaw`SELECT id FROM "Match" WHERE id = ${id} FOR UPDATE`;
      const target = await transaction.match.findUnique({ where: { id } });
      if (!target || target.status !== MatchStatus.SCHEDULED || target.resultStatus !== ResultStatus.DRAFT
        || !target.drawId || !target.notes?.startsWith('Generated ') || target.resultEnteredAt) continue;
      const incoming = await transaction.match.findMany({
        where: { OR: [{ winnerToMatchId: id }, { loserToMatchId: id }] },
      });
      const resolved = (side: BracketSide) => {
        const occupant = side === BracketSide.ATHLETE1 ? target.athlete1Id : target.athlete2Id;
        if (occupant) return true;
        return incoming.filter((source) => (
          source.winnerToMatchId === id && source.winnerToSide === side
          || source.loserToMatchId === id && source.loserToSide === side
        )).every((source) => {
          if (source.status !== MatchStatus.FINISHED) return false;
          const routedAthlete = source.winnerToMatchId === id && source.winnerToSide === side
            ? source.winnerId : this.getLoserId(source);
          return !routedAthlete;
        });
      };
      const athletes = [target.athlete1Id, target.athlete2Id].filter(Boolean);
      if (athletes.length > 1 || !resolved(BracketSide.ATHLETE1) || !resolved(BracketSide.ATHLETE2)) continue;
      visited.add(id);
      const winnerId = athletes[0] || null;
      await transaction.match.update({
        where: { id },
        data: { status: MatchStatus.FINISHED, winnerId, winMethod: WinMethod.WALKOVVER, resultVersion: { increment: 1 } },
      });
      await this.assignProgressionTarget(transaction, target.winnerToMatchId, target.winnerToSide, winnerId);
      pending.push(...[target.winnerToMatchId, target.loserToMatchId].filter((next): next is string => Boolean(next)));
    }
  }

  private async assertProgressionTargetEditable(transaction: Prisma.TransactionClient, id: string) {
    await transaction.$queryRaw`SELECT id FROM "Match" WHERE id = ${id} FOR UPDATE`;
    let target = await transaction.match.findUnique({ where: { id } });
    if (target && this.isGeneratedWalkover(target)) {
      await this.reopenGeneratedWalkover(transaction, target, new Set());
      target = await transaction.match.findUnique({ where: { id } });
    }
    if (!target || target.status !== MatchStatus.SCHEDULED || target.resultStatus !== ResultStatus.DRAFT) {
      throw new ConflictException('Trận đích đã bắt đầu hoặc đã có kết quả; không thể thay đổi VĐV của nhánh đấu');
    }
    return target;
  }

  private isGeneratedWalkover(match: Match) {
    return match.status === MatchStatus.FINISHED
      && match.resultStatus === ResultStatus.DRAFT
      && match.winMethod === WinMethod.WALKOVVER
      && !match.resultEnteredAt
      && Boolean(match.notes?.startsWith('Generated '));
  }

  private async reopenGeneratedWalkover(
    transaction: Prisma.TransactionClient,
    match: Match,
    visited: Set<string>,
  ) {
    if (!this.isGeneratedWalkover(match) || visited.has(match.id)) return;
    visited.add(match.id);

    if (match.winnerToMatchId && match.winnerToSide && match.winnerId) {
      await transaction.$queryRaw`SELECT id FROM "Match" WHERE id = ${match.winnerToMatchId} FOR UPDATE`;
      let next = await transaction.match.findUnique({ where: { id: match.winnerToMatchId } });
      if (next && this.isGeneratedWalkover(next)) {
        await this.reopenGeneratedWalkover(transaction, next, visited);
        next = await transaction.match.findUnique({ where: { id: match.winnerToMatchId } });
      }
      if (!next || next.status !== MatchStatus.SCHEDULED || next.resultStatus !== ResultStatus.DRAFT) {
        throw new ConflictException('Không thể sửa walkover tự động vì trận kế tiếp đã bắt đầu hoặc có kết quả');
      }
      const field = match.winnerToSide === BracketSide.ATHLETE1 ? 'athlete1Id' : 'athlete2Id';
      if (next[field] === match.winnerId) {
        await transaction.match.update({
          where: { id: next.id },
          data: match.winnerToSide === BracketSide.ATHLETE1 ? { athlete1Id: null } : { athlete2Id: null },
        });
      }
    }

    await transaction.match.update({
      where: { id: match.id },
      data: { status: MatchStatus.SCHEDULED, winnerId: null, winMethod: null },
    });
  }

  private getLoserId(match: Match) {
    if (!match.winnerId) return null;
    return match.athlete1Id === match.winnerId ? match.athlete2Id : match.athlete1Id;
  }

  private getLoserTeamId(match: Match) {
    if (!match.winnerTeamId) return null;
    return match.team1Id === match.winnerTeamId ? match.team2Id : match.team1Id;
  }

  private async clearProgressionTarget(
    transaction: Prisma.TransactionClient,
    targetMatchId: string | null,
    targetSide: 'ATHLETE1' | 'ATHLETE2' | null,
    athleteId: string | null,
  ) {
    if (!targetMatchId || !targetSide || !athleteId) return;
    await this.assertProgressionTargetEditable(transaction, targetMatchId);
    await transaction.match.updateMany({
      where: {
        id: targetMatchId,
        ...(targetSide === 'ATHLETE1' ? { athlete1Id: athleteId } : { athlete2Id: athleteId }),
      },
      data: targetSide === 'ATHLETE1' ? { athlete1Id: null } : { athlete2Id: null },
    });
  }

  private async assignProgressionTarget(
    transaction: Prisma.TransactionClient,
    targetMatchId: string | null,
    targetSide: 'ATHLETE1' | 'ATHLETE2' | null,
    athleteId: string | null,
  ) {
    if (!targetMatchId || !targetSide || !athleteId) return;
    const target = await this.assertProgressionTargetEditable(transaction, targetMatchId);
    const occupant = targetSide === 'ATHLETE1' ? target.athlete1Id : target.athlete2Id;
    if (occupant && occupant !== athleteId) throw new ConflictException('Ô nhánh đấu đã có VĐV khác');
    await transaction.match.update({
      where: { id: targetMatchId },
      data: targetSide === 'ATHLETE1' ? { athlete1Id: athleteId } : { athlete2Id: athleteId },
    });
  }

  private async clearTeamProgressionTarget(
    transaction: Prisma.TransactionClient,
    targetMatchId: string | null,
    targetSide: 'ATHLETE1' | 'ATHLETE2' | null,
    teamId: string | null,
  ) {
    if (!targetMatchId || !targetSide || !teamId) return;
    await this.assertProgressionTargetEditable(transaction, targetMatchId);
    await transaction.match.updateMany({
      where: {
        id: targetMatchId,
        ...(targetSide === 'ATHLETE1' ? { team1Id: teamId } : { team2Id: teamId }),
      },
      data: targetSide === 'ATHLETE1' ? { team1Id: null } : { team2Id: null },
    });
  }

  private async assignTeamProgressionTarget(
    transaction: Prisma.TransactionClient,
    targetMatchId: string | null,
    targetSide: 'ATHLETE1' | 'ATHLETE2' | null,
    teamId: string | null,
  ) {
    if (!targetMatchId || !targetSide || !teamId) return;
    await this.assertProgressionTargetEditable(transaction, targetMatchId);
    await transaction.match.update({
      where: { id: targetMatchId },
      data: targetSide === 'ATHLETE1' ? { team1Id: teamId } : { team2Id: teamId },
    });
  }

  private rethrowScheduleConstraint(error: unknown): never {
    const prismaError = error as {
      code?: string;
      message?: string;
      meta?: { database_error?: string; reason?: string; constraint?: string };
    };
    const details = [
      prismaError.message,
      prismaError.meta?.database_error,
      prismaError.meta?.reason,
      prismaError.meta?.constraint,
    ].filter(Boolean).join(' ').toLowerCase();

    if (
      details.includes('match_fop_time_no_overlap')
      || (prismaError.code === 'P2004' && details.includes('exclusion'))
    ) {
      throw new ConflictException(
        'Sân/FOP đã có trận đấu khác trong khoảng thời gian này',
      );
    }
    if (details.includes('match_valid_time_range')) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
    }
    throw error;
  }

  private hideUnpublishedResult<T extends Record<string, any>>(match: T): T {
    if (match.resultStatus === ResultStatus.PUBLISHED || match.resultStatus === ResultStatus.LOCKED) {
      return match;
    }
    return {
      ...match,
      athlete1Score: 0,
      athlete2Score: 0,
      athlete1Advantages: 0,
      athlete2Advantages: 0,
      athlete1Penalties: 0,
      athlete2Penalties: 0,
      winnerId: null,
      winner: null,
      winnerTeamId: null,
      winnerTeam: null,
      winMethod: null,
      resultData: null,
    };
  }

  private async assertParticipantAvailability(
    database: PrismaService | Prisma.TransactionClient,
    eventId: string,
    categoryId: string,
    athleteIds: string[],
    startTime: Date,
    endTime: Date,
    excludeMatchId?: string,
  ) {
    if (!athleteIds.length) return;
    const category = await (database as any).category.findUnique({
      where: { id: categoryId },
      select: { sportId: true },
    });
    const rule = category
      ? await (database as any).sportSchedulingRule.findUnique({
        where: { eventId_sportId: { eventId, sportId: category.sportId } },
        select: { minRestMinutes: true },
      })
      : null;
    const restMs = (rule?.minRestMinutes ?? 60) * 60_000;
    const conflict = await (database as any).match.findFirst({
      where: {
        eventId,
        ...(excludeMatchId ? { id: { not: excludeMatchId } } : {}),
        status: { not: MatchStatus.CANCELLED },
        startTime: { lt: new Date(endTime.getTime() + restMs) },
        endTime: { gt: new Date(startTime.getTime() - restMs) },
        OR: [
          { athlete1Id: { in: athleteIds } },
          { athlete2Id: { in: athleteIds } },
          { participants: { some: { athleteId: { in: athleteIds } } } },
        ],
      },
      select: { id: true, matchNumber: true },
    });
    if (conflict) {
      throw new ConflictException(
        `Vận động viên chưa đủ thời gian nghỉ so với trận #${conflict.matchNumber || conflict.id}`,
      );
    }
  }
}
