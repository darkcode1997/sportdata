// Build first: npm run build:backend
// Exercises real NestJS HTTP routes/interceptors using in-memory fixtures only.
// This test never connects to PostgreSQL or changes the database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

const require = createRequire(new URL('../package.json', import.meta.url));
require('reflect-metadata');
const { NestFactory, APP_INTERCEPTOR } = require('@nestjs/core');
const { Module, ConflictException } = require('@nestjs/common');
const { configureApplication } = require('./dist/src/create-application.js');
const { MatchesController } = require('./dist/src/matches/matches.controller.js');
const { MatchesService } = require('./dist/src/matches/matches.service.js');
const { ResultsController } = require('./dist/src/results/results.controller.js');
const { ResultsService } = require('./dist/src/results/results.service.js');
const { ScoreboardService } = require('./dist/src/results/scoreboard.service.js');
const { SchedulingController } = require('./dist/src/scheduling/scheduling.controller.js');
const { SchedulingService } = require('./dist/src/scheduling/scheduling.service.js');
const { PublicEventStreamService } = require('./dist/src/matches/public-event-stream.service.js');
const { PublicEventStreamInterceptor } = require('./dist/src/matches/public-event-stream.interceptor.js');
const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { JwtAuthGuard } = require('./dist/src/auth/jwt-auth.guard.js');
// Authentication/transactions are outside this smoke test: isolate the real
// controllers and notification interceptor from account/database dependencies.
JwtAuthGuard.prototype.canActivate = function (context) {
  context.switchToHttp().getRequest().user = { id: 'smoke-user' };
  return true;
};
const eventId = 'sse-smoke-event';
const otherEventId = 'sse-smoke-other';
const records = new Map();
const streams = [];
let matchReads = 0;
let app;
let releaseWrite;
let writesBlocked = false;
let serial = 0;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(condition, label, timeout = 5000) {
  const started = performance.now();
  while (!condition()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out: ${label}`);
    await pause(25);
  }
}
async function request(path, method = 'POST', body = {}, expected = 201) {
  const response = await fetch(`${await app.getUrl()}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert.equal(response.status, expected);
  return response.status === 204 ? undefined : response.json();
}
async function openStream(id = eventId) {
  const controller = new AbortController();
  const response = await fetch(`${await app.getUrl()}/api/matches/event/${id}/stream`, {
    signal: controller.signal, headers: { 'Accept-Encoding': 'gzip, br' },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
  assert.equal(response.headers.get('x-accel-buffering'), 'no');
  assert.equal(response.headers.get('content-encoding'), null);
  const state = { controller, events: [], done: undefined };
  streams.push(state);
  state.done = (async () => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const type = frame.match(/^event: (.+)$/m)?.[1];
          const data = frame.match(/^data: (.+)$/m)?.[1];
          if (type && data) state.events.push({ type, data, at: performance.now() });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) throw error;
    } finally {
      reader.releaseLock();
    }
  })();
  return state;
}
const changes = (stream) => stream.events.filter((event) => event.type === 'schedule-changed');

class SmokeModule {}
Module({
  controllers: [MatchesController, ResultsController, SchedulingController],
  providers: [
    PublicEventStreamService,
    { provide: APP_INTERCEPTOR, useClass: PublicEventStreamInterceptor },
    { provide: PrismaService, useValue: {
      event: { findUnique: async ({ where }) => [eventId, otherEventId].includes(where.id) ? { id: where.id } : null },
      match: { findUnique: async ({ where }) => {
        matchReads++;
        return records.get(where.id) || null;
      } },
    } },
    { provide: MatchesService, useValue: {
      create: async (dto) => {
        if (dto.notes === 'fail') throw new ConflictException('Simulated failed transaction');
        const row = { ...dto, id: `match-${++serial}` };
        records.set(row.id, row);
        return row;
      },
      update: async (id, dto) => {
        if (writesBlocked) await new Promise((resolve) => { releaseWrite = resolve; });
        const row = { ...records.get(id), ...dto };
        records.set(id, row);
        return row;
      },
      remove: async (id) => {
        const row = records.get(id);
        records.delete(id);
        return row;
      },
      distributeEventMatchDates: async (id) => ({ eventId: id }),
    } },
    { provide: ResultsService, useValue: {
      publish: async (id) => ({ ...records.get(id), resultStatus: 'PUBLISHED' }),
    } },
    { provide: ScoreboardService, useValue: {
      command: async (id) => records.get(id),
      claim: async () => ({ owned: true }),
      heartbeat: async () => ({ owned: true }),
      release: async () => ({ released: true }),
    } },
    { provide: SchedulingService, useValue: {
      autoSchedule: async (id, dto) => ({ eventId: id, dryRun: dto.dryRun !== false }),
    } },
  ],
})(SmokeModule);

