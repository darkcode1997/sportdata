// Run from the repository root with the local Docker stack:
// Get-Content -Raw tests/integration/registration-delete.cjs | docker compose exec -T -w /app/apps/backend backend node
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');

const prisma = new PrismaClient();
const prefix = `delete-check-${randomUUID()}`;
const userIds = [];
const athleteIds = [];
let eventId;

async function main() {
  assert.equal(new URL(process.env.DATABASE_URL).hostname, 'postgres', 'Use the local Docker database');
  const category = await prisma.category.findFirstOrThrow();
  const country = await prisma.country.findFirstOrThrow();
  const event = await prisma.event.create({ data: {
    name: prefix, sportId: category.sportId, startDate: new Date('2035-01-01'),
    endDate: new Date('2035-01-02'), categories: { connect: { id: category.id } },
  } });
  eventId = event.id;
  const tokens = {};
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  for (const role of ['ADMIN', 'GAMES_ADMIN', 'READ_ONLY']) {
    const user = await prisma.user.create({ data: {
      email: `${prefix}-${role}@sportdata.test`, username: `${prefix}-${role}`,
      name: prefix, role, password: randomUUID(),
    } });
    userIds.push(user.id);
    tokens[role] = jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '5m' });
  }
  const fixtures = [];
  for (let index = 0; index < 2; index++) {
    const athlete = await prisma.athlete.create({ data: {
      firstName: 'Test', lastName: prefix, fullName: `${prefix}-${index}`,
      gender: 'MALE', countryId: country.id,
    } });
    athleteIds.push(athlete.id);
    const registration = await prisma.eventRegistration.create({ data: {
      eventId, categoryId: category.id, athleteId: athlete.id,
      ticketCode: `${prefix}-${index}`, status: 'CONFIRMED', paymentStatus: 'PAID',
    } });
    const entry = await prisma.competitionEntry.create({ data: {
      eventId, categoryId: category.id, athleteId: athlete.id, countryId: country.id,
      type: 'INDIVIDUAL', status: 'VERIFIED',
    } });
    fixtures.push({ athlete, registration, entry });
  }
  const target = fixtures[0];
  await prisma.paymentTransaction.create({ data: {
    registrationId: target.registration.id, provider: 'BANK_QR', orderId: prefix, amount: 1000,
  } });
  await prisma.registrationStatusHistory.create({ data: {
    registrationId: target.registration.id, fromStatus: 'SUBMITTED', toStatus: 'CONFIRMED', reason: prefix,
  } });
  await prisma.ticketEmailJob.create({ data: {
    to: `${prefix}@sportdata.test`, ticketCode: target.registration.ticketCode, availableAt: new Date('2035-01-01'),
  } });
  const configuration = await prisma.drawPreconfiguration.create({ data: {
    eventId, categoryId: category.id, drawType: 'MAIN_TREE',
    pairs: [{ entry1Id: target.entry.id, entry2Id: fixtures[1].entry.id }],
    options: {}, inputVersion: prefix, plan: {}, slots: [], previewedAt: new Date(),
  } });
  const remove = (id, role) => fetch(`http://127.0.0.1:4000/api/participant-auth/admin/registrations/${id}`, {
    method: 'DELETE', headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {},
  });
  assert.equal((await remove(target.registration.id)).status, 401);
  assert.equal((await remove(target.registration.id, 'READ_ONLY')).status, 403);
  const draw = await prisma.draw.create({ data: { name: prefix, eventId, categoryId: category.id, type: 'MAIN_TREE' } });
  assert.equal((await remove(target.registration.id, 'ADMIN')).status, 409);
  assert.ok(await prisma.eventRegistration.findUnique({ where: { id: target.registration.id } }));
  assert.ok(await prisma.competitionEntry.findUnique({ where: { id: target.entry.id } }));
  await prisma.draw.delete({ where: { id: draw.id } });
  const response = await remove(target.registration.id, 'GAMES_ADMIN');
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  assert.equal(await prisma.eventRegistration.count({ where: { id: target.registration.id } }), 0);
  assert.equal(await prisma.competitionEntry.count({ where: { id: target.entry.id } }), 0);
  assert.equal(await prisma.paymentTransaction.count({ where: { registrationId: target.registration.id } }), 0);
  assert.equal(await prisma.registrationStatusHistory.count({ where: { registrationId: target.registration.id } }), 0);
  assert.equal(await prisma.ticketEmailJob.count({ where: { ticketCode: target.registration.ticketCode } }), 0);
  assert.ok(await prisma.athlete.findUnique({ where: { id: target.athlete.id } }));
  assert.ok(await prisma.eventRegistration.findUnique({ where: { id: fixtures[1].registration.id } }));
  const updated = await prisma.drawPreconfiguration.findUniqueOrThrow({ where: { id: configuration.id } });
  assert.deepEqual(updated.pairs, []);
  assert.equal(updated.plan, null);
  assert.equal(updated.revision, configuration.revision + 1);
  assert.equal((await remove(target.registration.id, 'ADMIN')).status, 404);
  console.log('PASS: permissions, draw protection, deletion, related data cleanup, athlete preservation and preview invalidation');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (eventId) await prisma.event.deleteMany({ where: { id: eventId } });
  await prisma.athlete.deleteMany({ where: { id: { in: athleteIds } } });
  await prisma.ticketEmailJob.deleteMany({ where: { ticketCode: { startsWith: prefix } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});
