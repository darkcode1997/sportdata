// Get-Content -Raw tests/integration/match-list-byes.cjs | docker compose exec -T -w /app/apps/backend backend node
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
let eventId;
const athleteIds = [];

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL).hostname, 'postgres', 'Use the local Docker database');
  const category = await prisma.category.findFirstOrThrow();
  const country = await prisma.country.findFirstOrThrow();
  const event = await prisma.event.create({ data: {
    name: `bye-list-check-${randomUUID()}`, sportId: category.sportId,
    startDate: new Date('2035-01-01'), endDate: new Date('2035-01-02'),
    categories: { connect: { id: category.id } },
  } });
  eventId = event.id;
  const draw = await prisma.draw.create({ data: { name: 'Test bracket', type: 'MAIN_TREE', eventId, categoryId: category.id } });
  for (let index = 0; index < 2; index++) {
    const athlete = await prisma.athlete.create({ data: {
      firstName: 'Test', lastName: 'Bye', fullName: `Bye-list test ${index}`,
      gender: 'MALE', countryId: country.id,
    } });
    athleteIds.push(athlete.id);
  }
  const cases = [
    { status: 'FINISHED', winMethod: 'WALKOVVER', athlete1Id: athleteIds[0] },
    { status: 'FINISHED', winMethod: 'WALKOVVER' },
    { status: 'SCHEDULED', athlete1Id: athleteIds[0] },
    { status: 'FINISHED', winMethod: 'WALKOVVER', athlete1Id: athleteIds[0], athlete2Id: athleteIds[1] },
    { status: 'FINISHED', athlete1Id: athleteIds[0] },
    { status: 'FINISHED', winMethod: 'WALKOVVER', athlete1Id: athleteIds[0], resultEnteredAt: new Date() },
  ];
  const matches = [];
  for (let index = 0; index < cases.length; index++) {
    matches.push(await prisma.match.create({ data: {
      eventId, categoryId: category.id, drawId: draw.id, matchDate: event.startDate,
      matchNumber: index + 1, notes: 'Generated test', ...cases[index],
    } }));
  }
  const query = `eventId=${eventId}&categoryId=${category.id}`;
  const get = async (suffix) => {
    const response = await fetch(`http://127.0.0.1:4000/api/matches?${query}${suffix}`);
    assert.equal(response.status, 200);
    return response.json();
  };
  assert.equal((await get('')).meta.total, 6);
  const filtered = await get('&hideByes=true');
  assert.equal(filtered.meta.total, 4);
  assert.deepEqual(new Set(filtered.items.map((match) => match.id)), new Set(matches.slice(2).map((match) => match.id)));
  const page = await get('&hideByes=true&limit=1&page=1');
  assert.equal(page.meta.totalPages, 4);
  assert.equal(page.items[0].id, matches[2].id);
  const cursor = await get('&hideByes=true&pagination=cursor&limit=1');
  assert.equal(cursor.items[0].id, matches[2].id);
  const graph = await fetch(`http://127.0.0.1:4000/api/matches/event/${eventId}/category/${category.id}/draws`).then((response) => response.json());
  assert.equal(graph.draws.find((item) => item.id === draw.id).matches.length, 6);
  console.log('PASS: automatic byes hidden, pending/real walkovers preserved, pagination correct, bracket unchanged');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (eventId) {
    await prisma.match.deleteMany({ where: { eventId } });
    await prisma.event.deleteMany({ where: { id: eventId } });
  }
  await prisma.athlete.deleteMany({ where: { id: { in: athleteIds } } });
  await prisma.$disconnect();
});
