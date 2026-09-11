'use client';

import Link from 'next/link';
import { Card, Tag } from 'antd';
import { AlertTriangle, ChevronRight, Clock3, UserRound } from 'lucide-react';
import { cn, formatTime } from '@/lib/utils';

interface Athlete {
  id: string;
  fullName: string;
  photoUrl?: string | null;
  country?: { code?: string; name?: string; flagUrl?: string | null } | null;
  federation?: { id?: string; name?: string } | null;
}

interface MatchCardProps {
  id: string;
  eventId?: string;
  categoryId?: string;
  categoryName?: string;
  matchNumber?: number | null;
  fop?: string | null;
  matchDate: string;
  startTime?: string | null;
  athlete1?: Athlete | null;
  athlete2?: Athlete | null;
  athlete1Score?: number;
  athlete2Score?: number;
  athlete1Advantages?: number;
  athlete2Advantages?: number;
  athlete1Penalties?: number;
  athlete2Penalties?: number;
  status: 'SCHEDULED' | 'RUNNING' | 'FINISHED' | 'CANCELLED';
  matchType?: string;
  winnerId?: string | null;
  winMethod?: string | null;
  notes?: string | null;
  pool?: string | null;
  round?: number | null;
}

const statusLabel = {
  SCHEDULED: 'SCHEDULED',
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
  CANCELLED: 'CANCELLED',
} as const;

const stageLabel: Record<string, string> = {
  GROUP_STAGE: 'GROUP PHASE',
  QUARTERFINAL: 'QUARTER-FINAL',
  SEMIFINAL: 'SEMI-FINAL',
  ROUND_OF_16: 'ROUND OF 16',
  ROUND_OF_32: 'ROUND OF 32',
  ELIMINATION: 'ELIMINATION',
  FINAL: 'FINAL',
  POOL: '',
};

const methodLabel: Record<string, string> = {
  POINTS: 'Win by Points',
  SUBMISSION: 'Win by Submission',
  IPPON: 'Win by Ippon',
  KNOCKOUT: 'Win by Knockout',
  DISQUALIFICATION: 'Win by Disqualification',
  WALKOVVER: 'Win by Walkover',
  DECISION: 'Win by Decision',
  TECHNICAL: 'Technical win',
};

export function MatchCard({
  id,
  eventId,
  categoryId,
  categoryName,
  matchNumber,
  fop,
  startTime,
  athlete1,
  athlete2,
  athlete1Score = 0,
  athlete2Score = 0,
  athlete1Advantages = 0,
  athlete2Advantages = 0,
  athlete1Penalties = 0,
  athlete2Penalties = 0,
  status,
  matchType,
  winnerId,
  winMethod,
  notes,
}: MatchCardProps) {
  const isRunning = status === 'RUNNING';
  const showScore = status === 'FINISHED' || isRunning;
  const winner1 = Boolean(winnerId && winnerId === athlete1?.id);
  const winner2 = Boolean(winnerId && winnerId === athlete2?.id);
  const stage = stageLabel[matchType || ''] ?? (matchType || '').replaceAll('_', ' ');

  return (
    <Card
      id={`match-${id}`}
      data-live-match={isRunning ? 'true' : undefined}
      tabIndex={isRunning ? -1 : undefined}
      className={cn('schedule-match-card', isRunning && 'schedule-match-card-live')}
      styles={{ body: { padding: 0 } }}
    >
      <div className="relative px-4 pb-4 pt-[4.15rem] sm:px-5 sm:pb-5 sm:pt-[3.05rem]">
        <div className="match-category-heading">
          <div className="flex items-start gap-1.5 text-sky-400">
            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 stroke-[3]" />
            {eventId && categoryId ? (
              <Link
                href={`/events/${eventId}/categories/${categoryId}`}
                className="match-category-link"
              >
                {categoryName || 'MATCH'}
              </Link>
            ) : (
              <span className="match-category-link">{categoryName || 'MATCH'}</span>
            )}
          </div>
          {stage && <div className="match-stage-label">{stage}</div>}
        </div>

        <div className="absolute right-4 top-3 flex items-center gap-2 sm:right-5">
          {matchNumber != null && <span className="match-number-chip">#{matchNumber}</span>}
          {fop && <span className="fop-chip">{fop}</span>}
        </div>

        <div className="match-card-grid">
          <div className="match-time-status min-w-0">
            <div className="text-[0.82rem] font-black tabular-nums text-slate-100">
              {formatTime(startTime)}
            </div>
            <Tag className={cn('match-status-tag mt-1.5', `is-${status.toLowerCase()}`)} bordered={false}>
              {statusLabel[status]}
            </Tag>
          </div>

          <AthleteSlot
            athlete={athlete1}
            winner={winner1}
            advantages={athlete1Advantages}
            penalties={athlete1Penalties}
          />

          <div className="flex min-w-[7rem] flex-col items-center justify-center text-center">
            <div className="flex items-center gap-1 text-[0.68rem] font-black text-amber-400">
              <Clock3 className="h-3.5 w-3.5" />
              <span>{notes || '-'}</span>
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[1.85rem] font-black leading-none tracking-tight text-slate-100 tabular-nums">
              {showScore ? `${athlete1Score} : ${athlete2Score}` : '— : —'}
            </div>
            <div className="mt-1 min-h-4 text-[0.62rem] font-semibold text-slate-400">
              {winMethod ? methodLabel[winMethod] || winMethod.replaceAll('_', ' ') : '-'}
            </div>
          </div>

          <AthleteSlot
            athlete={athlete2}
            winner={winner2}
            advantages={athlete2Advantages}
            penalties={athlete2Penalties}
            reverse
          />
        </div>
      </div>
    </Card>
  );
}

function AthleteSlot({
  athlete,
  winner,
  advantages,
  penalties,
  reverse = false,
}: {
  athlete?: Athlete | null;
  winner: boolean;
  advantages: number;
  penalties: number;
  reverse?: boolean;
}) {
  if (!athlete) {
    return (
      <div className="match-athlete match-athlete-empty" aria-label="Chưa xác định vận động viên">
        <UserRound className="h-5 w-5" />
        <span>Chờ xác định</span>
      </div>
    );
  }

  const code = athlete.country?.code || '';
  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className={cn('match-athlete', winner && 'is-winner', reverse && 'is-reverse')}
    >
      <div className="country-mark">
        {athlete.country?.flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={athlete.country.flagUrl} alt={code} className="country-flag" />
        ) : (
          <span className="country-flag country-fallback">{code.slice(0, 2)}</span>
        )}
        <span>{code}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.82rem] font-black text-slate-100">{athlete.fullName}</div>
        <div className="mt-0.5 truncate text-[0.55rem] font-bold uppercase text-slate-400">
          {athlete.federation?.name || athlete.country?.name || 'Independent athlete'}
        </div>
        {(advantages > 0 || penalties > 0) && (
          <div className={cn('mt-1.5 flex flex-wrap gap-1', reverse && 'justify-end')}>
            {advantages > 0 && (
              <span className="score-detail-chip"><AlertTriangle className="h-2.5 w-2.5" /> Advantages:{advantages}</span>
            )}
            {penalties > 0 && (
              <span className="score-detail-chip"><AlertTriangle className="h-2.5 w-2.5" /> Penalties:{penalties}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
