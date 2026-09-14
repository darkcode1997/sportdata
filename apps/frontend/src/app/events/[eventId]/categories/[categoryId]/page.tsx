'use client';

import { useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Button, Card, Empty, Skeleton, Table, Tag, type TableProps } from 'antd';
import {
  ArrowLeft,
  Crown,
  Medal,
  RefreshCw,
  Swords,
  Trophy,
} from 'lucide-react';
import { fetcher } from '@/lib/api';
import { cn, formatTime } from '@/lib/utils';

interface Country {
  code?: string;
  name?: string;
  flagUrl?: string | null;
}

interface Federation {
  id?: string;
  name?: string;
}

interface Athlete {
  id: string;
  fullName: string;
  country?: Country | null;
  federation?: Federation | null;
}

interface Division {
  id: string;
  name: string;
  _count?: { matches?: number };
}

interface CategoryData {
  id: string;
  name: string;
  gender?: string;
  discipline?: string | null;
  uniform?: string | null;
  beltLevel?: string | null;
  matchDurationSeconds?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  minWeight?: number | null;
  maxWeight?: number | null;
  sport?: { id: string; name: string; code: string } | null;
  divisions?: Division[];
  _count?: { matches?: number };
}

interface EventData {
  id: string;
  name: string;
}

interface Standing {
  rank: number;
  athlete: Athlete;
  wins: number;
  losses: number;
  draws: number;
  totalMatches: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  winRate: number;
}

interface StandingsResponse {
  eventId: string;
  categoryId?: string | null;
  totalMatches: number;
  standings: Standing[];
}

interface MatchData {
  id: string;
  matchNumber?: number | null;
  fop?: string | null;
  matchDate: string;
  startTime?: string | null;
  athlete1?: Athlete | null;
  athlete2?: Athlete | null;
  athlete1Score: number;
  athlete2Score: number;
  athlete1Advantages?: number;
  athlete2Advantages?: number;
  athlete1Penalties?: number;
  athlete2Penalties?: number;
  winnerId?: string | null;
  status: string;
  matchType: string;
  winMethod?: string | null;
  round?: number | null;
  drawId?: string | null;
  bracketPosition?: number | null;
  winnerToMatchId?: string | null;
  winnerToSide?: 'ATHLETE1' | 'ATHLETE2' | null;
  loserToMatchId?: string | null;
  loserToSide?: 'ATHLETE1' | 'ATHLETE2' | null;
  pool?: string | null;
  notes?: string | null;
  division?: Division | null;
}

