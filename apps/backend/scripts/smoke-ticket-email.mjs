// Build first: npm run build:backend
// Run: node --test apps/backend/scripts/smoke-ticket-email.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { Module, NotFoundException } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { PrismaService } = require('../dist/src/prisma/prisma.service.js');
const { TicketNotIssuedException } = require('../dist/src/participants/ticket-availability.exceptions.js');
const { ParticipantsService } = require('../dist/src/participants/participants.service.js');
const { TicketEmailQueueService } = require('../dist/src/participants/ticket-email-queue.service.js');
const { TicketEmailWorkerService } = require('../dist/src/participants/ticket-email-worker.service.js');
const { TicketEmailService } = require('../dist/src/participants/ticket-email.service.js');
const { ParticipantsModule } = require('../dist/src/participants/participants.module.js');
const nodemailerModule = require('nodemailer');
const nodemailer = nodemailerModule.default || nodemailerModule;

function fixture({ identityVerified = true, paymentMode = 'FREE', failEnqueue = false } = {}) {
  const registrations = [];
  const jobs = [];
  const category = {
    id: 'category', gender: 'MIXED', minAge: null, maxAge: null,
    minWeight: null, maxWeight: null, sport: { id: 'sport' },
  };
  const event = {
    id: 'event', isPublished: true, registrationEnabled: true,
    startDate: new Date('2030-01-01'), categories: [category],
    participatingFederations: [], allowIndependentAthletes: true,
    paymentMode, registrationFee: 100, registrationCurrency: 'VND',
  };
  const athlete = {
    id: 'athlete', countryId: 'country', gender: 'MALE', birthDate: new Date('2000-01-01'),
    media: ['AVATAR', 'CCCD_FRONT', 'CCCD_BACK'].map((type) => ({
      type, verificationStatus: identityVerified ? 'VERIFIED' : 'PENDING',
    })),
  };
  let committed = false;
  let txActive = false;
  const prisma = {
    event: { findUnique: async () => event },
    country: { findMany: async () => [{ id: 'country' }] },
    athlete: { findUnique: async () => athlete },
    eventRegistration: {
      findFirst: async () => null,
      findUnique: async () => ({
        id: 'registration', eventId: event.id, categoryId: category.id, athleteId: athlete.id,
        ticketCode: 'SD-TICKET', status: 'SUBMITTED', paymentStatus: 'NOT_REQUIRED',
        account: { email: 'account@example.test' }, submission: { contactEmail: 'guest@example.test' },
      }),
    },
    async $transaction(callback) {
      const pendingRegistrations = [];
      const pendingJobs = [];
      txActive = true;
      const transaction = {
        athlete: { create: async ({ data }) => ({ ...data, id: `athlete-${pendingRegistrations.length}` }) },
        registrationSubmission: { create: async ({ data }) => ({ ...data, id: 'submission' }) },
        eventRegistration: {
          create: async ({ data }) => {
            const registration = { ...data, id: `registration-${pendingRegistrations.length}`, createdAt: new Date() };
            pendingRegistrations.push(registration);
            return registration;
          },
          update: async ({ data }) => { pendingRegistrations.push({ id: 'registration', ...data }); },
          findUniqueOrThrow: async () => pendingRegistrations.at(-1),
        },
        registrationStatusHistory: { create: async () => ({}) },
        ticketEmailJob: {
          create: async ({ data }) => {
            assert.equal(committed, false, 'enqueue must happen before DB commit');
            if (failEnqueue) throw new Error('queue insert failed');
            pendingJobs.push(data);
          },
        },
      };
      try {
        const result = await callback(transaction);
        registrations.push(...pendingRegistrations);
        jobs.push(...pendingJobs);
        committed = true;
        return result;
      } finally {
        txActive = false;
      }
    },
  };
  const storage = {
    upload: async () => ({ key: 'stored-image', size: 8 }),
    deleteQuietly: async () => {},
    read: async () => { assert.fail('the request must not load PDF assets'); },
  };
  const queue = new TicketEmailQueueService(prisma);
  const service = new ParticipantsService(
    prisma, storage, {}, {}, queue,
    { get: async () => ({ values: { identityOcrEnabled: true } }) },
    { notifyRegistration: async () => { assert.equal(committed, true); } },
    { lock: async () => { assert.equal(txActive, true); }, assertNew: async () => ({}) },
  );
  service.getProfile = async () => ({ email: 'account@example.test', athlete });
  service.syncCompetitionEntry = async () => { assert.equal(txActive, true); };
  service.getIssuedTicket = async () => { assert.fail('request must not prepare a ticket'); };
  service.getSubmissionTickets = async () => { assert.fail('request must not prepare a batch PDF'); };
  return { service, queue, jobs, registrations, event };
}