try {
  process.env.RATE_LIMIT_REQUESTS = '10000';
  app = await NestFactory.create(SmokeModule, { logger: ['error'] });
  await configureApplication(app);
  await app.listen(0, '127.0.0.1');
  const viewers = await Promise.all(Array.from({ length: 100 }, () => openStream()));
  const otherViewer = await openStream(otherEventId);
  await until(() => [...viewers, otherViewer].every((stream) => stream.events.some((event) => event.type === 'ready')), 'all viewers ready')
    .catch((error) => { throw new Error(`${error.message}; first viewer events: ${JSON.stringify(viewers[0].events)}`); });
  assert.equal(app.get(PublicEventStreamService).channels.get(eventId).subscribers, 100);

  const createdAt = performance.now();
  const matches = await Promise.all(Array.from({ length: 10 }, () => request('/matches', 'POST', {
    eventId, categoryId: 'smoke-category', matchDate: new Date().toISOString(),
  })));
  const matchId = matches[0].id;
  await until(() => viewers.every((stream) => changes(stream).length === 1), 'one coalesced update for successful creates');
  assert.equal(changes(otherViewer).length, 0);
  assert.deepEqual(JSON.parse(changes(viewers[0])[0].data), { eventId });
  const latencies = viewers.map((stream) => changes(stream)[0].at - createdAt).sort((a, b) => a - b);

  await request('/matches', 'POST', { eventId, categoryId: 'smoke-category', matchDate: new Date().toISOString(), notes: 'fail' }, 409);
  const board = `/results/matches/${matchId}/scoreboard`;
  const command = { clientId: 'sse-smoke-client-0000000000', expectedVersion: 0 };
  for (const action of ['AWARD', 'UNDO', 'PAUSE', 'RESUME']) await request(board, 'POST', { ...command, action });
  for (const action of ['claim', 'heartbeat', 'release']) await request(`${board}/${action}`, 'POST', { clientId: command.clientId });
  await request(`/scheduling/events/${eventId}/auto-schedule`, 'POST', { dryRun: true });
  await request(`/scheduling/events/${eventId}/auto-schedule`, 'POST', {});
  await pause(1300);
  assert.ok(viewers.every((stream) => changes(stream).length === 1), 'Failures, private scoring, leases and dry-run must not refresh viewers');

  writesBlocked = true;
  const pendingWrite = request(`/matches/${matchId}`, 'PATCH', { notes: 'new schedule' }, 200);
  await until(() => Boolean(releaseWrite), 'write is in progress');
  await pause(1200);
  assert.ok(viewers.every((stream) => changes(stream).length === 1), 'No notification before the service resolves its write');
  writesBlocked = false;
  releaseWrite();
  await pendingWrite;
  await until(() => viewers.every((stream) => changes(stream).length === 2), 'schedule update after save');
  for (const [index, action] of ['START', 'FINISH'].entries()) {
    await request(board, 'POST', { ...command, action });
    await until(() => viewers.every((stream) => changes(stream).length === 3 + index), action);
  }
  await request(`/results/matches/${matchId}/publish`, 'POST', { expectedVersion: 0 });
  await until(() => viewers.every((stream) => changes(stream).length === 5), 'result publication');
  await request(`/scheduling/events/${eventId}/auto-schedule`, 'POST', { dryRun: false });
  await until(() => viewers.every((stream) => changes(stream).length === 6), 'applied auto-schedule');
  await request(`/matches/event/${eventId}/distribute-dates`);
  await until(() => viewers.every((stream) => changes(stream).length === 7), 'date distribution');
  assert.equal(matchReads, 0, 'Notifications must not add DB reads to ordinary writes');

  await request(`/matches/${matchId}`, 'PATCH', { eventId: otherEventId }, 200);
  await until(() => viewers.every((stream) => changes(stream).length === 8) && changes(otherViewer).length === 1, 'both events refreshed on match move');
  assert.equal(matchReads, 1, 'Only a match move reads its previous event');
  await request(`/matches/${matches[1].id}`, 'DELETE', {}, 204);
  await until(() => viewers.every((stream) => changes(stream).length === 9), 'match deletion');
  await until(() => viewers[0].events.some((event) => event.type === 'heartbeat'), 'keep-alive', 18_000);

  viewers[0].controller.abort();
  await viewers[0].done;
  const reconnected = await openStream();
  await until(() => reconnected.events.some((event) => event.type === 'ready'), 'fresh snapshot requested after reconnect');
  await request(`/matches/${matches[2].id}`, 'PATCH', { notes: 'after reconnect' }, 200);
  await until(() => changes(reconnected).length === 1, 'updates after reconnect');
  const invalid = await openStream('missing-event');
  await until(() => invalid.events.some((event) => event.type === 'error'), 'invalid event rejected');
  assert.ok(!invalid.events.some((event) => event.type === 'ready'));

  for (const stream of streams) stream.controller.abort();
  await Promise.all(streams.map((stream) => stream.done));
  await until(() => app.get(PublicEventStreamService).channels.size === 0, 'all subscriber resources released');
  console.log(`PASS: 100 concurrent SSE viewers; successful/failed API writes, coalescing, event isolation, scoring/lease/dry-run exclusions, move/delete, heartbeat, reconnect, headers and cleanup. No database connection or changes. Update p95: ${Math.round(latencies[94])} ms (includes 1 second coalescing).`);
} finally {
  releaseWrite?.();
  for (const stream of streams) stream.controller.abort();
  await Promise.allSettled(streams.map((stream) => stream.done));
  await app?.close();
}