interface MatchesResponse {
  items: MatchData[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}

interface DrawData {
  id: string;
  name: string;
  type: 'ROUND_ROBIN_POOL' | 'MAIN_TREE' | 'POOL_WINNER_TREE' | 'REPECHAGE' | 'DOUBLE_ELIMINATION';
  bracketSize?: number | null;
  sortOrder: number;
  matches: MatchData[];
}

interface DrawsResponse {
  eventId: string;
  categoryId: string;
  draws: DrawData[];
}

const matchTypeLabels: Record<string, string> = {
  GROUP_STAGE: 'Vòng bảng',
  POOL: 'Vòng tính điểm',
  ROUND_OF_32: 'Vòng 32',
  ROUND_OF_16: 'Vòng 16',
  QUARTERFINAL: 'Tứ kết',
  SEMIFINAL: 'Bán kết',
  FINAL: 'Chung kết',
  ELIMINATION: 'Loại trực tiếp',
};

const winMethodLabels: Record<string, string> = {
  POINTS: 'Thắng điểm',
  SUBMISSION: 'Submission',
  IPPON: 'Ippon',
  KNOCKOUT: 'Knockout',
  DISQUALIFICATION: 'Đối thủ bị loại',
  WALKOVVER: 'Walkover',
  DECISION: 'Quyết định trọng tài',
  TECHNICAL: 'Thắng kỹ thuật',
};

const disciplineLabels: Record<string, string> = {
  NEWAZA: 'Newaza · Địa chiến',
  FIGHTING: 'Fighting',
  CONTACT: 'Contact',
  FULL_CONTACT: 'Full Contact',
  DUO: 'Duo',
  SHOW: 'Show',
};

const beltLabels: Record<string, string> = {
  WHITE: 'Đai trắng',
  BLUE: 'Đai xanh',
  PURPLE: 'Đai tím',
  BROWN: 'Đai nâu',
  BLACK: 'Đai đen',
  OPEN: 'Không giới hạn đai',
};

export default function CategoryDetailPage() {
  const params = useParams<{ eventId: string; categoryId: string }>();
  const { eventId, categoryId } = params;

  const {
    data: category,
    isLoading: categoryLoading,
    mutate: refreshCategory,
  } = useSWR<CategoryData>(categoryId ? `/categories/${categoryId}` : null, fetcher);
  const {
    data: event,
    isLoading: eventLoading,
    mutate: refreshEvent,
  } = useSWR<EventData>(eventId ? `/events/${eventId}` : null, fetcher);
  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    mutate: refreshStandings,
  } = useSWR<StandingsResponse>(
    eventId && categoryId
      ? `/statistics/events/${eventId}/standings?categoryId=${encodeURIComponent(categoryId)}`
      : null,
    fetcher,
  );
  const getMatchesKey = useCallback((pageIndex: number, previousPage: MatchesResponse | null) => {
    if (!eventId || !categoryId || (previousPage && !previousPage.meta.hasMore)) return null;
    const query = new URLSearchParams({
      eventId,
      categoryId,
      pagination: 'cursor',
      limit: '50',
    });
    if (pageIndex > 0 && previousPage?.meta.nextCursor) {
      query.set('cursor', previousPage.meta.nextCursor);
    }
    return `/matches?${query}`;
  }, [categoryId, eventId]);
  const {
    data: matchPages,
    isLoading: matchesLoading,
    isValidating: matchesValidating,
    mutate: refreshMatches,
    setSize: setMatchPageCount,
  } = useSWRInfinite<MatchesResponse>(getMatchesKey, fetcher, {
    persistSize: false,
    revalidateFirstPage: false,
  });
  const {
    data: drawsResponse,
    isLoading: drawsLoading,
    mutate: refreshDraws,
  } = useSWR<DrawsResponse>(
    eventId && categoryId
      ? `/matches/event/${encodeURIComponent(eventId)}/category/${encodeURIComponent(categoryId)}/draws`
      : null,
    fetcher,
  );

  const standings = standingsResponse?.standings || [];
  const isPointsCategory = ['DUO', 'SHOW'].includes(category?.discipline || '')
    || /\b(DUO|SHOW)\b/i.test(category?.name || '');
  const finalStandings = standings.slice(0, isPointsCategory ? 10 : 5);
  const matches = useMemo(
    () => [...(matchPages?.flatMap((page) => page.items) || [])]
      .sort((left, right) => (left.matchNumber || 0) - (right.matchNumber || 0)),
    [matchPages],
  );
  const matchesHaveMore = Boolean(matchPages?.at(-1)?.meta.hasMore);
  const draws = useMemo(
    () => [...(drawsResponse?.draws || [])].sort((left, right) => left.sortOrder - right.sortOrder),
    [drawsResponse],
  );
  const poolMatches = useMemo(() => matches.filter((match) => !match.drawId), [matches]);

  const isLoading = categoryLoading || eventLoading || standingsLoading || matchesLoading || drawsLoading;
  const mainDivision = category?.divisions?.find((division) => division.name.includes('MAIN TREE'));
  const divisionSuffix = mainDivision?.name.replace(category?.name || '', '').trim() || 'MAIN TREE POOL 1';
  const divisionLabel = `${category?.name || 'Hạng thi đấu'} - ${divisionSuffix}`;

  const refreshAll = () => {
    void Promise.all([
      refreshCategory(),
      refreshEvent(),
      refreshStandings(),
      refreshMatches(),
      refreshDraws(),
    ]);
  };

