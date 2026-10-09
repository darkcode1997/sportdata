// Run from the repository root after build: node tests/integration/athlete-identity-live.mjs
// Uses the running local API and database; removes only the profile created by this test.
import assert from 'node:assert/strict';
import { randomInt, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const envFile = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const database = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(database.hostname), 'Test requires local PostgreSQL');

const require = createRequire(new URL('../../apps/backend/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const { AthleteIdentityService } = require('./dist/src/athletes/athlete-identity.service.js');
const prisma = new PrismaClient();
const identity = new AthleteIdentityService();
let createdId;

async function check(input, expectedStatus) {
  const response = await fetch('http://127.0.0.1:4000/api/participant-auth/identity/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json();
  assert.equal(response.status, expectedStatus, `Identity check returned unexpected status: ${body.code || body.message}`);
  return body;
}

try {
  const country = await prisma.country.findFirst({ select: { id: true } });
  assert.ok(country, 'Local database needs at least one country');
  const input = {
    fullName: `IDENTITY_LIVE_TEST_${randomUUID()}`,
    birthDate: '2001-04-03',
    gender: 'MALE',
    countryId: country.id,
    identityType: 'CCCD',
    documentNumber: `990${randomInt(100000000, 1000000000)}`,
  };
  assert.deepEqual(await check(input, 201), { available: true });
  assert.equal(await prisma.athlete.count({ where: { fullName: input.fullName } }), 0);
  await check({ ...input, documentNumber: '123' }, 400);

  createdId = await prisma.$transaction(async (transaction) => {
    await identity.lock(transaction);
    const profile = { ...input, birthDate: new Date(input.birthDate) };
    const keys = await identity.assertNew(transaction, profile);
    const athlete = await transaction.athlete.create({ data: {
      firstName: 'Identity', lastName: 'Live test', fullName: input.fullName,
      birthDate: profile.birthDate, gender: input.gender, countryId: input.countryId,
      identity: { create: keys },
    } });
    return athlete.id;
  });

  for (const documentNumber of [input.documentNumber, input.documentNumber.match(/.{3}/g).join(' ')]) {
    const body = await check({ ...input, fullName: 'Different athlete', documentNumber }, 409);
    assert.equal(body.code, 'DUPLICATE_ATHLETE');
    assert.equal(typeof body.message, 'string');
    assert.ok(!JSON.stringify(body).includes(createdId));
    assert.ok(!JSON.stringify(body).includes(input.documentNumber));
  }
  assert.equal(await prisma.athlete.count({ where: { fullName: input.fullName } }), 1);
  await prisma.athlete.delete({ where: { id: createdId } });
  createdId = undefined;
  assert.deepEqual(await check(input, 201), { available: true });
  console.log('PASS: live API and PostgreSQL: new CCCD 201, invalid CCCD 400, duplicate and normalized CCCD 409, private errors, no lookup-created profile, test cleanup.');
} finally {
  if (createdId) await prisma.athlete.delete({ where: { id: createdId } });
  await prisma.$disconnect();
}
