'use client';

import { Match, MatchStatus } from '@/lib/types';
import { Card } from 'antd';
import { cn, formatTime, getStatusLabel, getStatusBgColor, getMatchTypeLabel, getWinMethodLabel } from '@/lib/utils';

interface MatchCardProps {
  match: Match;
  onClick?: () => void;
  className?: string;
}

export default function MatchCard({ match, onClick, className }: MatchCardProps) {
  const isWinner1 = match.winnerId === match.athlete1Id;
  const isWinner2 = match.winnerId === match.athlete2Id;
  const isLive = match.status === MatchStatus.RUNNING;

  return (
    <Card
      hoverable
      onClick={onClick}
      className={cn(
        'public-surface cursor-pointer',
        className
      )}
      styles={{ body: { padding: 16 } }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5',
              getStatusBgColor(match.status)
            )}
          >
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
            {getStatusLabel(match.status)}
          </span>
          <span className="text-xs text-gray-400 font-medium">
            #{match.matchNumber}
          </span>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">{formatTime(match.startTime)}</div>
          {match.fop && (
            <div className="text-xs text-gray-400">Sàn {match.fop}</div>
          )}
        </div>
      </div>

      {match.category && (
        <div className="mb-3 text-xs text-sblue font-semibold bg-sblue/10 px-2 py-1 rounded inline-block">
          {match.category.name} · {getMatchTypeLabel(match.matchType)}
        </div>
      )}

      <div className="space-y-3">
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-all',
            isWinner1 && 'border-2 border-sblue bg-sblue/10'
          )}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-gray-600">
              {match.athlete1?.country?.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.athlete1.country.flagUrl}
                  alt={match.athlete1.country.code}
                  className="w-full h-full object-cover"
                />
              ) : (
                match.athlete1?.country?.code || '?'
              )}
            </div>
            {isWinner1 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] shadow-lg">
                🏆
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate text-sm">
              {match.athlete1?.lastName?.toUpperCase()} {match.athlete1?.firstName}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {match.athlete1?.country?.code} · {match.athlete1?.federation?.name || '—'}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {match.athlete1Advantages && match.athlete1Advantages > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: match.athlete1Advantages }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-sblue"></span>
                  ))}
                </div>
              )}
              {match.athlete1Penalties && match.athlete1Penalties > 0 && (
                <div className="flex gap-0.5 ml-1">
                  {Array.from({ length: match.athlete1Penalties }).map((_, i) => (
                    <span key={i} className="text-yellow-500 text-xs">⚠️</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                'text-2xl font-black tabular-nums',
                isWinner1 ? 'text-sblue' : 'text-gray-500'
              )}
            >
              {match.athlete1Score ?? '-'}
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="h-px bg-gray-700 absolute inset-x-0"></div>
          <span className="bg-sdark px-3 text-gray-500 text-xs font-bold relative z-10">
            ĐỐI ĐẦU
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-all',
            isWinner2 && 'border-2 border-sblue bg-sblue/10'
          )}
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-gray-600">
              {match.athlete2?.country?.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.athlete2.country.flagUrl}
                  alt={match.athlete2.country.code}
                  className="w-full h-full object-cover"
                />
              ) : (
                match.athlete2?.country?.code || '?'
              )}
            </div>
            {isWinner2 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] shadow-lg">
                🏆
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate text-sm">
              {match.athlete2?.lastName?.toUpperCase()} {match.athlete2?.firstName}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {match.athlete2?.country?.code} · {match.athlete2?.federation?.name || '—'}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {match.athlete2Advantages && match.athlete2Advantages > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: match.athlete2Advantages }).map((_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-sblue"></span>
                  ))}
                </div>
              )}
              {match.athlete2Penalties && match.athlete2Penalties > 0 && (
                <div className="flex gap-0.5 ml-1">
                  {Array.from({ length: match.athlete2Penalties }).map((_, i) => (
                    <span key={i} className="text-yellow-500 text-xs">⚠️</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                'text-2xl font-black tabular-nums',
                isWinner2 ? 'text-sblue' : 'text-gray-500'
              )}
            >
              {match.athlete2Score ?? '-'}
            </div>
          </div>
        </div>
      </div>

      {match.winMethod && match.status === MatchStatus.FINISHED && (
        <div className="mt-3 pt-3 border-t border-gray-700 text-center">
          <span className="text-xs text-gray-400">
            Thắng bằng: <span className="text-white font-semibold">{getWinMethodLabel(match.winMethod)}</span>
          </span>
        </div>
      )}
    </Card>
  );
}
