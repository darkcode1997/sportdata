// Runs against isolated fixtures in the configured development database and removes them afterwards.
// Build first: npm run build:backend && node apps/backend/scripts/smoke-scoreboard.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
require('dotenv').config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });
if (process.env.NODE_ENV === 'production') throw new Error('Run this smoke test against a development database.');
require('reflect-metadata');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { AppModule } = require('../dist/src/app.module.js');
const { SchedulingService } = require('../dist/src/scheduling/scheduling.service.js');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const app = await NestFactory.create(AppModule, { logger: ['error'] });
app.setGlobalPrefix('api');
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
await app.listen(0, '127.0.0.1');
const base = `${await app.getUrl()}/api`;
const db = app.get(PrismaService);
const jwt = app.get(JwtService);
const suffix = randomUUID().slice(0, 8);
const athleteIds = [], userIds = [];
let event, sport, category;
let checks = 0;
async function request(path, token, body, expected = 200) {
  const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  checks++;
  return data;
}
const boardPath = (id) => `/results/matches/${id}/scoreboard`;
const scoreboardClientId = `smoke-client-${suffix}-000000000000`;
try {
  const country = await db.country.findFirst();
  assert.ok(country, 'Seed at least one country first');
  sport = await db.sport.create({ data: { name: `Scoreboard smoke ${suffix}`, code: `SB${suffix}` } });
  category = await db.category.create({ data: { sportId: sport.id, name: 'Scoreboard smoke category', gender: 'MALE', matchDurationSeconds: 60 } });
  event = await db.event.create({ data: { name: `Scoreboard smoke ${suffix}`, sportId: sport.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 86400000), categories: { connect: { id: category.id } }, sports: { connect: { id: sport.id } } } });
  await db.sportSchedulingRule.create({ data: { eventId: event.id, sportId: sport.id, minRestMinutes: 0 } });
  const fop = await db.fop.create({ data: { eventId: event.id, name: 'Smoke FOP' } });
  for (let i = 0; i < 4; i++) {
    const athlete = await db.athlete.create({ data: { firstName: `Player ${i}`, lastName: 'Smoke', fullName: `Smoke Player ${i}`, countryId: country.id, gender: 'MALE' } });
    athleteIds.push(athlete.id);
  }
  const tokens = {};
  for (const role of ['SPORT_MANAGER', 'SCOREKEEPER', 'READ_ONLY']) {
    const user = await db.user.create({ data: { name: 'Scoreboard smoke', email: `${role}-${suffix}@example.test`, password: randomUUID(), role } });
    userIds.push(user.id);
    tokens[role] = jwt.sign({ sub: user.id });
  }
  const makeMatch = (number, extra = {}) => db.match.create({ data: { eventId: event.id, categoryId: category.id, matchNumber: number, matchDate: new Date(), fopId: fop.id, fop: fop.name, startTime: new Date(Date.now() - (5 - number) * 3600000), endTime: new Date(Date.now() - (5 - number) * 3600000 + 600000), ...extra } });
  const final = await makeMatch(3);
  const bronze = await makeMatch(4, { fopId: null, startTime: null, endTime: null });
  const first = await makeMatch(1, { athlete1Id: athleteIds[0], athlete2Id: athleteIds[1], winnerToMatchId: final.id, winnerToSide: 'ATHLETE1', loserToMatchId: bronze.id, loserToSide: 'ATHLETE1' });
  const second = await makeMatch(2, { athlete1Id: athleteIds[2], athlete2Id: athleteIds[3], winnerToMatchId: final.id, winnerToSide: 'ATHLETE2', loserToMatchId: bronze.id, loserToSide: 'ATHLETE2' });
  const manager = tokens.SPORT_MANAGER, scorer = tokens.SCOREKEEPER;
  await request(boardPath(first.id), undefined, undefined, 401);
  await request(boardPath(first.id), tokens.READ_ONLY, undefined, 403);
  await request(boardPath(first.id), tokens.READ_ONLY, { action: 'START', expectedVersion: 0 }, 403);
  await request(`/events/${event.id}/admin-detail`, scorer);
  const leasedMatches = new Set();
  const cmd = async (id, action, version, extra = {}, expected = 201, token = manager) => {
    if (!leasedMatches.has(id)) {
      await request(`${boardPath(id)}/claim`, token, { clientId: scoreboardClientId }, 201);
      leasedMatches.add(id);
    }
    return request(boardPath(id), token, { action, expectedVersion: version, clientId: scoreboardClientId, ...extra }, expected);
  };
  await cmd(final.id, 'START', 0, {}, 400);
  const unscheduled = await makeMatch(8, { athlete1Id: athleteIds[0], athlete2Id: athleteIds[1], fopId: null, startTime: null, endTime: null });
  await cmd(unscheduled.id, 'START', 0, {}, 400);
  const future = await makeMatch(9, { athlete1Id: athleteIds[0], athlete2Id: athleteIds[1] });
  await cmd(future.id, 'START', 0, {}, 400);
  let a = await cmd(first.id, 'START', 0);
  assert.equal(a.status, 'RUNNING');
  await request(`${boardPath(first.id)}/claim`, scorer, { clientId: `other-scorekeeper-${suffix}-00000` }, 409);
  const schedule = await app.get(SchedulingService).autoSchedule(event.id, { onlyUnscheduled: false, dryRun: true });
  assert.equal(schedule.requested, await db.match.count({ where: { eventId: event.id, status: 'SCHEDULED' } }));
  assert.ok(a.resultData.scoreboard.runningSince);
  await cmd(first.id, 'FINISH', a.resultVersion, { winnerId: athleteIds[0], winMethod: 'POINTS' }, 400);
  await cmd(second.id, 'START', 0, {}, 409);
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 3, award: 'POINTS', points: 2 }, 400);
  const concurrent = await Promise.all([2, 3].map((points) => fetch(base + boardPath(first.id), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${manager}` }, body: JSON.stringify({ action: 'AWARD', expectedVersion: a.resultVersion, clientId: scoreboardClientId, side: 1, award: 'POINTS', points }) })));
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 409]); checks++;
  a = await request(boardPath(first.id), manager);
  assert.ok([2, 3].includes(a.athlete1Score));
  a = await cmd(first.id, 'UNDO', a.resultVersion);
  assert.equal(a.athlete1Score, 0);
  a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'POINTS', points: 4 });
  // Staged penalties award the opponent and must remain sequential.
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'PENALTY', penaltyLevel: 2 }, 400);
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'POINTS', points: 2, penaltyLevel: 1 }, 400);
  for (let level = 1; level <= 4; level++) {
    a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'PENALTY', penaltyLevel: level });
    assert.equal(a.athlete1Penalties, level);
    assert.equal(a.athlete1Score, 4);
    assert.equal(a.athlete2Advantages, level >= 2 ? 1 : 0);
    assert.equal(a.athlete2Score, level >= 3 ? 2 : 0);
    assert.equal(a.resultData.scoreboard.actions.at(-1).penaltyLevel, level);
  }
  assert.equal(a.proposedWinnerId, athleteIds[1]);
  assert.equal(a.proposedWinMethod, 'DISQUALIFICATION');
  assert.equal(a.resultData.scoreboard.runningSince, null);
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'PENALTY', penaltyLevel: 4 }, 400);
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'PENALTY', penaltyLevel: 5 }, 400);
  const penaltyReload = await request(boardPath(first.id), scorer);
  assert.equal(penaltyReload.athlete1Penalties, 4);
  assert.equal(penaltyReload.athlete2Advantages, 1);
  assert.equal(penaltyReload.athlete2Score, 2);
  a = await cmd(first.id, 'UNDO', a.resultVersion);
  assert.equal(a.athlete1Penalties, 3);
  assert.equal(a.resultData.scoreboard.actions.at(-1).undone, true);
  a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'PENALTY', penaltyLevel: 4 });
  // Undo all penalties before exercising other scoring and submission actions.
  for (let level = 3; level >= 0; level--) {
    a = await cmd(first.id, 'UNDO', a.resultVersion);
    assert.equal(a.athlete1Penalties, level);
    assert.equal(a.athlete2Advantages, level >= 2 ? 1 : 0);
    assert.equal(a.athlete2Score, level >= 3 ? 2 : 0);
  }
  a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 2, award: 'PENALTY', penaltyLevel: 1 });
  assert.equal(a.athlete1Penalties, 0);
  assert.equal(a.athlete2Penalties, 1);
  a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'ADVANTAGE' });
  a = await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'SUBMISSION' });
  a = await cmd(first.id, 'PAUSE', a.resultVersion);
  assert.ok(a.resultData.scoreboard.remainingMs < 60000);
  assert.equal(a.resultData.scoreboard.runningSince, null);
  const reloaded = await request(boardPath(first.id), scorer);
  assert.equal(reloaded.resultData.scoreboard.remainingMs, a.resultData.scoreboard.remainingMs);
  await cmd(first.id, 'RESUME', a.resultVersion, {}, 400);
  await cmd(first.id, 'FINISH', a.resultVersion, { winnerId: athleteIds[2], winMethod: 'POINTS' }, 400);
  await db.match.update({ where: { id: final.id }, data: { athlete1Id: athleteIds[3] } });
  await cmd(first.id, 'FINISH', a.resultVersion, { winnerId: athleteIds[0], winMethod: 'SUBMISSION' }, 409);
  assert.equal((await db.match.findUnique({ where: { id: first.id } })).status, 'RUNNING');
  await db.match.update({ where: { id: final.id }, data: { athlete1Id: null } });
  a = await cmd(first.id, 'FINISH', a.resultVersion, { winnerId: athleteIds[0], winMethod: 'SUBMISSION' });
  assert.equal(a.status, 'FINISHED'); assert.equal(a.resultStatus, 'REFEREE_CONFIRMED');
  const target = await db.match.findUnique({ where: { id: final.id } });
  assert.equal(target.athlete1Id, athleteIds[0]); assert.equal(target.athlete2Id, null); assert.equal(target.status, 'SCHEDULED');
  assert.equal((await db.match.findUnique({ where: { id: bronze.id } })).athlete1Id, athleteIds[1]);
  await cmd(first.id, 'AWARD', a.resultVersion, { side: 1, award: 'POINTS', points: 1 }, 400);
  await cmd(final.id, 'START', 0, {}, 400);
  let b = await cmd(second.id, 'START', 0, {}, 201, scorer);
  b = await cmd(second.id, 'PAUSE', b.resultVersion, {}, 201, scorer);
  b = await cmd(second.id, 'FINISH', b.resultVersion, { winnerId: athleteIds[2], winMethod: 'DECISION' }, 201, scorer);
  assert.equal(b.resultStatus, 'ENTERED'); assert.equal(b.refereeConfirmedAt, null);
  await request(`/results/matches/${second.id}/referee-confirm`, scorer, { expectedVersion: b.resultVersion }, 403);
  assert.equal((await db.match.findUnique({ where: { id: final.id } })).athlete2Id, athleteIds[2]);
  await db.sportSchedulingRule.update({ where: { eventId_sportId: { eventId: event.id, sportId: sport.id } }, data: { minRestMinutes: 60 } });
  await cmd(final.id, 'START', 0, {}, 409);
  await db.sportSchedulingRule.update({ where: { eventId_sportId: { eventId: event.id, sportId: sport.id } }, data: { minRestMinutes: 0 } });
  let c = await cmd(final.id, 'START', 0);
  assert.equal(c.status, 'RUNNING');
  // Correcting a feeder cannot replace an athlete after the destination starts.
  await request(`/results/matches/${first.id}/enter`, manager, { expectedVersion: a.resultVersion, winnerId: athleteIds[1], reason: 'Smoke correction must roll back' }, 409);
  assert.equal((await db.match.findUnique({ where: { id: first.id } })).winnerId, athleteIds[0]);
  const revisions = await db.resultRevision.count({ where: { matchId: first.id } });
  assert.equal(revisions, a.resultVersion);
  // Expiry persists a zero clock and cannot resume or automatically finish.
  await db.match.update({ where: { id: final.id }, data: { resultData: { scoreboard: { remainingMs: 10, runningSince: new Date(Date.now() - 1000).toISOString(), actions: [] } } } });
  c = await cmd(final.id, 'PAUSE', c.resultVersion);
  assert.equal(c.resultData.scoreboard.remainingMs, 0); assert.equal(c.status, 'RUNNING');
  await cmd(final.id, 'RESUME', c.resultVersion, {}, 400);
  console.log(`PASS: ${checks} API checks; clock, scoring/undo, permissions, concurrency, rest, bracket advancement and rollback verified.`);
} finally {
  if (event) {
    await db.match.deleteMany({ where: { eventId: event.id } });
    await db.event.delete({ where: { id: event.id } });
  }
  await db.athlete.deleteMany({ where: { id: { in: athleteIds } } });
  if (category) await db.category.delete({ where: { id: category.id } });
  if (sport) await db.sport.delete({ where: { id: sport.id } });
  await db.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await app.close();
}
