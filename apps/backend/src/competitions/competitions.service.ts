import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompetitionFormat,
  EntryStatus,
  EntryType,
  MatchStatus,
  MatchType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEntryDto,
  CreateTeamDto,
  GenerateHeatsDto,
  GenerateRoundRobinDto,
} from './dto/competition.dto';

const ENTRY_INCLUDE = {
  country: { select: { id: true, code: true, name: true, flagUrl: true } },
  athlete: { select: { id: true, fullName: true, gender: true, birthDate: true, weight: true } },
  team: {
    include: {
      members: {
        include: { athlete: { select: { id: true, fullName: true } } },
        orderBy: [{ relayLeg: 'asc' as const }, { createdAt: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.CompetitionEntryInclude;

type EntryRow = Prisma.CompetitionEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  listTeams(eventId: string) {
    return this.prisma.team.findMany({
      where: { eventId },
      include: {
        sport: { select: { id: true, name: true, code: true } },
        country: { select: { id: true, name: true, code: true, flagUrl: true } },
        members: {
          include: { athlete: { select: { id: true, fullName: true, gender: true } } },
          orderBy: [{ relayLeg: 'asc' }, { createdAt: 'asc' }],
        },
        _count: { select: { entries: true } },
      },
      orderBy: [{ sport: { name: 'asc' } }, { country: { name: 'asc' } }, { name: 'asc' }],
    });
  }

  async createTeam(eventId: string, dto: CreateTeamDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { sports: { where: { id: dto.sportId }, select: { id: true } } },
    });
    if (!event) throw new NotFoundException('Không tìm thấy sự kiện');
    if (!event.sports.length) throw new BadRequestException('Bộ môn không thuộc sự kiện này');
    const memberIds = dto.members.map(({ athleteId }) => athleteId);
    if (new Set(memberIds).size !== memberIds.length) throw new BadRequestException('Danh sách thành viên đội không được trùng lặp');
    const athletes = await this.prisma.athlete.findMany({
      where: { id: { in: memberIds }, countryId: dto.countryId },
      select: { id: true },
    });
    if (athletes.length !== memberIds.length) {
      throw new BadRequestException('Mọi thành viên phải tồn tại và đại diện đúng quốc gia đã chọn');
    }
    const relayLegs = dto.members.map(({ relayLeg }) => relayLeg).filter((leg): leg is number => Boolean(leg));
    if (new Set(relayLegs).size !== relayLegs.length) throw new BadRequestException('Thứ tự thi đấu tiếp sức không được trùng lặp');

    return this.prisma.$transaction(async (transaction) => {
      await transaction.event.update({
        where: { id: eventId },
        data: { athletes: { connect: memberIds.map((id) => ({ id })) } },
      });
      return transaction.team.create({
        data: {
          eventId,
          sportId: dto.sportId,
          countryId: dto.countryId,
          name: dto.name.trim(),
          code: dto.code?.trim(),
          gender: dto.gender,
          members: {
            create: dto.members.map((member) => ({
              athleteId: member.athleteId,
              role: member.role?.trim(),
              relayLeg: member.relayLeg,
            })),
          },
        },
        include: { country: true, sport: true, members: { include: { athlete: true } } },
      });
    });
  }

  listEntries(eventId: string, categoryId: string) {
    return this.prisma.competitionEntry.findMany({
      where: { eventId, categoryId },
      include: ENTRY_INCLUDE,
      orderBy: [{ seed: 'asc' }, { country: { name: 'asc' } }, { createdAt: 'asc' }],
    });
  }

  async createEntry(eventId: string, categoryId: string, dto: CreateEntryDto) {
    if (dto.type === EntryType.INDIVIDUAL && (!dto.athleteId || dto.teamId)) {
      throw new BadRequestException('Lượt đăng ký cá nhân chỉ được chọn một vận động viên');
    }
    if ((dto.type === EntryType.TEAM || dto.type === EntryType.RELAY) && (!dto.teamId || dto.athleteId)) {
      throw new BadRequestException('Lượt đăng ký đội hoặc tiếp sức phải chọn một đội');
    }
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, events: { some: { id: eventId } } },
      include: {
        sport: { select: { id: true } },
        events: {
          where: { id: eventId },
          select: { startDate: true },
          take: 1,
        },
      },
    });
    if (!category) throw new NotFoundException('Hạng mục không thuộc sự kiện này');

    let countryId: string;
    if (dto.athleteId) {
      const athlete = await this.prisma.athlete.findUnique({ where: { id: dto.athleteId } });
      if (!athlete) throw new NotFoundException('Không tìm thấy vận động viên');
      this.assertAthleteEligibility(athlete, category, category.events[0].startDate);
      countryId = athlete.countryId;
    } else {
      const team = await this.prisma.team.findFirst({
        where: { id: dto.teamId, eventId, sportId: category.sportId },
      });
      if (!team) throw new BadRequestException('Đội không thuộc sự kiện hoặc bộ môn này');
      if (category.gender !== 'MIXED' && team.gender && team.gender !== category.gender) {
        throw new BadRequestException('Giới tính của đội không đáp ứng điều kiện hạng mục');
      }
      countryId = team.countryId;
    }

    return this.prisma.$transaction(async (transaction) => {
      if (category.maxEntriesPerCountry) {
        await transaction.$queryRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`${eventId}:${categoryId}:${countryId}`}, 0)
          )
        `);
        const currentCountryEntries = await transaction.competitionEntry.count({
          where: {
            eventId,
            categoryId,
            countryId,
            status: { in: [EntryStatus.REGISTERED, EntryStatus.VERIFIED] },
          },
        });
        if (currentCountryEntries >= category.maxEntriesPerCountry) {
          throw new BadRequestException(
            `Quốc gia đã đạt giới hạn ${category.maxEntriesPerCountry} entry cho hạng mục này`,
          );
        }
      }
      if (dto.athleteId) {
        await transaction.event.update({ where: { id: eventId }, data: { athletes: { connect: { id: dto.athleteId } } } });
        await transaction.category.update({ where: { id: categoryId }, data: { athletes: { connect: { id: dto.athleteId } } } });
      }
      return transaction.competitionEntry.create({
        data: {
          eventId,
          categoryId,
          countryId,
          type: dto.type,
          status: dto.status || EntryStatus.REGISTERED,
          athleteId: dto.athleteId,
          teamId: dto.teamId,
          seed: dto.seed,
          bib: dto.bib?.trim(),
          notes: dto.notes?.trim(),
        },
        include: ENTRY_INCLUDE,
      });
    });
  }

  async generateHeats(eventId: string, categoryId: string, dto: GenerateHeatsDto) {
    const [event, category, entries] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eventId }, select: { startDate: true } }),
      this.prisma.category.findFirst({
        where: { id: categoryId, events: { some: { id: eventId } } },
        select: { id: true, laneCount: true },
      }),
      this.loadEntries(eventId, categoryId, dto.entryIds),
    ]);
    if (!event || !category) throw new NotFoundException('Không tìm thấy sự kiện hoặc hạng mục');
    const laneCount = dto.laneCount || category.laneCount || 8;
    const ordered = [...entries].sort((a, b) => (a.seed || Number.MAX_SAFE_INTEGER) - (b.seed || Number.MAX_SAFE_INTEGER));
    const heatCount = Math.ceil(ordered.length / laneCount);
    const buckets: EntryRow[][] = Array.from({ length: heatCount }, () => []);
    ordered.forEach((entry, index) => {
      const block = Math.floor(index / heatCount);
      const offset = index % heatCount;
      const heatIndex = block % 2 === 0 ? offset : heatCount - 1 - offset;
      buckets[heatIndex].push(entry);
    });
    const maximum = await this.prisma.match.aggregate({ where: { eventId }, _max: { matchNumber: true } });
    let matchNumber = (maximum._max.matchNumber || 0) + 1;
    const round = dto.round || 1;
    const prefix = dto.namePrefix?.trim() || 'Heat';

    return this.prisma.$transaction(async (transaction) => {
      await transaction.category.update({ where: { id: categoryId }, data: { format: CompetitionFormat.HEAT, laneCount } });
      const generated = [];
      for (let index = 0; index < buckets.length; index += 1) {
        const members = buckets[index];
        const laneOrder = this.laneOrder(laneCount);
        const match = await transaction.match.create({
          data: {
            eventId,
            categoryId,
            matchDate: event.startDate,
            matchNumber: matchNumber++,
            matchType: MatchType.HEAT,
            status: MatchStatus.SCHEDULED,
            athlete1Id: members[0]?.athleteId,
            athlete2Id: members[1]?.athleteId,
            team1Id: members[0]?.teamId,
            team2Id: members[1]?.teamId,
            participants: {
              create: members.map((entry, memberIndex) => ({
                entryId: entry.id,
                athleteId: entry.athleteId,
                teamId: entry.teamId,
                lane: laneOrder[memberIndex],
                position: memberIndex + 1,
              })),
            },
          },
        });
        generated.push(await transaction.heat.create({
          data: {
            eventId,
            categoryId,
            matchId: match.id,
            name: `${prefix} ${index + 1}`,
            round,
            sequence: index + 1,
            lanes: {
              create: members.map((entry, memberIndex) => ({
                entryId: entry.id,
                athleteId: entry.athleteId,
                lane: laneOrder[memberIndex],
              })),
            },
          },
          include: { match: true, lanes: { include: { entry: { include: ENTRY_INCLUDE } } } },
        }));
      }
      return generated;
    });
  }

  async generateRoundRobin(eventId: string, categoryId: string, dto: GenerateRoundRobinDto) {
    const [event, category, entries] = await Promise.all([
      this.prisma.event.findUnique({ where: { id: eventId }, select: { startDate: true } }),
      this.prisma.category.findFirst({ where: { id: categoryId, events: { some: { id: eventId } } }, select: { id: true } }),
      this.loadEntries(eventId, categoryId, dto.entryIds),
    ]);
    if (!event || !category) throw new NotFoundException('Không tìm thấy sự kiện hoặc hạng mục');
    const groupCount = dto.groupCount || 1;
    if (groupCount > Math.floor(entries.length / 2)) throw new BadRequestException('Mỗi bảng vòng tròn phải có ít nhất hai lượt đăng ký');
    const ordered = [...entries].sort((a, b) => (a.seed || Number.MAX_SAFE_INTEGER) - (b.seed || Number.MAX_SAFE_INTEGER));
    const groups: EntryRow[][] = Array.from({ length: groupCount }, () => []);
    ordered.forEach((entry, index) => {
      const block = Math.floor(index / groupCount);
      const offset = index % groupCount;
      groups[block % 2 === 0 ? offset : groupCount - 1 - offset].push(entry);
    });
    const maximum = await this.prisma.match.aggregate({ where: { eventId }, _max: { matchNumber: true } });
    let matchNumber = (maximum._max.matchNumber || 0) + 1;
    const prefix = dto.namePrefix?.trim() || 'Bảng';

    return this.prisma.$transaction(async (transaction) => {
      await transaction.category.update({ where: { id: categoryId }, data: { format: CompetitionFormat.ROUND_ROBIN } });
      const generated = [];
      for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        const members = groups[groupIndex];
        const group = await transaction.roundRobinGroup.create({
          data: {
            eventId,
            categoryId,
            name: `${prefix} ${String.fromCharCode(65 + groupIndex)}`,
            members: { create: members.map((entry) => ({ entryId: entry.id, seed: entry.seed })) },
          },
        });
        const rounds = this.roundRobinRounds(members);
        for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
          for (const [first, second] of rounds[roundIndex]) {
            await transaction.match.create({
              data: {
                eventId,
                categoryId,
                roundRobinGroupId: group.id,
                matchDate: event.startDate,
                matchNumber: matchNumber++,
                matchType: MatchType.GROUP_STAGE,
                round: roundIndex + 1,
                pool: group.name,
                status: MatchStatus.SCHEDULED,
                athlete1Id: first.athleteId,
                athlete2Id: second.athleteId,
                team1Id: first.teamId,
                team2Id: second.teamId,
                participants: {
                  create: [first, second].map((entry, index) => ({
                    entryId: entry.id,
                    athleteId: entry.athleteId,
                    teamId: entry.teamId,
                    position: index + 1,
                  })),
                },
              },
            });
          }
        }
        generated.push({ groupId: group.id, name: group.name, entries: members.length, rounds: rounds.length });
      }
      return { groups: generated, matches: matchNumber - (maximum._max.matchNumber || 0) - 1 };
    });
  }

  private async loadEntries(eventId: string, categoryId: string, entryIds: string[]) {
    const entries = await this.prisma.competitionEntry.findMany({
      where: {
        id: { in: entryIds },
        eventId,
        categoryId,
        status: { in: [EntryStatus.REGISTERED, EntryStatus.VERIFIED] },
      },
      include: ENTRY_INCLUDE,
    });
    if (entries.length !== entryIds.length) throw new BadRequestException('Có lượt đăng ký không hợp lệ hoặc đã ngừng tham gia');
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    return entryIds.map((id) => byId.get(id) as EntryRow);
  }

  private assertAthleteEligibility(
    athlete: { gender: string; birthDate: Date | null; weight: number | null },
    category: { gender: string; minAge: number | null; maxAge: number | null; minWeight: number | null; maxWeight: number | null },
    referenceDate: Date,
  ) {
    if (category.gender !== 'MIXED' && athlete.gender !== category.gender) {
      throw new BadRequestException('Giới tính vận động viên không đáp ứng điều kiện hạng mục');
    }
    if ((category.minWeight !== null || category.maxWeight !== null) && athlete.weight === null) {
      throw new BadRequestException('Hạng mục này bắt buộc có cân nặng vận động viên');
    }
    if (category.minWeight !== null && athlete.weight! < category.minWeight) throw new BadRequestException('Vận động viên chưa đạt cân nặng tối thiểu');
    if (category.maxWeight !== null && athlete.weight! > category.maxWeight) throw new BadRequestException('Vận động viên vượt quá cân nặng tối đa');
    if (category.minAge !== null || category.maxAge !== null) {
      if (!athlete.birthDate) throw new BadRequestException('Hạng mục này bắt buộc có ngày sinh vận động viên');
      let age = referenceDate.getUTCFullYear() - athlete.birthDate.getUTCFullYear();
      const birthdayPassed = referenceDate.getUTCMonth() > athlete.birthDate.getUTCMonth()
        || (referenceDate.getUTCMonth() === athlete.birthDate.getUTCMonth() && referenceDate.getUTCDate() >= athlete.birthDate.getUTCDate());
      if (!birthdayPassed) age -= 1;
      if (category.minAge !== null && age < category.minAge) throw new BadRequestException('Vận động viên chưa đạt độ tuổi tối thiểu');
      if (category.maxAge !== null && age > category.maxAge) throw new BadRequestException('Vận động viên vượt quá độ tuổi tối đa');
    }
  }

  private laneOrder(laneCount: number) {
    const result: number[] = [];
    let left = Math.ceil(laneCount / 2);
    let right = left + 1;
    while (result.length < laneCount) {
      if (left >= 1) result.push(left--);
      if (right <= laneCount) result.push(right++);
    }
    return result;
  }

  private roundRobinRounds(entries: EntryRow[]) {
    const rotation: Array<EntryRow | null> = [...entries];
    if (rotation.length % 2) rotation.push(null);
    const rounds: Array<Array<[EntryRow, EntryRow]>> = [];
    for (let round = 0; round < rotation.length - 1; round += 1) {
      const pairs: Array<[EntryRow, EntryRow]> = [];
      for (let index = 0; index < rotation.length / 2; index += 1) {
        const first = rotation[index];
        const second = rotation[rotation.length - 1 - index];
        if (first && second) pairs.push(round % 2 ? [second, first] : [first, second]);
      }
      rounds.push(pairs);
      rotation.splice(1, 0, rotation.pop() || null);
    }
    return rounds;
  }
}