test('confirmed account registration responds while SMTP is blocked', async () => {
  const { service, jobs } = fixture();
  const result = await service.createRegistration('account', { eventId: 'event', categoryId: 'category' });
  assert.equal(result.status, 'CONFIRMED');
  assert.equal(result.ticketEmailSent, false);
  assert.equal(result.ticketEmailQueued, true);
  assert.deepEqual(jobs, [{ to: 'account@example.test', ticketCode: result.ticketCode }]);

  let release;
  let sending;
  const started = new Promise((resolve) => { sending = resolve; });
  const blockedSmtp = new Promise((resolve) => { release = resolve; });
  const worker = new TicketEmailWorkerService(
    { claim: async () => ({ ...jobs[0], id: 'job', attempts: 1 }), finish: async () => {}, renew: async () => {} },
    { getIssuedTicket: async () => ({ isValid: true }) },
    { isEnabled: async () => true, send: () => { sending(); return blockedSmtp; } },
  );
  const processing = worker.processNext();
  await started;
  assert.equal(result.status, 'CONFIRMED', 'response is already available before SMTP completes');
  release(true);
  await processing;
});

test('unconfirmed registrations do not enqueue emails', async () => {
  for (const options of [{ identityVerified: false }, { paymentMode: 'MANUAL' }]) {
    const { service, jobs } = fixture(options);
    const result = await service.createRegistration('account', { eventId: 'event', categoryId: 'category' });
    assert.equal(result.status, 'SUBMITTED');
    assert.equal(result.ticketEmailQueued, false);
    assert.equal(jobs.length, 0);
  }
});

test('CMS approval enqueues a ticket using account or submission email', async () => {
  for (const useGuestEmail of [false, true]) {
    const { service, jobs } = fixture();
    if (useGuestEmail) {
      const original = service.prisma.eventRegistration.findUnique;
      service.prisma.eventRegistration.findUnique = async () => ({ ...await original(), account: null });
    }
    const result = await service.updateRegistrationStatus('registration', 'CONFIRMED', 'Approved', 'cms-user');
    assert.equal(result.status, 'CONFIRMED');
    assert.deepEqual(jobs, [{ to: useGuestEmail ? 'guest@example.test' : 'account@example.test', ticketCode: 'SD-TICKET' }]);
  }
  const { service, jobs } = fixture();
  await service.updateRegistrationStatus('registration', 'REJECTED', 'Rejected', 'cms-user');
  assert.equal(jobs.length, 0);
});

test('guest and group registration enqueue one batch without preparing assets', async () => {
  for (const count of [1, 2]) {
    const { service, jobs } = fixture();
    service.systemSettings.get = async () => ({ values: { identityOcrEnabled: false } });
    const athletes = Array.from({ length: count }, () => ({
      fullName: 'Test Athlete', birthDate: '2000-01-01', gender: 'MALE',
      countryId: 'country', categoryId: 'category', documentNumber: '012345678901',
    }));
    const files = athletes.flatMap((_, index) => ['avatar', 'cccdFront', 'cccdBack'].map((type) => ({
      fieldname: `athlete_${index}_${type}`, mimetype: 'image/png', size: 8,
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    })));
    const result = await service.createGuestRegistrations(JSON.stringify({
      eventId: 'event', contactName: 'Test Contact', contactEmail: 'guest@example.test',
      contactPhone: '0123456789', organizationName: 'Test Club', athletes,
    }), files);
    assert.equal(result.status, 'CONFIRMED');
    assert.equal(result.registrations.length, count);
    assert.equal(result.ticketEmailQueued, true);
    assert.deepEqual(jobs, [{ to: 'guest@example.test', referenceCode: result.referenceCode }]);
  }
});

