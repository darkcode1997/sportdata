'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Tag, Tooltip } from 'antd';
import { ChevronDown, ChevronUp, Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { cn, formatDate, formatTime } from '@/lib/utils';

export interface BracketCountry {
  code?: string;
  name?: string;
  flagUrl?: string | null;
}

export interface BracketAthlete {
  id: string;
  fullName: string;
  country?: BracketCountry | null;
  federation?: { id?: string; name?: string } | null;
}

export interface BracketMatch {
  id: string;
  matchNumber?: number | null;
  fop?: string | null;
  matchDate: string;
  startTime?: string | null;
  athlete1?: BracketAthlete | null;
  athlete2?: BracketAthlete | null;
  athlete1Score: number;
  athlete2Score: number;
  winnerId?: string | null;
  status: string;
  round?: number | null;
  bracketPosition?: number | null;
  winnerToMatchId?: string | null;
  winnerToSide?: 'ATHLETE1' | 'ATHLETE2' | null;
  notes?: string | null;
}

export interface BracketDraw {
  id: string;
  name: string;
  type: 'ROUND_ROBIN_POOL' | 'MAIN_TREE' | 'POOL_WINNER_TREE' | 'REPECHAGE' | 'DOUBLE_ELIMINATION';
  bracketSize?: number | null;
  sortOrder: number;
  matches: BracketMatch[];
}

type SportdataBracketProps = {
  draw: BracketDraw;
  matchHref?: (match: BracketMatch, athlete?: BracketAthlete | null) => string | undefined;
};

const BRACKET_NODE_WIDTH = 390;
const BRACKET_NODE_HEIGHT = 80;
const BRACKET_SLOT_PITCH = 116;
const BRACKET_COLUMN_STEP = 470;
const BRACKET_HEADER_HEIGHT = 64;
const BRACKET_MIN_SCALE = 0.35;
const BRACKET_MAX_SCALE = 1.5;

function clampBracketScale(scale: number) {
  return Math.min(BRACKET_MAX_SCALE, Math.max(BRACKET_MIN_SCALE, scale));
}

export function SportdataBracket({ draw, matchHref }: SportdataBracketProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const matches = [...draw.matches].sort((left, right) => {
    if ((left.round || 0) !== (right.round || 0)) return (left.round || 0) - (right.round || 0);
    return (left.bracketPosition || 0) - (right.bracketPosition || 0);
  });
  const roundNumbers = Array.from(new Set(matches.map((match) => match.round || 1))).sort((a, b) => a - b);
  const roundOrdinal = new Map(roundNumbers.map((round, index) => [round, index + 1]));
  const firstRound = matches.filter((match) => (match.round || 1) === roundNumbers[0]);
  const bracketSize = Math.max(draw.bracketSize || 0, firstRound.length * 2, 2);
  const boardHeight = BRACKET_HEADER_HEIGHT + (bracketSize - 1) * BRACKET_SLOT_PITCH + BRACKET_NODE_HEIGHT + 30;
  const boardWidth = roundNumbers.length * BRACKET_COLUMN_STEP + BRACKET_NODE_WIDTH + 40;
  const matchById = new Map(matches.map((match) => [match.id, match]));
  const finalMatch = matches.find((match) => (match.round || 1) === roundNumbers.at(-1));

  const fitToContainer = useCallback(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const styles = window.getComputedStyle(scrollElement);
    const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
    const availableWidth = Math.max(scrollElement.clientWidth - horizontalPadding, 1);
    setScale(clampBracketScale(Math.min(1, availableWidth / boardWidth)));
    scrollElement.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  }, [boardWidth]);

  useEffect(() => {
    if (!autoFit || collapsed) return;

    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    fitToContainer();
    const resizeObserver = new ResizeObserver(fitToContainer);
    resizeObserver.observe(scrollElement);
    return () => resizeObserver.disconnect();
  }, [autoFit, collapsed, fitToContainer]);

  const changeScale = (difference: number) => {
    setAutoFit(false);
    setScale((currentScale) => clampBracketScale(currentScale + difference));
  };

  const enableAutoFit = () => {
    setAutoFit(true);
    requestAnimationFrame(fitToContainer);
  };

  const resetScale = () => {
    setAutoFit(false);
    setScale(1);
    scrollRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };

  const nodeTop = (ordinal: number, slotIndex: number) => {
    const roundNumber = roundNumbers[ordinal - 1];
    const matchCount = matches.filter((match) => (match.round || 1) === roundNumber).length;
    const factor = bracketSize / Math.max(matchCount * 2, 1);
    return BRACKET_HEADER_HEIGHT + (slotIndex * factor + (factor - 1) / 2) * BRACKET_SLOT_PITCH;
  };
  const championTop = BRACKET_HEADER_HEIGHT + ((bracketSize - 1) / 2) * BRACKET_SLOT_PITCH;

  const connectors = matches.map((match) => {
    const ordinal = roundOrdinal.get(match.round || 1) || 1;
    const position = match.bracketPosition || 0;
    const firstY = nodeTop(ordinal, position * 2) + BRACKET_NODE_HEIGHT / 2;
    const secondY = nodeTop(ordinal, position * 2 + 1) + BRACKET_NODE_HEIGHT / 2;
    const sourceX = (ordinal - 1) * BRACKET_COLUMN_STEP + BRACKET_NODE_WIDTH;
    const elbowX = sourceX + (BRACKET_COLUMN_STEP - BRACKET_NODE_WIDTH) / 2;
    let targetX = ordinal * BRACKET_COLUMN_STEP;
    let targetY = (firstY + secondY) / 2;

    if (match.winnerToMatchId) {
      const target = matchById.get(match.winnerToMatchId);
      if (target) {
        const targetOrdinal = roundOrdinal.get(target.round || 1) || ordinal + 1;
        const targetPosition = target.bracketPosition || 0;
        const targetSideIndex = match.winnerToSide === 'ATHLETE2' ? 1 : 0;
        targetX = (targetOrdinal - 1) * BRACKET_COLUMN_STEP;
        targetY = nodeTop(targetOrdinal, targetPosition * 2 + targetSideIndex) + BRACKET_NODE_HEIGHT / 2;
      } else if (ordinal !== roundNumbers.length) {
        return null;
      }
    } else if (ordinal !== roundNumbers.length) {
      return null;
    }

    return (
      <g key={`connector-${match.id}`}>
        <path d={`M ${sourceX} ${firstY} H ${elbowX}`} />
        <path d={`M ${sourceX} ${secondY} H ${elbowX}`} />
        <path d={`M ${elbowX} ${firstY} V ${secondY}`} />
        <path d={`M ${elbowX} ${(firstY + secondY) / 2} H ${targetX} V ${targetY}`} />
      </g>
    );
  });

  return (
    <Card className="category-bracket-card sportdata-draw" styles={{ body: { padding: 0 } }}>
      <div className="sportdata-draw-title">
        <div className="sportdata-draw-heading">
          <span>{draw.name}</span>
          <Tag bordered={false}>{drawTypeLabel(draw.type)}</Tag>
        </div>
        <div className="sportdata-draw-controls" role="toolbar" aria-label={`Điều khiển ${draw.name}`}>
          <Tooltip title="Thu nhỏ cây">
            <Button
              aria-label="Thu nhỏ cây"
              className="sportdata-draw-control"
              disabled={collapsed || scale <= BRACKET_MIN_SCALE}
              icon={<Minus className="h-4 w-4" />}
              onClick={() => changeScale(-0.1)}
              size="small"
              type="text"
            />
          </Tooltip>
          <span className="sportdata-zoom-value" aria-live="polite">{Math.round(scale * 100)}%</span>
          <Tooltip title="Phóng to cây">
            <Button
              aria-label="Phóng to cây"
              className="sportdata-draw-control"
              disabled={collapsed || scale >= BRACKET_MAX_SCALE}
              icon={<Plus className="h-4 w-4" />}
              onClick={() => changeScale(0.1)}
              size="small"
              type="text"
            />
          </Tooltip>
          <Button
            aria-label="Tự động thu cây vừa chiều rộng khung"
            className={cn('sportdata-draw-control', autoFit && 'is-active')}
            disabled={collapsed}
            icon={<Maximize2 className="h-4 w-4" />}
            onClick={enableAutoFit}
            size="small"
            type="text"
          >
            Vừa khung
          </Button>
          <Tooltip title="Đặt lại tỷ lệ 100%">
            <Button
              aria-label="Đặt lại tỷ lệ 100%"
              className="sportdata-draw-control"
              disabled={collapsed}
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={resetScale}
              size="small"
              type="text"
            />
          </Tooltip>
          <Button
            aria-label={collapsed ? 'Mở cây thi đấu' : 'Thu gọn cây thi đấu'}
            aria-expanded={!collapsed}
            className="sportdata-draw-control sportdata-collapse-control"
            icon={collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            onClick={() => setCollapsed((current) => !current)}
            size="small"
            type="text"
          >
            {collapsed ? 'Mở cây' : 'Thu gọn'}
          </Button>
        </div>
      </div>
      {!collapsed && (
        <div className="sportdata-bracket-scroll" ref={scrollRef}>
          <div className="sportdata-bracket-stage" style={{ width: boardWidth * scale, height: boardHeight * scale }}>
            <div
              className="sportdata-bracket-board"
              style={{ width: boardWidth, height: boardHeight, transform: `scale(${scale})` }}
            >
              {roundNumbers.map((round, index) => (
                <div
                  className="sportdata-round-title"
                  key={round}
                  style={{ left: index * BRACKET_COLUMN_STEP, width: BRACKET_NODE_WIDTH }}
                >
                  {draw.name} - Vòng {index + 1}
                </div>
              ))}
              <div
                className="sportdata-round-title is-champion"
                style={{ left: roundNumbers.length * BRACKET_COLUMN_STEP, width: BRACKET_NODE_WIDTH }}
              >
                Vô địch
              </div>
              <svg
                aria-hidden="true"
                className="sportdata-bracket-lines"
                width={boardWidth}
                height={boardHeight}
                viewBox={`0 0 ${boardWidth} ${boardHeight}`}
              >
                {connectors}
              </svg>
              {matches.flatMap((match) => {
                const ordinal = roundOrdinal.get(match.round || 1) || 1;
                const position = match.bracketPosition || 0;
                const left = (ordinal - 1) * BRACKET_COLUMN_STEP;
                return [
                  <BracketParticipantNode
                    key={`${match.id}-athlete1`}
                    match={match}
                    athlete={match.athlete1}
                    score={match.athlete1Score}
                    side="red"
                    winner={match.winnerId === match.athlete1?.id}
                    left={left}
                    top={nodeTop(ordinal, position * 2)}
                    matchHref={matchHref}
                  />,
                  <BracketParticipantNode
                    key={`${match.id}-athlete2`}
                    match={match}
                    athlete={match.athlete2}
                    score={match.athlete2Score}
                    side="blue"
                    winner={match.winnerId === match.athlete2?.id}
                    left={left}
                    top={nodeTop(ordinal, position * 2 + 1)}
                    matchHref={matchHref}
                  />,
                ];
              })}
              {finalMatch && (
                <BracketParticipantNode
                  match={finalMatch}
                  athlete={finalMatch.winnerId === finalMatch.athlete1?.id ? finalMatch.athlete1 : finalMatch.athlete2}
                  side="champion"
                  winner
                  left={roundNumbers.length * BRACKET_COLUMN_STEP}
                  top={championTop}
                  matchHref={matchHref}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function BracketParticipantNode({
  match,
  athlete,
  score,
  side,
  winner,
  left,
  top,
  matchHref,
}: {
  match: BracketMatch;
  athlete?: BracketAthlete | null;
  score?: number;
  side: 'red' | 'blue' | 'champion';
  winner: boolean;
  left: number;
  top: number;
  matchHref?: SportdataBracketProps['matchHref'];
}) {
  const content = (
    <>
      <div className="sportdata-node-country">
        <CountryFlag country={athlete?.country} />
        <span>{athlete?.country?.code || '—'}</span>
      </div>
      {side !== 'champion' && (
        <span className="sportdata-node-score">
          {athlete && ['FINISHED', 'RUNNING'].includes(match.status) ? score ?? 0 : '—'}
        </span>
      )}
      <strong>{athlete?.fullName || 'CHỜ XÁC ĐỊNH'}</strong>
      <small>{athlete?.federation?.name || athlete?.country?.name || '—'}</small>
      {side !== 'champion' && (
        <span className="sportdata-node-match">
          {match.matchNumber ? `#${match.matchNumber}` : ''}
          {[
            `${formatDate(match.startTime || match.matchDate, 'dd/MM')} ${formatTime(match.startTime || match.matchDate)}`,
            match.fop,
          ].filter(Boolean).join(' · ')}
        </span>
      )}
    </>
  );
  const className = cn(
    'sportdata-bracket-node',
    `is-${side}`,
    winner && 'is-winner',
    !athlete && 'is-empty',
  );
  const style = { left, top, width: BRACKET_NODE_WIDTH, height: BRACKET_NODE_HEIGHT };
  const href = matchHref
    ? matchHref(match, athlete)
    : athlete
      ? `/athletes/${athlete.id}`
      : undefined;

  return href ? (
    <Link href={href} className={className} style={style} title={match.notes || undefined}>{content}</Link>
  ) : (
    <div className={className} style={style} title={match.notes || undefined}>{content}</div>
  );
}

function drawTypeLabel(type: BracketDraw['type']) {
  return ({
    ROUND_ROBIN_POOL: 'Vòng tròn',
    MAIN_TREE: 'Main tree',
    POOL_WINNER_TREE: 'Poolwinner tree',
    REPECHAGE: 'Repechage',
    DOUBLE_ELIMINATION: 'Loại kép',
  } as const)[type];
}

function CountryFlag({ country }: { country?: BracketCountry | null }) {
  if (country?.flagUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={country.flagUrl} alt={country.code || ''} className="bracket-country-flag" />
    );
  }

  return <span className="bracket-country-fallback">{country?.code?.slice(0, 2) || '—'}</span>;
}
