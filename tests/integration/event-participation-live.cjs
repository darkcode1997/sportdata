// Copy into the local backend container and run with node; fixtures are removed.
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { randomUUID, randomInt } = require('node:crypto');
const nodemailerModule = require('nodemailer');
const nodemailer = nodemailerModule.default || nodemailerModule;
const { mkdirSync, writeFileSync } = require('node:fs');
const { EventParticipationsService } = require('../../apps/backend/dist/src/participants/event-participations.service');
const { TicketPdfService } = require('../../apps/backend/dist/src/participants/ticket-pdf.service');
const { TicketEmailService } = require('../../apps/backend/dist/src/participants/ticket-email.service');
const { TicketEmailWorkerService } = require('../../apps/backend/dist/src/participants/ticket-email-worker.service');
const prisma = new PrismaClient();
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4000/api';
const marker = `PARTICIPATION_CHECK_${randomUUID()}`;
const accountIds = [];
const federationIds = [];
const ticketCodes = [];
let eventId;

function request(path, method = 'GET', body, token) {
  return fetch(`${base}${path}`, { method, headers: {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
async function ok(response, status = 201) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}

async function main() {
  try {
    const country = await prisma.country.findFirstOrThrow();
    const sport = await prisma.sport.findFirstOrThrow();
    const federation = await prisma.federation.create({ data: { name: marker, countryId: country.id } });
    federationIds.push(federation.id);
    const outside = await prisma.federation.create({ data: { name: `${marker}_OTHER`, countryId: country.id } });
    federationIds.push(outside.id);
    const event = await prisma.event.create({ data: {
      name: marker, sportId: sport.id, startDate: new Date(Date.now() + 86400000 * 7), endDate: new Date(Date.now() + 86400000 * 8),
      isPublished: true, registrationEnabled: true, participatingFederations: { connect: { id: federation.id } },
    } });
    eventId = event.id;
    const before = await prisma.athlete.count();
    const signup = { email: `${marker}@check.invalid`, password: 'Participation-check-123', displayName: marker,
      identityType: 'CCCD', documentNumber: `990${randomInt(100000000, 999999999)}`, gender: 'MALE',
      birthDate: '2000-01-01', countryId: country.id, accountTypes: ['REFEREE'],
    };
    const account = await ok(await request('/participant-auth/register', 'POST', signup));
    accountIds.push(account.account.id);
    assert.deepEqual(account.account.accountTypes, ['REFEREE']);
    assert.equal((await request('/participant-auth/register', 'POST', { ...signup,
      email: `${marker}_MULTI@check.invalid`, accountTypes: ['REFEREE', 'COACH'],
    })).status, 400);
    const second = await ok(await request('/participant-auth/register', 'POST', { ...signup,
      email: `${marker}_OTHER@check.invalid`, documentNumber: `991${randomInt(100000000, 999999999)}`,
    }));
    accountIds.push(second.account.id);
    const token = account.accessToken;
    const common = { eventId };
    for (const role of ['ATTENDEE', 'REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL_STAFF']) {
      const payload = { ...common, role, ...(role === 'TEAM_LEADER' ? { federationId: federation.id } : {}),
        contactName: 'Ignored Caller Name', contactEmail: 'ignored@check.invalid',
      };
      const record = await ok(await request('/participant-auth/event-participations', 'POST', payload, token));
      ticketCodes.push(record.referenceCode);
      assert.equal(record.role, role);
      assert.equal(record.status, 'SUBMITTED');
      assert.equal(record.contactEmail, signup.email.toLowerCase());
      assert.equal(record.contactName, marker);
      if (role === 'TEAM_LEADER') assert.equal(record.federation.id, federation.id);
      assert.equal((await request('/participant-auth/event-participations', 'POST', payload, token)).status, 409);
    }
    assert.equal(await prisma.athlete.count(), before, 'Non-athlete participation must not create athletes');
    const mine = await ok(await request(`/participant-auth/event-participations?eventId=${eventId}`, 'GET', null, token), 200);
    assert.equal(mine.length, 5);
    assert.equal((await ok(await request('/participant-auth/event-participations', 'GET', null, second.accessToken), 200)).length, 0);
    assert.equal((await request('/participant-auth/event-participations')).status, 401);
    const guest = await ok(await request('/participant-auth/event-participations', 'POST', { ...common,
      role: 'ATTENDEE', contactName: 'Temporary Guest', contactEmail: `${marker}_GUEST@check.invalid`,
    }));
    ticketCodes.push(guest.referenceCode);
    assert.equal(guest.accountId, null);
    for (const payload of [
      { ...common, role: 'TEAM_LEADER' },
      { ...common, role: 'TEAM_LEADER', federationId: outside.id },
      { ...common, role: 'TEAM_LEADER', federationId: 'missing-federation' },
      { ...common, role: 'COACH', federationId: federation.id },
      { ...common, role: 'ATHLETE' },
    ]) assert.equal((await request('/participant-auth/event-participations', 'POST', payload, token)).status, 400);
    assert.equal((await request('/participant-auth/event-participations', 'POST', { ...common, role: 'ATTENDEE' })).status, 400);
    const admin = await ok(await request('/auth/login', 'POST', { identifier: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }));
    const typePath = `/participant-auth/admin/accounts/${account.account.id}/types`;
    assert.equal((await request(typePath, 'PATCH', { accountTypes: ['REFEREE', 'COACH'] }, admin.accessToken)).status, 400);
    const changed = await ok(await request(typePath, 'PATCH', { accountTypes: ['MEDICAL_STAFF'] }, admin.accessToken), 200);
    assert.equal(changed.accountType, 'MEDICAL_STAFF');
    assert.deepEqual(changed.accountTypes, ['MEDICAL_STAFF']);
    const profile = await ok(await request('/participant-auth/me', 'GET', null, token), 200);
    assert.deepEqual(profile.accountTypes, ['MEDICAL_STAFF']);
    assert.equal(profile.hasAthleteProfile, false);
    const inconsistent = await prisma.$queryRaw`SELECT count(*)::int AS count FROM "ParticipantAccount"
      WHERE cardinality("accountTypes") <> 1 OR "accountTypes"[1] IS DISTINCT FROM "accountType"`;
    assert.equal(inconsistent[0].count, 0);
    await assert.rejects(prisma.participantAccount.update({ where: { id: account.account.id },
      data: { accountTypes: ['MEDICAL_STAFF', 'COACH'] },
    }));
    const list = await ok(await request(`/participant-auth/admin/event-participations?eventId=${eventId}`, 'GET', null, admin.accessToken), 200);
    assert.equal(list.length, 6);
    const leader = mine.find((item) => item.role === 'TEAM_LEADER');
    assert.equal((await request(`/participant-auth/tickets/${leader.referenceCode}/pdf`)).status, 400);
    const confirmed = await ok(await request(`/participant-auth/admin/event-participations/${leader.id}/status`, 'PATCH', { status: 'CONFIRMED', reason: 'Verified by organizer' }, admin.accessToken), 200);
    assert.equal(confirmed.status, 'CONFIRMED');
    assert.equal(confirmed.federation.id, federation.id);
    const sent = [];
    const originalTransport = nodemailer.createTransport;
    nodemailer.createTransport = () => ({ sendMail: async (message) => { sent.push(message); } });
    try {
      const participationService = new EventParticipationsService(prisma, {}, { read: async () => null });
      const mailer = new TicketEmailService(new TicketPdfService(), {
        enabled: async () => true, integrationValues: async () => ({ SMTP_HOST: 'mock.invalid', SMTP_FROM: 'SportData' }),
      });
      for (const item of [...mine, guest]) {
        if (item.id !== leader.id) await ok(await request(`/participant-auth/admin/event-participations/${item.id}/status`, 'PATCH', { status: 'CONFIRMED', reason: 'Ticket role check' }, admin.accessToken), 200);
        const queued = await prisma.ticketEmailJob.findMany({ where: { ticketCode: item.referenceCode } });
        assert.equal(queued.length, 1, 'Confirmation must enqueue one email');
        assert.equal(queued[0].to, item.contactEmail);
        await ok(await request(`/participant-auth/admin/event-participations/${item.id}/status`, 'PATCH', { status: 'CONFIRMED', reason: 'Repeated confirmation' }, admin.accessToken), 200);
        assert.equal(await prisma.ticketEmailJob.count({ where: { ticketCode: item.referenceCode } }), 1);
        const ticket = await ok(await request(`/participant-auth/tickets/${item.referenceCode}`), 200);
        assert.equal(ticket.role, item.role);
        assert.equal(ticket.isValid, true);
        assert(!('contactEmail' in ticket) && !('contactPhone' in ticket));
        const response = await request(`/participant-auth/tickets/${item.referenceCode}/pdf`);
        assert.equal(response.status, 200);
        assert(response.headers.get('content-type').includes('application/pdf'));
        const pdf = Buffer.from(await response.arrayBuffer());
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
        if (process.env.TEST_PDF_DIR) {
          mkdirSync(process.env.TEST_PDF_DIR, { recursive: true });
          writeFileSync(`${process.env.TEST_PDF_DIR}/${item.role}.pdf`, pdf);
        }
        let finished;
        const queue = { claim: async () => queued[0], renew: async () => {},
          finish: async (_, success) => { finished = success; }, retry: async (_, error) => { throw error; } };
        const worker = new TicketEmailWorkerService(queue, {}, mailer, participationService);
        assert.equal(await worker.processNext(), true);
        assert.equal(finished, true);
        const message = sent.at(-1);
        assert.equal(message.to, item.contactEmail);
        assert(message.html.includes(ticket.roleLabel));
        assert.equal(message.attachments[0].content.subarray(0, 5).toString(), '%PDF-');
      }
      assert.equal(sent.length, 6);
      await ok(await request(`/participant-auth/admin/event-participations/${leader.id}/status`, 'PATCH', { status: 'CANCELLED', reason: 'Revoked ticket check' }, admin.accessToken), 200);
      assert.equal((await request(`/participant-auth/tickets/${leader.referenceCode}/pdf`)).status, 400);
      assert.equal((await ok(await request(`/participant-auth/tickets/${leader.referenceCode}`), 200)).isValid, false);
      let skipped;
      const worker = new TicketEmailWorkerService({
        claim: async () => ({ id: 'revoked-check', ticketCode: leader.referenceCode, to: leader.contactEmail, attempts: 1 }),
        finish: async (_, success) => { skipped = !success; }, renew: async () => {},
        retry: async (_, error) => { throw error; },
      }, {}, mailer, participationService);
      await worker.processNext();
      assert.equal(skipped, true);
      assert.equal(sent.length, 6, 'Revoked tickets must not be sent');
    } finally { nodemailer.createTransport = originalTransport; }
    assert.equal((await request(`/participant-auth/admin/event-participations/${leader.id}/status`, 'PATCH', { status: 'CONFIRMED', reason: 'Verified' }, token)).status, 401);
    await prisma.event.update({ where: { id: eventId }, data: { registrationEnabled: false } });
    assert.equal((await request('/participant-auth/event-participations', 'POST', { ...common, role: 'REFEREE' }, second.accessToken)).status, 400);
    await prisma.event.update({ where: { id: eventId }, data: { registrationEnabled: true, registrationOpenAt: new Date(Date.now() + 86400000) } });
    assert.equal((await request('/participant-auth/event-participations', 'POST', { ...common, role: 'REFEREE' }, second.accessToken)).status, 400);
    await prisma.event.update({ where: { id: eventId }, data: { registrationOpenAt: null, registrationCloseAt: new Date(Date.now() - 86400000) } });
    assert.equal((await request('/participant-auth/event-participations', 'POST', { ...common, role: 'REFEREE' }, second.accessToken)).status, 400);
    await prisma.event.update({ where: { id: eventId }, data: { registrationCloseAt: null, isPublished: false } });
    assert.equal((await request('/participant-auth/event-participations', 'POST', { ...common, role: 'REFEREE' }, second.accessToken)).status, 404);
    assert.equal(await prisma.athlete.count(), before);
    console.log('PASS: single account type; roles and guest registration; approved role PDFs; email worker with PDF attachments (mock SMTP); duplicate email protection; revoked tickets; privacy, review, registration windows and unchanged athlete count.');
  } finally {
    if (ticketCodes.length) await prisma.ticketEmailJob.deleteMany({ where: { ticketCode: { in: ticketCodes } } });
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId, name: marker } });
    if (accountIds.length) await prisma.participantAccount.deleteMany({ where: { id: { in: accountIds }, displayName: marker } });
    if (federationIds.length) await prisma.federation.deleteMany({ where: { id: { in: federationIds }, name: { startsWith: marker } } });
    await prisma.$disconnect();
    console.log('Temporary verification records removed.');
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
