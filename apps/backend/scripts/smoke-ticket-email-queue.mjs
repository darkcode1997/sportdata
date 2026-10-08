// Build first. Set TICKET_EMAIL_TEST_DATABASE_URL to a local/disposable PostgreSQL URL.
// Creates an isolated schema, applies only the email-job migration, and drops that schema afterwards.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { TicketEmailQueueService } = require('../dist/src/participants/ticket-email-queue.service.js');
const databaseUrl = process.env.TICKET_EMAIL_TEST_DATABASE_URL;

test('PostgreSQL queue commits atomically, claims concurrently and recovers expired locks', { skip: !databaseUrl }, async () => {
  const schema = `ticket_email_test_${randomUUID().replaceAll('-', '')}`;
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  const url = new URL(databaseUrl);
  url.searchParams.set('schema', schema);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  const queue = new TicketEmailQueueService(prisma);
  let created = false;
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(await readFile(new URL('../prisma/migrations/20261008100000_ticket_email_jobs/migration.sql', import.meta.url), 'utf8'));

    await assert.rejects(prisma.$transaction(async (transaction) => {
      await queue.enqueueTicket(transaction, 'test@example.test', 'ROLLBACK-TICKET');
      throw new Error('rollback');
    }), /rollback/);
    assert.equal(await prisma.ticketEmailJob.count(), 0);

    await prisma.$transaction(async (transaction) => {
      await queue.enqueueTicket(transaction, 'test@example.test', 'SD-TICKET');
      await queue.enqueueSubmission(transaction, 'test@example.test', 'SD-SUBMISSION');
    });
    const claims = await Promise.all([queue.claim(), queue.claim()]);
    assert.ok(claims.every(Boolean));
    assert.notEqual(claims[0].id, claims[1].id, 'two workers must claim different jobs');
    assert.equal(await queue.claim(), null);
    await queue.finish(claims[0], true);
    await queue.finish(claims[1], false);
    assert.equal(await prisma.ticketEmailJob.count({ where: { status: 'SENT' } }), 1);
    assert.equal(await prisma.ticketEmailJob.count({ where: { status: 'SKIPPED' } }), 1);

    const old = await prisma.ticketEmailJob.create({ data: {
      to: 'test@example.test', ticketCode: 'STALE-TICKET', status: 'RUNNING', attempts: 1,
      lockedAt: new Date(Date.now() - 6 * 60_000), lockToken: 'dead-worker-token',
    } });
    const recovered = await queue.claim();
    assert.equal(recovered.id, old.id);
    assert.equal(recovered.attempts, 2);
    assert.notEqual(recovered.lockToken, old.lockToken);
    assert.equal((await queue.finish(old, true)).count, 0, 'an old worker cannot finish the new lease');
    assert.equal((await queue.renew(old)).count, 0);
    assert.equal((await queue.renew(recovered)).count, 1);
    await queue.retry(recovered, new Error('SMTP timeout'));
    const retry = await prisma.ticketEmailJob.findUniqueOrThrow({ where: { id: old.id } });
    assert.equal(retry.status, 'PENDING');
    assert.equal(retry.lastError, 'SMTP timeout');
    assert.equal(await queue.claim(), null, 'backoff must prevent immediate retry');
    await prisma.ticketEmailJob.update({ where: { id: old.id }, data: { availableAt: new Date(0) } });
    const retried = await queue.claim();
    assert.equal(retried.attempts, 3);
    await queue.finish(retried, true);

    const finalAttempt = await prisma.ticketEmailJob.create({ data: {
      to: 'test@example.test', ticketCode: 'FINAL-ATTEMPT', status: 'RUNNING', attempts: 5,
      lockedAt: new Date(Date.now() - 6 * 60_000), lockToken: 'dead-worker-token',
    } });
    assert.equal(await queue.claim(), null);
    assert.equal((await prisma.ticketEmailJob.findUniqueOrThrow({ where: { id: finalAttempt.id } })).status, 'FAILED');
  } finally {
    await prisma.$disconnect();
    if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
});