  return (
    <div className="category-page min-h-screen pb-20">
      <div className="mx-auto w-full max-w-[1900px] px-3 pt-4 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between">
          <Button
            href={`/events/${eventId}`}
            type="text"
            icon={<ArrowLeft className="h-4 w-4" />}
            className="category-back-button"
          >
            Lịch thi đấu
          </Button>
          <Button
            type="text"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={refreshAll}
            aria-label="Làm mới dữ liệu"
            className="category-back-button"
          />
        </div>

        <header className="category-hero">
          <div className="category-crest">
            <Trophy className="h-9 w-9" />
            <span>JJ</span>
          </div>
          <h1>{event?.name || 'GIẢI ĐẤU JU-JITSU'}</h1>
          <h2>{category?.name || 'Hạng thi đấu'}</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {category?.sport && <Tag color="blue">{category.sport.name}</Tag>}
            {category?.discipline && <Tag color="cyan">{disciplineLabels[category.discipline] || category.discipline}</Tag>}
            {category?.uniform && <Tag>{category.uniform === 'NO_GI' ? 'No-Gi' : 'Gi'}</Tag>}
            {category?.beltLevel && <Tag color="gold">{beltLabels[category.beltLevel] || category.beltLevel}</Tag>}
            {category?.gender && <Tag>{category.gender}</Tag>}
            {category?.maxWeight && <Tag>Đến {category.maxWeight} kg</Tag>}
            {category?.maxAge && <Tag>U{category.maxAge}</Tag>}
            {category?.matchDurationSeconds && <Tag>{Math.round(category.matchDurationSeconds / 60)} phút</Tag>}
          </div>
        </header>

        {isLoading ? (
          <CategorySkeleton />
        ) : (
          <>
            <section className="category-standings">
              <div className="category-section-title">{divisionLabel}</div>
              <div className="category-standings-label">
                <Medal className="h-4 w-4" />
                FINAL POOL STANDINGS
              </div>
              {finalStandings.length ? (
                <Card className="category-standings-card" styles={{ body: { padding: 0 } }}>
                  <StandingsTable standings={finalStandings} expanded={isPointsCategory} />
                </Card>
              ) : (
                <Empty description="Chưa có kết quả xếp hạng" />
              )}
            </section>

            <section className="category-bracket-section">
              <div className="mb-5 flex items-center gap-3">
                <div className="category-section-icon">
                  <Swords className="h-5 w-5" />
                </div>
                <div>
                  <h3>{isPointsCategory ? 'Toàn bộ biên bản trận' : 'Cây thi đấu'}</h3>
                  <p>
                    {isPointsCategory
                      ? `${matches.length} lượt chấm điểm của hạng mục`
                      : `${draws.length} cấu trúc cây · ${poolMatches.length} biên bản ngoài cây`}
                  </p>
                </div>
              </div>
              {isPointsCategory ? (
                <MatchProtocolTable matches={matches} />
              ) : draws.length ? (
                <div className="space-y-6">
                  {draws.map((draw) => <SportdataBracket key={draw.id} draw={draw} />)}
                  {poolMatches.length > 0 && (
                    <div className="category-pool-protocols">
                      <div className="category-subsection-heading">
                        <h4>Biên bản vòng bảng</h4>
                        <span>{poolMatches.length} trận không thuộc nhánh loại trực tiếp</span>
                      </div>
                      <MatchProtocolTable matches={poolMatches} />
                    </div>
                  )}
                </div>
              ) : (
                <Card className="category-empty-card">
                  <Empty description="Hạng mục chưa có cấu trúc cây thi đấu" />
                </Card>
              )}
              {matchesHaveMore && (
                <div className="mt-5 flex justify-center">
                  <Button
                    loading={matchesValidating}
                    onClick={() => setMatchPageCount((current) => current + 1)}
                  >
                    Tải thêm 50 trận
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function StandingsTable({ standings, expanded = false }: { standings: Standing[]; expanded?: boolean }) {
  const columns: TableProps<Standing>['columns'] = [
    {
      title: '#',
      dataIndex: 'rank',
      width: 72,
      align: 'center',
      render: (rank: number) => <RankBadge rank={rank} />,
    },
    {
      title: 'Vận động viên',
      key: 'athlete',
      render: (_, row) => (
        <Link href={`/athletes/${row.athlete.id}`} className="standing-athlete">
          <CountryFlag country={row.athlete.country} />
          <span>
            <strong>{row.athlete.fullName}</strong>
            <small>{row.athlete.federation?.name || row.athlete.country?.name || '—'}</small>
          </span>
        </Link>
      ),
    },
    {
      title: 'Quốc gia',
      key: 'country',
      width: 110,
      render: (_, row) => row.athlete.country?.code || '—',
    },
    {
      title: 'Trận',
      dataIndex: 'totalMatches',
      width: 82,
      align: 'center',
    },
    {
      title: 'Thắng',
      dataIndex: 'wins',
      width: 88,
      align: 'center',
      render: (value: number) => <Tag color="success">{value}</Tag>,
    },
    {
      title: 'Thua',
      dataIndex: 'losses',
      width: 80,
      align: 'center',
    },
    {
      title: 'Hiệu số',
      dataIndex: 'pointDifferential',
      width: 100,
      align: 'right',
      render: (value: number) => (
        <span className={value >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
          {value > 0 ? '+' : ''}{value}
        </span>
      ),
    },
    ...(expanded
      ? [
          {
            title: 'Điểm ghi',
            dataIndex: 'pointsFor',
            width: 100,
            align: 'right' as const,
          },
          {
            title: 'Điểm thua',
            dataIndex: 'pointsAgainst',
            width: 100,
            align: 'right' as const,
          },
        ]
      : []),
  ];

  return (
    <Table
      rowKey={(row) => row.athlete.id}
      columns={columns}
      dataSource={standings}
      pagination={false}
      scroll={{ x: 760 }}
      size="middle"
    />
  );
}

function MatchProtocolTable({
  matches,
  compact = false,
}: {
  matches: MatchData[];
  compact?: boolean;
}) {
  const pointMatches = matches.filter((match) => ['POOL', 'GROUP_STAGE'].includes(match.matchType));
  const dataSource = compact ? pointMatches.slice(0, 20) : matches;
  const columns: TableProps<MatchData>['columns'] = [
    {
      title: 'Trận',
      key: 'number',
      width: 105,
      fixed: 'left',
      render: (_, match) => (
        <div className="protocol-match-number">
          <strong>{match.matchNumber ? `#${match.matchNumber}` : '—'}</strong>
          <small>{match.fop || 'Chưa xếp sân'}</small>
        </div>
      ),
    },
    {
      title: 'Vòng đấu',
      key: 'stage',
      width: 145,
      render: (_, match) => (
        <div className="protocol-stage">
          <strong>{matchTypeLabels[match.matchType] || match.matchType.replaceAll('_', ' ')}</strong>
          <small>{match.pool || match.division?.name || '—'}</small>
        </div>
      ),
    },
    {
      title: 'Giờ',
      key: 'time',
      width: 78,
      align: 'center',
      render: (_, match) => formatTime(match.startTime || match.matchDate) || '—',
    },
    {
      title: 'Vận động viên 1',
      key: 'athlete1',
      width: 300,
      render: (_, match) => (
        <ProtocolAthlete athlete={match.athlete1} winner={match.winnerId === match.athlete1?.id} />
      ),
    },
    {
      title: 'Kết quả',
      key: 'score',
      width: 125,
      align: 'center',
      render: (_, match) => (
        <div className="protocol-result">
          <strong>
            {['FINISHED', 'RUNNING'].includes(match.status)
              ? `${match.athlete1Score} : ${match.athlete2Score}`
              : '— : —'}
          </strong>
          <small>
            {match.winMethod
              ? winMethodLabels[match.winMethod] || match.winMethod.replaceAll('_', ' ')
              : match.notes || '—'}
          </small>
        </div>
      ),
    },
    {
      title: 'Vận động viên 2',
      key: 'athlete2',
      width: 300,
      render: (_, match) => (
        <ProtocolAthlete athlete={match.athlete2} winner={match.winnerId === match.athlete2?.id} reverse />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      width: 120,
      align: 'center',
      render: (status: string) => (
        <Tag
          bordered={false}
          color={status === 'FINISHED' ? 'success' : status === 'RUNNING' ? 'error' : 'processing'}
        >
          {status === 'FINISHED' ? 'HOÀN THÀNH' : status === 'RUNNING' ? 'ĐANG ĐẤU' : 'SẮP ĐẤU'}
        </Tag>
      ),
    },
  ];

  if (!dataSource.length) {
    return (
      <Card className="category-empty-card">
        <Empty description="Chưa có biên bản trận đấu" />
      </Card>
    );
  }

  return (
    <Card className="category-protocol-card" styles={{ body: { padding: 0 } }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        pagination={compact ? false : { pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 1170 }}
        size="middle"
      />
    </Card>
  );
}

function ProtocolAthlete({
  athlete,
  winner,
  reverse = false,
}: {
  athlete?: Athlete | null;
  winner: boolean;
  reverse?: boolean;
}) {
  if (!athlete) {
    return <span className="text-slate-500">Chờ xác định</span>;
  }

  return (
    <Link
      href={`/athletes/${athlete.id}`}
      className={cn('protocol-athlete', reverse && 'is-reverse', winner && 'is-winner')}
    >
      <CountryFlag country={athlete.country} />
      <span>
        <strong>{athlete.fullName}</strong>
        <small>{athlete.federation?.name || athlete.country?.name || '—'}</small>
      </span>
      {winner && <Crown className="h-3.5 w-3.5 shrink-0" />}
    </Link>
  );
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className={cn('standing-rank', rank <= 3 && `is-rank-${rank}`)}>
      {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
    </span>
  );
}

const BRACKET_NODE_WIDTH = 390;
const BRACKET_NODE_HEIGHT = 80;
const BRACKET_SLOT_PITCH = 116;
const BRACKET_COLUMN_STEP = 470;
const BRACKET_HEADER_HEIGHT = 64;

function SportdataBracket({ draw }: { draw: DrawData }) {
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
        <span>{draw.name}</span>
        <Tag bordered={false}>{drawTypeLabel(draw.type)}</Tag>
      </div>
      <div className="sportdata-bracket-scroll">
        <div className="sportdata-bracket-board" style={{ width: boardWidth, height: boardHeight }}>
          {roundNumbers.map((round, index) => (
            <div
              className="sportdata-round-title"
              key={round}
              style={{ left: index * BRACKET_COLUMN_STEP, width: BRACKET_NODE_WIDTH }}
            >
              {draw.name} - Round {index + 1}
            </div>
          ))}
          <div
            className="sportdata-round-title is-champion"
            style={{ left: roundNumbers.length * BRACKET_COLUMN_STEP, width: BRACKET_NODE_WIDTH }}
          >
            Winner
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
            />
          )}
        </div>
      </div>
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
}: {
  match: MatchData;
  athlete?: Athlete | null;
  score?: number;
  side: 'red' | 'blue' | 'champion';
  winner: boolean;
  left: number;
  top: number;
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
          {[formatTime(match.startTime || match.matchDate), match.fop].filter(Boolean).join(' · ')}
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

  return athlete ? (
    <Link href={`/athletes/${athlete.id}`} className={className} style={style} title={match.notes || undefined}>
      {content}
    </Link>
  ) : (
    <div className={className} style={style} title={match.notes || undefined}>{content}</div>
  );
}

function drawTypeLabel(type: DrawData['type']) {
  return ({
    ROUND_ROBIN_POOL: 'Round robin',
    MAIN_TREE: 'Main tree',
    POOL_WINNER_TREE: 'Poolwinner tree',
    REPECHAGE: 'Repechage',
    DOUBLE_ELIMINATION: 'Double elimination',
  } as const)[type];
}

function CountryFlag({ country }: { country?: Country | null }) {
  if (country?.flagUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={country.flagUrl} alt={country.code || ''} className="bracket-country-flag" />
    );
  }

  return <span className="bracket-country-fallback">{country?.code?.slice(0, 2) || '—'}</span>;
}

function CategorySkeleton() {
  return (
    <div className="space-y-6">
      <Card className="category-empty-card">
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
      <Card className="category-empty-card">
        <Skeleton active paragraph={{ rows: 8 }} />
      </Card>
    </div>
  );
}
