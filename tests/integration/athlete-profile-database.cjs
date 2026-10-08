// Run in the local backend container; generated test fixtures are removed afterwards.
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { AthleteIdentityService } = require('./apps/backend/dist/src/athletes/athlete-identity.service');
const { assertAthleteEligibility } = require('./apps/backend/dist/src/competitions/athlete-eligibility');

async function main() {
  const prisma = new PrismaClient();
  const identity = new AthleteIdentityService();
  const prefix = `PROFILE_TEST_${randomUUID()}`;
  let athleteId, eventId, categoryId;
  try {
    const country = await prisma.country.findFirstOrThrow();
    const sport = await prisma.sport.findFirstOrThrow();
    const cccd = `990${randomInt(100000000, 999999999)}`;
    const passport = `T${randomInt(10000000, 99999999)}`;
    const input = { fullName: prefix, gender: 'MALE', countryId: country.id, birthDate: new Date('2000-01-01') };
    const cccdKeys = identity.normalize({ ...input, identityType: 'CCCD', documentNumber: cccd });
    const passportKeys = identity.normalize({ ...input, identityType: 'PASSPORT', documentNumber: passport });
    const athlete = await prisma.athlete.create({ data: {
      ...input, firstName: prefix, lastName: 'Test', identity: { create: { ...cccdKeys, ...passportKeys } },
    } });
    athleteId = athlete.id;
    assert.equal(athlete.weight, null);
    assert.equal(athlete.height, null);
    const stored = await prisma.athleteIdentity.findUniqueOrThrow({ where: { athleteId } });
    assert(!stored.cccdEncrypted.includes(cccd));
    assert(!stored.passportEncrypted.includes(passport));
    const base = 'http://127.0.0.1:4000/api';
    assert.equal((await fetch(`${base}/athletes/${athleteId}/identity-details`)).status, 401);
    const publicData = JSON.stringify(await (await fetch(`${base}/athletes/${athleteId}`)).json());
    assert(!publicData.includes(cccd) && !publicData.includes(passport) && !publicData.includes('cccdEncrypted'));
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }) });
    assert.equal(login.status, 201);
    const { accessToken } = await login.json();
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
    const response = await fetch(`${base}/athletes/${athleteId}/identity-details`, { headers });
    assert.equal(response.status, 200);
    assert(response.headers.get('cache-control').includes('no-store'));
    assert.deepEqual(await response.json(), { cccd, passport });
    await prisma.$transaction(async (tx) => {
      await assert.rejects(identity.assertNew(tx, { ...input, fullName: 'Other name', identityType: 'CCCD', documentNumber: cccd }), (error) => error.getStatus() === 409);
    });
    categoryId = (await prisma.category.create({ data: { name: prefix, sportId: sport.id, gender: 'MALE', minWeight: 50, maxWeight: 70 } })).id;
    eventId = (await prisma.event.create({ data: { name: prefix, sportId: sport.id,
      startDate: new Date('2030-01-01'), endDate: new Date('2030-01-02'), categories: { connect: { id: categoryId } } } })).id;
    const eligibility = await fetch(`${base}/participant-auth/admin/registrations/eligibility`, { method: 'POST', headers,
      body: JSON.stringify({ eventId, categoryId, athlete: {
        firstName: prefix, lastName: 'Draft', fullName: `${prefix} Draft`, email: `${randomUUID()}@profile-test.invalid`,
        phone: '0901234567', gender: 'MALE', birthDate: '2000-01-01', countryId: country.id,
      } }) });
    assert.equal(eligibility.status, 201);
    assert.equal((await eligibility.json()).eligible, true);
    const category = { gender: 'MALE', minAge: null, maxAge: null, minWeight: 50, maxWeight: 70 };
    assertAthleteEligibility({ gender: 'MALE', birthDate: input.birthDate, weight: null }, category, new Date('2030-01-01'));
    assert.throws(() => assertAthleteEligibility({ gender: 'MALE', birthDate: input.birthDate, weight: 80 }, category, new Date('2030-01-01')));
    console.log('Passed: protected CCCD/passport display, encrypted storage, public privacy, retained duplicate detection and eligibility without height/weight.');
  } finally {
    if (eventId) await prisma.event.deleteMany({ where: { id: eventId, name: prefix } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId, name: prefix } });
    if (athleteId) await prisma.athlete.deleteMany({ where: { id: athleteId, fullName: prefix } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