test('queue insert failure rolls back the registration transaction', async () => {
  const { service, registrations, jobs } = fixture({ failEnqueue: true });
  await assert.rejects(service.createRegistration('account', { eventId: 'event', categoryId: 'category' }), /queue insert failed/);
  assert.equal(registrations.length, 0);
  assert.equal(jobs.length, 0);
});

test('worker retries asset/PDF/SMTP errors and skips revoked tickets or disabled email', async () => {
  for (const failure of ['assets', 'missing-asset', 'pdf', 'smtp', 'revoked', 'disabled']) {
    const job = { id: 'job', ticketCode: 'SD-TICKET', to: 'recipient@example.test', attempts: 1 };
    const outcomes = [];
    const worker = new TicketEmailWorkerService(
      {
        claim: async () => job,
        retry: async (_, error) => outcomes.push(['retry', error.message]),
        finish: async (_, sent) => outcomes.push(['finish', sent]),
      },
      {
        getIssuedTicket: async () => {
          if (failure === 'assets') throw new Error('asset read failed');
          if (failure === 'missing-asset') throw new NotFoundException('asset not found');
          if (failure === 'revoked') throw new TicketNotIssuedException('ticket revoked');
          return { isValid: true };
        },
      },
      {
        isEnabled: async () => failure !== 'disabled',
        send: async () => { throw new Error(`${failure} failed`); },
      },
    );
    worker.logger.error = () => {};
    await worker.processNext();
    assert.deepEqual(outcomes, failure === 'revoked' || failure === 'disabled'
      ? [['finish', false]]
      : [['retry', failure === 'assets' ? 'asset read failed' : failure === 'missing-asset' ? 'asset not found' : `${failure} failed`]]);
  }
});

test('retries back off, stop after five attempts and respect the lease token', async () => {
  const updates = [];
  const queue = new TicketEmailQueueService({ ticketEmailJob: { updateMany: async (args) => updates.push(args) } });
  for (const attempts of [1, 2, 4, 5]) {
    const before = Date.now();
    await queue.retry({ id: 'job', lockToken: 'owned-token', attempts }, new Error('SMTP timeout'));
    const { where, data } = updates.at(-1);
    assert.deepEqual(where, { id: 'job', status: 'RUNNING', lockToken: 'owned-token' });
    assert.equal(data.status, attempts === 5 ? 'FAILED' : 'PENDING');
    assert.ok(data.availableAt.getTime() >= before + 30_000 * 2 ** (attempts - 1));
    assert.equal(data.lastError, 'SMTP timeout');
    assert.equal(data.lockToken, null);
  }
});

test('paid registration finalization queues one email inside its transaction', async () => {
  const { service, jobs } = fixture();
  const registration = {
    id: 'paid-registration', eventId: 'event', categoryId: 'category', athleteId: 'athlete',
    status: 'SUBMITTED', paymentStatus: 'PAID', ticketCode: 'PAID-TICKET',
    submission: { contactEmail: 'guest@example.test' },
    athlete: { countryId: 'country', media: [{ type: 'PASSPORT', verificationStatus: 'VERIFIED' }] },
  };
  let active = false;
  service.syncCompetitionEntry = async () => { assert.equal(active, true); };
  service.prisma.$transaction = async (work) => {
    active = true;
    try {
      return await work({
        eventRegistration: {
          findUnique: async () => registration,
          updateMany: async ({ data }) => { Object.assign(registration, data); return { count: 1 }; },
        },
        registrationStatusHistory: { create: async () => ({}) },
        ticketEmailJob: { create: async ({ data }) => { assert.equal(active, true); jobs.push(data); } },
      });
    } finally { active = false; }
  };
  assert.ok(await service.finalizePaidRegistration(registration.id));
  assert.equal(await service.finalizePaidRegistration(registration.id), null);
  assert.deepEqual(jobs, [{ to: 'guest@example.test', ticketCode: 'PAID-TICKET' }]);
});

