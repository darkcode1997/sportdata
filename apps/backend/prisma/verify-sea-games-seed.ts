import { MatchStatus, MatchType, PrismaClient, SessionStatus } from '@prisma/client';

const EVENT_ID = 'event-sea-games-2026-demo';
const ATHLETE_PREFIX = 'sea26-ath-';
const EXPECTED_COUNTRIES = ['BRU', 'CAM', 'INA', 'LAO', 'MAS', 'MYA', 'PHI', 'SGP', 'THA', 'TLS', 'VIE'];

async function main() {
  const prisma = new PrismaClient();

  try {
    const event = await prisma.event.findUnique({
      where: { id: EVENT_ID },
      include: {
        categories: { select: { id: true } },
        venues: { select: { id: true } },
        fops: { select: { id: true, venueId: true } },
        sessions: {
          select: {
            id: true,
            status: true,
            _count: { select: { timeSlots: true } },
          },
        },
        scheduleRules: { select: { sportId: true } },
        _count: { select: { athletes: true, matches: true } },
      },
    });
    if (!event) throw new Error('Không tìm thấy sự kiện SEA Games mô phỏng');

    const [athletes, matches, countryGroups] = await Promise.all([
      prisma.athlete.findMany({
        where: {
          id: { startsWith: ATHLETE_PREFIX },
          events: { some: { id: EVENT_ID } },
        },
        select: {
          id: true,
          gender: true,
          weight: true,
          categories: {
            where: { id: { startsWith: 'sea26-cat-' } },
            select: {
              id: true,
              gender: true,
              minWeight: true,
              maxWeight: true,
            },
          },
        },
      }),
      prisma.match.findMany({
        where: { eventId: EVENT_ID },
        select: {
          id: true,
          fopId: true,
          matchDate: true,
          startTime: true,
          endTime: true,
          status: true,
          matchType: true,
          winnerToMatchId: true,
          sessionId: true,
          timeSlotId: true,
        },
      }),
      prisma.country.findMany({
        where: { code: { in: EXPECTED_COUNTRIES } },
        select: {
          code: true,
          _count: {
            select: {
              athletes: { where: { id: { startsWith: ATHLETE_PREFIX } } },
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
    ]);

    const invalidAthletes = athletes.filter((athlete) => {
      if (athlete.categories.length !== 1) return true;
      const category = athlete.categories[0];
      return athlete.gender !== category.gender
        || athlete.weight === null
        || (category.minWeight !== null && athlete.weight < category.minWeight)
        || (category.maxWeight !== null && athlete.weight > category.maxWeight);
    });

    const startByMatch = new Map(
      matches.map((match) => [match.id, match.startTime?.getTime() || 0]),
    );
    const resourceIntervals = new Map<string, Array<{ start: number; end: number }>>();
    let fopConflicts = 0;
    let invalidProgression = 0;
    let invalidFinalTime = 0;
    const matchesByDay = new Map<string, number>();
    const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    for (const match of matches) {
      if (!match.startTime || !match.endTime || !match.fopId) {
        throw new Error(`Trận ${match.id} thiếu thời gian hoặc sàn`);
      }
      const day = dateFormatter.format(match.matchDate);
      matchesByDay.set(day, (matchesByDay.get(day) || 0) + 1);
      const resourceKey = `${match.fopId}:${day}`;
      const intervals = resourceIntervals.get(resourceKey) || [];
      const start = match.startTime.getTime();
      const end = match.endTime.getTime();
      if (intervals.some((interval) => start < interval.end && end > interval.start)) {
        fopConflicts += 1;
      }
      intervals.push({ start, end });
      resourceIntervals.set(resourceKey, intervals);

      if (match.winnerToMatchId && startByMatch.get(match.winnerToMatchId)! <= start) {
        invalidProgression += 1;
      }
      if (match.matchType === MatchType.FINAL) {
        const [hour, minute] = timeFormatter.format(match.startTime).split(':').map(Number);
        const localMinutes = hour * 60 + minute;
        if (localMinutes < 18 * 60 || localMinutes > 21 * 60 + 30) invalidFinalTime += 1;
      }
    }

    const errors = [
      event.venues.length !== 10 ? `Số venue: ${event.venues.length}/10` : '',
      event.fops.some((fop) => !fop.venueId) ? 'Có FOP chưa gắn venue' : '',
      !event.sessions.length ? 'Chưa có session thi đấu' : '',
      event.sessions.some((session) => session.status !== SessionStatus.PUBLISHED)
        ? 'Có session chưa được công bố'
        : '',
      event.sessions.some((session) => session._count.timeSlots === 0)
        ? 'Có session chưa có time slot'
        : '',
      event.scheduleRules.length !== 10
        ? `Số quy tắc xếp lịch: ${event.scheduleRules.length}/10`
        : '',
      matches.some((match) => !match.sessionId || !match.timeSlotId)
        ? 'Có trận chưa gắn session/time slot'
        : '',
      event._count.athletes !== 5_000 ? `Số VĐV: ${event._count.athletes}/5000` : '',
      event.categories.length !== 147 ? `Số hạng cân: ${event.categories.length}/147` : '',
      event.fops.length !== 50 ? `Số sàn: ${event.fops.length}/50` : '',
      athletes.length !== 5_000 ? `Số hồ sơ seed: ${athletes.length}/5000` : '',
      invalidAthletes.length ? `${invalidAthletes.length} VĐV sai điều kiện hạng cân` : '',
      matches.some((match) => match.status !== MatchStatus.SCHEDULED)
        ? 'Có trận mới không ở trạng thái SCHEDULED'
        : '',
      fopConflicts ? `${fopConflicts} xung đột sàn` : '',
      invalidProgression ? `${invalidProgression} lỗi thứ tự vòng đấu` : '',
      invalidFinalTime ? `${invalidFinalTime} trận chung kết ngoài giờ vàng` : '',
      countryGroups.length !== EXPECTED_COUNTRIES.length
        ? `Số quốc gia: ${countryGroups.length}/${EXPECTED_COUNTRIES.length}`
        : '',
    ].filter(Boolean);

    if (errors.length) throw new Error(errors.join('; '));

    console.log(JSON.stringify({
      event: event.name,
      sports: 10,
      categories: event.categories.length,
      countries: countryGroups.map((country) => ({
        code: country.code,
        athletes: country._count.athletes,
      })),
      athletes: event._count.athletes,
      fops: event.fops.length,
      venues: event.venues.length,
      sessions: event.sessions.length,
      timeSlots: event.sessions.reduce((sum, session) => sum + session._count.timeSlots, 0),
      scheduleRules: event.scheduleRules.length,
      matches: event._count.matches,
      matchStatus: MatchStatus.SCHEDULED,
      fopConflicts,
      invalidProgression,
      invalidAthletes: invalidAthletes.length,
      matchesByDay: Object.fromEntries([...matchesByDay.entries()].sort()),
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
