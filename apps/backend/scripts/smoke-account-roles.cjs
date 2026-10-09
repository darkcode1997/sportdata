// Build first. Uses an isolated schema on local PostgreSQL, never production.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const databaseUrl = process.env.ACCOUNT_ROLES_TEST_DATABASE_URL;

test('personal account types, athlete intent, professional review, event roles and authorization', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only local PostgreSQL is allowed');
  const schema = `account_roles_test_${randomUUID().replaceAll('-', '')}`;
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  url.searchParams.set('schema', schema);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  let app;
  let created = false;
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', resolve(__dirname, '../prisma/schema.prisma')], {
      env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe',
    });
    const country = await prisma.country.create({ data: { code: 'VIE', name: 'Vietnam' } });
    const federation = await prisma.federation.create({ data: { name: 'Test Club', type: 'CLUB', countryId: country.id } });
    const sport = await prisma.sport.create({ data: { name: 'Role Test Sport', code: 'ROLE_TEST' } });
    const event = await prisma.event.create({ data: { name: 'Future Event', sportId: sport.id, isPublished: true, startDate: new Date('2027-01-01'), endDate: new Date('2027-01-02') } });
    const hidden = await prisma.event.create({ data: { name: 'Draft Event', sportId: sport.id, startDate: new Date('2027-01-01'), endDate: new Date('2027-01-02') } });
    const password = 'test-account-role-only';
    const admin = await prisma.user.create({ data: { name: 'Role Test Admin', email: 'role-admin@example.test', username: 'role.admin', password: await bcrypt.hash(password, 12), role: 'ADMIN' } });

    process.env.DATABASE_URL = url.toString();
    process.env.JWT_SECRET = 'account-role-test-secret-with-sufficient-length';
    process.env.NODE_ENV = 'test';
    process.env.VERCEL = '1';
    process.env.VERCEL_ENV = 'preview';
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('../dist/src/app.module');
    const { configureApplication } = require('../dist/src/create-application');
    app = await configureApplication(await NestFactory.create(AppModule, { logger: false }));
    await app.listen(0, '127.0.0.1');
    const base = `${await app.getUrl()}/api`;
    async function request(method, path, body, token) {
      const response = await fetch(`${base}${path}`, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    }
    const adminLogin = await request('POST', '/auth/login', { identifier: 'role.admin', password });
    assert.equal(adminLogin.status, 201);
    const adminToken = adminLogin.body.accessToken;
    const accounts = {};
    for (const type of ['GENERAL', 'ATHLETE', 'REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL']) {
      const payload = { email: `${type.toLowerCase()}@example.test`, password, displayName: `Person ${type}`, countryId: country.id,
        accountType: type, phone: '0900000001', professionalSummary: 'Test professional experience',
        ...(type === 'ATHLETE' ? { gender: 'MALE', birthDate: '1995-01-02' } : {}),
        ...(type === 'TEAM_LEADER' ? { federationId: federation.id } : {}),
      };
      const result = await request('POST', '/participant-auth/register', payload);
      assert.equal(result.status, 201, JSON.stringify(result.body));
      assert.equal(result.body.account.accountType, type);
      const profile = await request('GET', '/participant-auth/me', undefined, result.body.accessToken);
      assert.equal(profile.status, 200);
      assert.equal(Boolean(profile.body.athlete), type === 'ATHLETE');
      assert.equal(profile.body.countryId, country.id);
      assert.ok(!('password' in profile.body));
      const login = await request('POST', '/participant-auth/login', { email: payload.email, password });
      assert.equal(login.status, 201, 'shared personal login accepts each role');
      accounts[type] = { ...result.body.account, token: result.body.accessToken };
    }
    assert.equal(await prisma.athlete.count(), 1, 'only explicit athlete signup creates an athlete');
    const noType = await request('POST', '/participant-auth/register', { email: 'default@example.test', password, displayName: 'Ordinary Person' });
    assert.equal(noType.status, 201);
    assert.equal(noType.body.account.accountType, 'GENERAL');
    assert.equal(await prisma.athlete.count(), 1);
    assert.equal((await request('POST', '/participant-auth/register', { email: 'wrong@example.test', password, displayName: 'Wrong Type', accountType: 'ADMIN' })).status, 400);
    assert.equal((await request('POST', '/participant-auth/register', { email: 'missing@example.test', password, displayName: 'Missing Athlete', accountType: 'ATHLETE' })).status, 400);
    assert.equal((await request('GET', '/users', undefined, accounts.REFEREE.token)).status, 401, 'professional account is never a CMS identity');
    assert.equal((await request('GET', '/participant-auth/me', undefined, adminToken)).status, 401, 'CMS token is not a participant token');

    const personalEdit = await request('PATCH', '/participant-auth/me', { displayName: 'Updated Ordinary', phone: '0900000002' }, accounts.GENERAL.token);
    assert.equal(personalEdit.status, 200);
    assert.equal(personalEdit.body.athlete, null);
    assert.equal((await request('POST', '/participant-auth/me/athlete-profile', { gender: 'FEMALE', birthDate: '1998-02-03', countryId: country.id }, accounts.GENERAL.token)).status, 201);
    assert.equal(await prisma.athlete.count(), 2);
    assert.equal((await request('PATCH', '/participant-roles/accounts/me/type', { accountType: 'COACH' }, accounts.GENERAL.token)).status, 200);
    assert.equal((await request('GET', '/participant-auth/me', undefined, accounts.GENERAL.token)).body.athlete.isArchived, false, 'explicit athlete profile survives another professional role');
    assert.equal((await request('POST', '/participant-auth/assisted-registrations', {}, accounts.GENERAL.token)).status, 400, 'a coach with an active athlete profile passes the athlete capability guard; incomplete registration is still rejected');

    // A legacy implicit profile can be reclassified without deleting any row.
    const old = await prisma.participantAccount.create({ data: { email: 'legacy@example.test', displayName: 'Legacy Person', password: await bcrypt.hash(password, 12), accountType: 'ATHLETE', countryId: country.id,
      athlete: { create: { firstName: 'Legacy', lastName: 'Person', fullName: 'Legacy Person', gender: 'MALE', birthDate: new Date('1980-01-01'), countryId: country.id, profileConfirmed: false } },
    } });
    const oldLogin = await request('POST', '/participant-auth/login', { email: old.email, password });
    assert.equal((await request('PATCH', '/participant-roles/accounts/me/type', { accountType: 'GENERAL' }, oldLogin.body.accessToken)).status, 200);
    const legacy = await prisma.athlete.findUnique({ where: { participantAccountId: old.id } });
    assert.equal(legacy.isArchived, true);
    const athleteList = await request('GET', '/athletes', undefined, adminToken);
    assert.ok(!athleteList.body.items.some(item => item.id === legacy.id));
    assert.equal((await request('PATCH', '/participant-auth/me/athlete-profile', { displayName: 'Unauthorized' }, oldLogin.body.accessToken)).status, 400);

    // Professional verification is optimistic and records its reviewer.
    let medical = await prisma.participantAccount.findUnique({ where: { id: accounts.MEDICAL.id } });
    assert.equal((await request('PATCH', `/participant-roles/accounts/${medical.id}/review`, { status: 'VERIFIED', expectedUpdatedAt: medical.updatedAt.toISOString(), reviewNote: 'Checked qualification' }, accounts.MEDICAL.token)).status, 401);
    assert.equal((await request('PATCH', `/participant-roles/accounts/${medical.id}/review`, { status: 'VERIFIED', expectedUpdatedAt: '2000-01-01T00:00:00Z' }, adminToken)).status, 409);
    assert.equal((await request('PATCH', `/participant-roles/accounts/${medical.id}/review`, { status: 'VERIFIED', expectedUpdatedAt: medical.updatedAt.toISOString(), reviewNote: 'Checked qualification' }, adminToken)).status, 200);
    medical = await prisma.participantAccount.findUnique({ where: { id: medical.id } });
    assert.equal(medical.verificationReviewedBy, admin.id);
    assert.equal(medical.verificationStatus, 'VERIFIED');
    assert.equal((await request('PATCH', '/participant-auth/me', { professionalSummary: 'Changed qualification information' }, accounts.MEDICAL.token)).status, 200);
    assert.equal((await prisma.participantAccount.findUnique({ where: { id: medical.id } })).verificationStatus, 'PENDING');

    assert.equal((await request('POST', '/participant-roles/applications', { eventId: hidden.id, role: 'REFEREE' }, accounts.REFEREE.token)).status, 400);
    assert.equal((await request('POST', '/participant-roles/applications', { eventId: event.id, role: 'ADMIN' }, accounts.REFEREE.token)).status, 400);
    const concurrent = await Promise.all([1, 2].map(() => request('POST', '/participant-roles/applications', { eventId: event.id, role: 'REFEREE', note: 'Available with verified referee credentials' }, accounts.REFEREE.token)));
    assert.deepEqual(concurrent.map(result => result.status).sort(), [201, 409]);
    const application = concurrent.find(result => result.status === 201).body;
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/review`, { status: 'APPROVED', qualificationVerified: true }, accounts.REFEREE.token)).status, 401);
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/review`, { status: 'APPROVED' }, adminToken)).status, 400);
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/review`, { status: 'APPROVED', qualificationVerified: true, reviewNote: 'Assigned to mat 1' }, adminToken)).status, 200);
    const reviewed = await prisma.eventStaffRegistration.findUnique({ where: { id: application.id } });
    assert.equal(reviewed.reviewedBy, admin.id);
    assert.equal(reviewed.status, 'APPROVED');
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/cancel`, {}, accounts.COACH.token)).status, 404);
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/cancel`, {}, accounts.REFEREE.token)).status, 200);
    assert.equal((await request('PATCH', `/participant-roles/applications/${application.id}/review`, { status: 'APPROVED', qualificationVerified: true }, adminToken)).status, 400);
    assert.equal((await request('GET', '/participant-roles/applications/me', undefined, accounts.COACH.token)).body.length, 0);
    assert.equal(await prisma.athlete.count(), 3, 'event staff registrations never create athletes');

    const leader = await prisma.participantAccount.findUnique({ where: { id: accounts.TEAM_LEADER.id } });
    assert.equal((await request('POST', '/participant-auth/federation/guest-registrations', {}, accounts.TEAM_LEADER.token)).status >= 400, true, 'pending representative cannot submit a delegation');
    assert.equal((await request('PATCH', `/participant-roles/accounts/${leader.id}/review`, { status: 'VERIFIED', expectedUpdatedAt: leader.updatedAt.toISOString(), reviewNote: 'Club confirmed representative' }, adminToken)).status, 200);
    assert.equal((await request('GET', '/participant-auth/federation/me', undefined, accounts.TEAM_LEADER.token)).status, 200);
    const leaderAthlete = await request('POST', '/participant-auth/me/athlete-profile', { gender: 'MALE', birthDate: '1985-03-04', countryId: country.id }, accounts.TEAM_LEADER.token);
    assert.equal(leaderAthlete.status, 201);
    assert.equal(leaderAthlete.body.accountType, 'TEAM_LEADER');
    assert.equal(leaderAthlete.body.federationId, federation.id, 'adding a competing profile must preserve verified delegation affiliation');
    assert.equal(leaderAthlete.body.verificationStatus, 'VERIFIED');
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
    if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
});
