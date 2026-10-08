// Pipe into docker compose exec -T backend node. Only generated test profiles are removed.
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { AthleteIdentityService } = require('./apps/backend/dist/src/athletes/athlete-identity.service');

async function main() {
  const prisma = new PrismaClient();
  const identity = new AthleteIdentityService();
  const prefix = `IDENTITY_TEST_${randomUUID()}`;
  const createdIds = [];
  const rollback = new Error('TEST_ROLLBACK');
  try {
    const countries = await prisma.country.findMany({ take: 2, select: { id: true } });
    assert(countries.length === 2);
    const input = {
      fullName: `${prefix} Nguyễn An`, birthDate: new Date('2001-04-03'), gender: 'MALE',
      countryId: countries[0].id, identityType: 'CCCD', documentNumber: `990${randomInt(100000000, 999999999)}`,
      phone: '0901234567', address: '12 Đường A, Hà Nội',
    };
    const make = (tx, value) => tx.athlete.create({ data: {
      firstName: value.fullName, lastName: 'Test', fullName: value.fullName,
      birthDate: value.birthDate, gender: value.gender, countryId: value.countryId,
      phone: value.phone, identity: { create: identity.normalize(value) },
    } });
    const isDuplicate = (error) => error.getStatus?.() === 409 && error.getResponse().code === 'DUPLICATE_ATHLETE';
    try {
      await prisma.$transaction(async (tx) => {
        await identity.lock(tx);
        const athlete = await make(tx, input);
        await assert.rejects(identity.assertNew(tx, { ...input, fullName: 'Different name', birthDate: new Date('1990-01-01') }), isDuplicate);
        await assert.rejects(identity.assertNew(tx, { ...input, documentNumber: undefined, fullName: `  ${input.fullName.toUpperCase()}  `, address: '  12 Đường A,   Hà Nội ' }), isDuplicate);
        await assert.rejects(identity.assertNew(tx, { ...input, documentNumber: undefined, address: undefined, phone: '+84 901 234 567' }), isDuplicate);
        await identity.assertNew(tx, { ...input, documentNumber: undefined, fullName: `${prefix} Another athlete`, address: undefined });
        await identity.assertNew(tx, input, athlete.id);
        await assert.rejects(identity.assertNew(tx, { ...input, documentNumber: '123' }));
        const passport = { ...input, identityType: 'PASSPORT', documentNumber: 'TEST12345', fullName: `${prefix} Passport` };
        await make(tx, passport);
        await identity.assertNew(tx, { ...passport, countryId: countries[1].id, fullName: `${prefix} Other country` });
        const legacy = await tx.athlete.create({ data: {
          firstName: 'Legacy', lastName: 'Test', fullName: `${prefix} Legacy`, birthDate: input.birthDate,
          gender: input.gender, countryId: input.countryId,
          media: { create: { type: 'CCCD_FRONT', data: Buffer.from('test-only'), mimeType: 'image/jpeg', size: 9,
            ocrData: { confirmedFields: { documentNumber: '991 123 456 789' } } } },
        } });
        await assert.rejects(identity.assertNew(tx, { ...input, fullName: 'Changed name', documentNumber: '991123456789' }), isDuplicate);
        const oldProfile = await tx.athlete.create({ data: {
          firstName: 'Old', lastName: 'Test', fullName: `${prefix} Old`, birthDate: input.birthDate,
          gender: input.gender, countryId: input.countryId,
        } });
        await assert.rejects(identity.assertNew(tx, { ...input, fullName: oldProfile.fullName, documentNumber: undefined, phone: undefined, address: undefined }), isDuplicate);
        throw rollback;
      }, { timeout: 30000 });
    } catch (error) { if (error !== rollback) throw error; }
    assert.equal(await prisma.athlete.count({ where: { fullName: { startsWith: prefix } } }), 0);

    const concurrent = await Promise.allSettled([0, 1].map(() => prisma.$transaction(async (tx) => {
      await identity.lock(tx);
      await identity.assertNew(tx, input);
      const athlete = await make(tx, input);
      createdIds.push(athlete.id);
      return athlete.id;
    }, { maxWait: 10000, timeout: 30000 })));
    assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(concurrent.filter((result) => result.status === 'rejected' && isDuplicate(result.reason)).length, 1);
    const api = await fetch('http://127.0.0.1:4000/api/participant-auth/identity/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, birthDate: '2001-04-03' }),
    });
    assert.equal(api.status, 409);
    const body = await api.json();
    assert.equal(body.code, 'DUPLICATE_ATHLETE');
    assert(!JSON.stringify(body).includes(input.documentNumber));
    assert(!JSON.stringify(body).includes(createdIds[0]));
    const register = await fetch('http://127.0.0.1:4000/api/participant-auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        email: `${randomUUID()}@identity-test.invalid`, password: randomUUID(), displayName: input.fullName,
        phone: input.phone, gender: input.gender, birthDate: '2001-04-03', countryId: input.countryId,
      }),
    });
    assert.equal(register.status, 409);
    assert.equal(await prisma.athlete.count({ where: { fullName: { startsWith: prefix } } }), 1);
    console.log('Passed: documents, normalized personal data, shared phone, passport country scope, legacy OCR, self exclusion, rollback, concurrent submissions and live API privacy.');
  } finally {
    if (createdIds.length) await prisma.athlete.deleteMany({ where: { id: { in: createdIds }, fullName: { startsWith: prefix } } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
