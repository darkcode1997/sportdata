import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma, ResultStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchesService } from '../matches/matches.service';
import { EnterResultDto } from './dto/result-workflow.dto';

const RESULT_SELECT = {
  id: true,
  eventId: true,
  athlete1Id: true,
  athlete2Id: true,
  team1Id: true,
  team2Id: true,
  winnerId: true,
  winnerTeamId: true,
  athlete1Score: true,
  athlete2Score: true,
  athlete1Advantages: true,
  athlete2Advantages: true,
  athlete1Penalties: true,
  athlete2Penalties: true,
  winMethod: true,
  resultData: true,
  resultStatus: true,
  resultVersion: true,
  status: true,
  resultEnteredAt: true,
  refereeConfirmedAt: true,
  approvedAt: true,
  resultPublishedAt: true,
  resultLockedAt: true,
  winnerToMatchId: true,
  winnerToSide: true,
  loserToMatchId: true,
  loserToSide: true,
  participants: {
    select: { id: true, athleteId: true, teamId: true, score: true, rank: true, qualified: true },
  },
} satisfies Prisma.MatchSelect;

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matches: MatchesService,
  ) {}

  async get(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        ...RESULT_SELECT,
        resultRevisions: { orderBy: { version: 'desc' as const }, take: 50 },
      },
    });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  async enter(matchId: string, userId: string, dto: EnterResultDto) {
    return this.prisma.$transaction(async (transaction) => {
      const before = await this.loadMatch(transaction, matchId);
      this.assertExpectedVersion(before.resultVersion, dto.expectedVersion);
      if (before.resultStatus === ResultStatus.LOCKED) throw new BadRequestException('Result is locked');
      if (before.resultStatus === ResultStatus.APPROVED || before.resultStatus === ResultStatus.PUBLISHED) {
        throw new BadRequestException('Approved or published result must be reopened before editing');
      }
      if (before.resultVersion > 0 && !dto.reason?.trim()) {
        throw new BadRequestException('A reason is required when correcting an existing result');
      }

      const validAthletes = new Set([
        before.athlete1Id,
        before.athlete2Id,
        ...before.participants.map((participant) => participant.athleteId),
      ].filter(Boolean));
      const validTeams = new Set([
        before.team1Id,
        before.team2Id,
        ...before.participants.map((participant) => participant.teamId),
      ].filter(Boolean));
      if (dto.winnerId && !validAthletes.has(dto.winnerId)) {
        throw new BadRequestException('Winner athlete is not a match participant');
      }
      if (dto.winnerTeamId && !validTeams.has(dto.winnerTeamId)) {
        throw new BadRequestException('Winner team is not a match participant');
      }
      if (dto.participantResults?.length) {
        const participantIds = new Set(before.participants.map(({ id }) => id));
        if (dto.participantResults.some(({ matchParticipantId }) => !participantIds.has(matchParticipantId))) {
          throw new BadRequestException('One or more participant results do not belong to this match');
        }
      }

      for (const result of dto.participantResults || []) {
        await transaction.matchParticipant.update({
          where: { id: result.matchParticipantId },
          data: {
            score: result.score as Prisma.InputJsonValue | undefined,
            rank: result.rank,
            qualified: result.qualified,
          },
        });
      }
      const writeResult = await transaction.match.updateMany({
        where: { id: matchId, resultVersion: before.resultVersion },
        data: {
          athlete1Score: dto.athlete1Score,
          athlete2Score: dto.athlete2Score,
          athlete1Advantages: dto.athlete1Advantages,
          athlete2Advantages: dto.athlete2Advantages,
          athlete1Penalties: dto.athlete1Penalties,
          athlete2Penalties: dto.athlete2Penalties,
          winnerId: dto.winnerId || null,
          winnerTeamId: dto.winnerTeamId || null,
          winMethod: dto.winMethod,
          resultData: dto.resultData as Prisma.InputJsonValue | undefined,
          resultStatus: ResultStatus.ENTERED,
          resultVersion: { increment: 1 },
          resultEnteredAt: new Date(),
          resultEnteredBy: userId,
          status: MatchStatus.FINISHED,
          refereeConfirmedAt: null,
          refereeConfirmedBy: null,
          approvedAt: null,
          approvedBy: null,
          resultPublishedAt: null,
          resultPublishedBy: null,
          resultLockedAt: null,
          resultLockedBy: null,
        },
      });
      if (writeResult.count !== 1) this.throwConcurrentUpdate();
      const updated = await this.loadMatch(transaction, matchId);
      await this.matches.syncProgression(transaction, before as any, updated as any);
      await this.revise(transaction, before, updated, 'ENTER_RESULT', userId, dto.reason);
      return updated;
    });
  }

  confirm(matchId: string, userId: string, expectedVersion: number, reason?: string) {
    return this.transition(
      matchId,
      userId,
      ResultStatus.ENTERED,
      ResultStatus.REFEREE_CONFIRMED,
      'REFEREE_CONFIRM',
      expectedVersion,
      reason,
      { refereeConfirmedAt: new Date(), refereeConfirmedBy: userId },
    );
  }

  approve(matchId: string, userId: string, expectedVersion: number, reason?: string) {
    return this.transition(
      matchId,
      userId,
      ResultStatus.REFEREE_CONFIRMED,
      ResultStatus.APPROVED,
      'APPROVE_RESULT',
      expectedVersion,
      reason,
      { approvedAt: new Date(), approvedBy: userId },
    );
  }

  publish(matchId: string, userId: string, expectedVersion: number, reason?: string) {
    return this.transition(
      matchId,
      userId,
      ResultStatus.APPROVED,
      ResultStatus.PUBLISHED,
      'PUBLISH_RESULT',
      expectedVersion,
      reason,
      { resultPublishedAt: new Date(), resultPublishedBy: userId },
    );
  }

  lock(matchId: string, userId: string, expectedVersion: number, reason?: string) {
    return this.transition(
      matchId,
      userId,
      ResultStatus.PUBLISHED,
      ResultStatus.LOCKED,
      'LOCK_RESULT',
      expectedVersion,
      reason,
      { resultLockedAt: new Date(), resultLockedBy: userId },
    );
  }

  async reopen(matchId: string, userId: string, expectedVersion: number, reason?: string) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required to reopen a result');
    return this.prisma.$transaction(async (transaction) => {
      const before = await this.loadMatch(transaction, matchId);
      this.assertExpectedVersion(before.resultVersion, expectedVersion);
      if (!(
        before.resultStatus === ResultStatus.REFEREE_CONFIRMED
        || before.resultStatus === ResultStatus.APPROVED
        || before.resultStatus === ResultStatus.PUBLISHED
        || before.resultStatus === ResultStatus.LOCKED
      )) {
        throw new BadRequestException('Only confirmed, approved, published or locked results can be reopened');
      }
      const writeResult = await transaction.match.updateMany({
        where: { id: matchId, resultVersion: before.resultVersion },
        data: {
          resultStatus: ResultStatus.ENTERED,
          resultVersion: { increment: 1 },
          refereeConfirmedAt: null,
          refereeConfirmedBy: null,
          approvedAt: null,
          approvedBy: null,
          resultPublishedAt: null,
          resultPublishedBy: null,
          resultLockedAt: null,
          resultLockedBy: null,
        },
      });
      if (writeResult.count !== 1) this.throwConcurrentUpdate();
      const updated = await this.loadMatch(transaction, matchId);
      await this.revise(transaction, before, updated, 'REOPEN_RESULT', userId, reason);
      return updated;
    });
  }

  private async transition(
    matchId: string,
    userId: string,
    expected: ResultStatus,
    next: ResultStatus,
    action: string,
    expectedVersion: number,
    reason: string | undefined,
    data: Prisma.MatchUpdateManyMutationInput,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const before = await this.loadMatch(transaction, matchId);
      this.assertExpectedVersion(before.resultVersion, expectedVersion);
      if (before.resultStatus !== expected) {
        throw new BadRequestException(`Result must be ${expected} before ${action}`);
      }
      const writeResult = await transaction.match.updateMany({
        where: {
          id: matchId,
          resultStatus: expected,
          resultVersion: before.resultVersion,
        },
        data: { ...data, resultStatus: next, resultVersion: { increment: 1 } },
      });
      if (writeResult.count !== 1) this.throwConcurrentUpdate();
      const updated = await this.loadMatch(transaction, matchId);
      await this.revise(transaction, before, updated, action, userId, reason);
      return updated;
    });
  }

  private async loadMatch(transaction: Prisma.TransactionClient, matchId: string) {
    const match = await transaction.match.findUnique({ where: { id: matchId }, select: RESULT_SELECT });
    if (!match) throw new NotFoundException('Match not found');
    return match;
  }

  private revise(
    transaction: Prisma.TransactionClient,
    before: Record<string, any>,
    after: Record<string, any>,
    action: string,
    actorUserId: string,
    reason?: string,
  ) {
    return transaction.resultRevision.create({
      data: {
        matchId: after.id,
        version: after.resultVersion,
        status: after.resultStatus,
        action,
        before: this.snapshot(before),
        after: this.snapshot(after),
        actorUserId,
        reason: reason?.trim(),
      },
    });
  }

  private snapshot(match: Record<string, any>): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(match)) as Prisma.InputJsonValue;
  }

  private assertExpectedVersion(currentVersion: number, expectedVersion: number) {
    if (currentVersion !== expectedVersion) this.throwConcurrentUpdate();
  }

  private throwConcurrentUpdate(): never {
    throw new ConflictException(
      'Kết quả đã được người khác cập nhật. Hãy tải lại phiên bản mới trước khi thao tác.',
    );
  }
}