test('SMTP errors propagate to the worker for retries', async () => {
  const original = nodemailer.createTransport;
  const originalHost = process.env.SMTP_HOST;
  process.env.SMTP_HOST = 'smtp.example.test';
  nodemailer.createTransport = () => ({ sendMail: async () => { throw new Error('SMTP timeout'); } });
  try {
    const email = new TicketEmailService(
      { generate: async () => Buffer.from('PDF') },
      { enabled: async () => true, integrationValues: async () => ({ SMTP_HOST: 'smtp.example.test' }) },
    );
    email.logger.error = () => {};
    await assert.rejects(email.send('recipient@example.test', [{
      isValid: true, ticketCode: 'SD-TICKET', event: { name: 'Test Event' }, athlete: { fullName: 'Test Athlete' },
    }]), /SMTP timeout/);
  } finally {
    nodemailer.createTransport = original;
    if (originalHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalHost;
  }
});

test('backend lifecycle starts email processing and drains SMTP before disconnecting DB', async () => {
  assert.ok(Reflect.getMetadata('providers', ParticipantsModule).includes(TicketEmailWorkerService));
  let claimed = 0;
  let release;
  let sending;
  let finished = false;
  let disconnected = false;
  const started = new Promise((resolve) => { sending = resolve; });
  const smtp = new Promise((resolve) => { release = resolve; });
  const prisma = {
    connected: true,
    $disconnect: async () => {
      assert.equal(finished, true, 'DB must remain connected until the active email job finishes');
      disconnected = true;
    },
    beforeApplicationShutdown: PrismaService.prototype.beforeApplicationShutdown,
  };
  class BackendLifecycleTestModule {}
  Module({
    providers: [
      TicketEmailWorkerService,
      { provide: PrismaService, useValue: prisma },
      { provide: TicketEmailQueueService, useValue: {
        claim: async () => {
          claimed += 1;
          return claimed === 1 ? { id: 'job', ticketCode: 'SD-TICKET', to: 'test@example.test', attempts: 1 } : null;
        },
        finish: async () => { finished = true; },
        renew: async () => {},
      } },
      { provide: ParticipantsService, useValue: { getIssuedTicket: async () => ({ isValid: true }) } },
      { provide: TicketEmailService, useValue: {
        isEnabled: async () => true,
        send: () => { sending(); return smtp; },
      } },
    ],
  })(BackendLifecycleTestModule);
  const app = await NestFactory.createApplicationContext(BackendLifecycleTestModule, { logger: false });
  let timeout;
  let closing;
  try {
    await Promise.race([
      started,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('email processing did not start')), 3000); }),
    ]);
    clearTimeout(timeout);
    app.get(TicketEmailWorkerService).onApplicationBootstrap();
    assert.equal(claimed, 1, 'bootstrap must not start overlapping processors');
    closing = app.close();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(disconnected, false, 'shutdown must wait for blocked SMTP');
    release(true);
    await closing;
    assert.equal(finished, true);
    assert.equal(disconnected, true);
    assert.equal(claimed, 1, 'shutdown must not claim another job');
  } finally {
    clearTimeout(timeout);
    release(true);
    await (closing || app.close());
  }
});

test('background processor recovers from queue errors without rejecting application startup', async () => {
  let attempts = 0;
  let recovered;
  const recovery = new Promise((resolve) => { recovered = resolve; });
  const worker = new TicketEmailWorkerService({
    claim: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('DB unavailable');
      recovered();
      return null;
    },
  }, {}, {});
  worker.logger.error = () => {};
  worker.logger.log = () => {};
  let timeout;
  try {
    assert.equal(worker.onApplicationBootstrap(), undefined, 'bootstrap must not wait for DB or SMTP');
    await Promise.race([
      recovery,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('queue polling did not recover')), 8000); }),
    ]);
    assert.equal(attempts, 2);
  } finally {
    clearTimeout(timeout);
    await worker.onModuleDestroy();
  }
});
