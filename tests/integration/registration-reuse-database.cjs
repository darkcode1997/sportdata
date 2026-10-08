// Run in the local backend container. No emails, notifications or real gateway requests are sent.
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const backendRequire = require('node:module').createRequire(require('node:path').resolve('apps/backend/package.json'));
const { JwtService } = backendRequire('@nestjs/jwt');
const { AthleteIdentityService } = require('./apps/backend/dist/src/athletes/athlete-identity.service');
const { ParticipantsService } = require('./apps/backend/dist/src/participants/participants.service');
const { PaymentsService } = require('./apps/backend/dist/src/payments/payments.service');
const { TicketPdfService } = require('./apps/backend/dist/src/participants/ticket-pdf.service');

async function main() {
  const prisma = new PrismaClient();
  const prefix = `REUSE_TEST_${randomUUID()}`;
  const events = [];
  let athleteId, categoryId;
  const identity = new AthleteIdentityService();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET || 'sportdata-dev-secret-change-me-please' });
  const settings = { get: async () => ({ values: { identityOcrEnabled: false } }) };
  const notifications = { notifyRegistration: async () => {} };
  const service = new ParticipantsService(prisma, jwt, {}, { send: async () => false }, settings, notifications, identity);
  try {
    const country = await prisma.country.findFirstOrThrow();
    const sport = await prisma.sport.findFirstOrThrow();
    categoryId = (await prisma.category.create({ data: { name: prefix, sportId: sport.id, gender: 'MALE', minWeight: 50, maxWeight: 70 } })).id;
    const input = { fullName: prefix, gender: 'MALE', birthDate: new Date('2000-01-01'), countryId: country.id,
      phone: '0901234567', identityType: 'CCCD', documentNumber: `990${randomInt(100000000, 999999999)}` };
    const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');
    athleteId = (await prisma.athlete.create({ data: {
      firstName: prefix, lastName: 'Test', fullName: prefix, gender: 'MALE', birthDate: input.birthDate,
      countryId: country.id, phone: input.phone, identity: { create: identity.normalize(input) },
      media: { create: ['AVATAR', 'CCCD_FRONT', 'CCCD_BACK'].map((type) => ({ type, data: image,
        mimeType: 'image/png', size: image.length, verificationStatus: type === 'AVATAR' ? null : 'VERIFIED' })) },
    } })).id;
    const createEvent = async (paymentMode) => {
      const event = await prisma.event.create({ data: { name: prefix, sportId: sport.id,
        startDate: new Date('2030-01-01'), endDate: new Date('2030-01-02'), isPublished: true,
        registrationEnabled: true, paymentMode, registrationFee: paymentMode === 'FREE' ? 0 : 50000,
        categories: { connect: { id: categoryId } } } });
      events.push(event.id);
      return event.id;
    };
    const freeEvent = await createEvent('FREE');
    const lookupInput = { eventId: freeEvent, identityType: input.identityType, documentNumber: input.documentNumber, countryId: country.id };
    const concealed = await service.lookupAthlete(lookupInput);
    assert.equal(concealed.status, 'VERIFY_CONTACT');
    assert(!JSON.stringify(concealed).includes(prefix));
    const lookup = await service.lookupAthlete({ ...lookupInput, phone: input.phone });
    assert.equal(lookup.status, 'FOUND');
    assert.equal(lookup.athlete.hasIdentity, true);
    assert.equal(lookup.athlete.hasAvatar, true);
    const personal = await service.lookupAthlete({ ...lookupInput, fullName: prefix, birthDate: '2000-01-01' });
    assert.equal(personal.status, 'FOUND');
    const payloadFor = (eventId, token) => ({ eventId, contactName: 'Test contact', contactEmail: `${randomUUID()}@reuse-test.invalid`,
      contactPhone: input.phone, athletes: [{ fullName: prefix, birthDate: '2000-01-01', gender: 'MALE', countryId: country.id,
        categoryId, documentNumber: input.documentNumber, identityType: 'CCCD', reuseToken: token, profileConfirmed: true }] });
    const payload = payloadFor(freeEvent, lookup.reuseToken);
    await assert.rejects(service.createGuestRegistrations(JSON.stringify({ ...payload,
      athletes: [{ ...payload.athletes[0], profileConfirmed: false }] }), []));
    const concurrent = await Promise.all([0, 1].map(() => service.createGuestRegistrations(JSON.stringify(payload), [])));
    assert.equal(concurrent[0].registrations[0].athleteId, athleteId);
    assert.equal(concurrent[0].registrations[0].ticketCode, concurrent[1].registrations[0].ticketCode);
    assert.equal(await prisma.eventRegistration.count({ where: { eventId: freeEvent } }), 1);
    assert.equal(await prisma.registrationSubmission.count({ where: { eventId: freeEvent } }), 1);
    assert.equal(await prisma.athlete.count({ where: { fullName: prefix } }), 1);
    const registered = await service.lookupAthlete({ ...lookupInput, phone: input.phone });
    assert.equal(registered.status, 'REGISTERED');
    const freeTicket = await service.getTicket(registered.registration.ticketCode, true);
    assert.equal(freeTicket.isValid, true);
    const pdf = await new TicketPdfService().generate([{ ...freeTicket, assets: { ...freeTicket.assets, avatarData: null } }]);
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    const paidEvent = await createEvent('MANUAL');
    await assert.rejects(service.createGuestRegistrations(JSON.stringify({ ...payload, eventId: paidEvent }), []));
    const paidLookup = await service.lookupAthlete({ ...lookupInput, eventId: paidEvent, phone: input.phone });
    const paidRegistration = await service.createGuestRegistrations(JSON.stringify(payloadFor(paidEvent, paidLookup.reuseToken)), []);
    assert.equal(paidRegistration.registrations[0].paymentStatus, 'PENDING');
    const registrationId = paidRegistration.registrations[0].id;
    const transaction = await prisma.paymentTransaction.create({ data: { registrationId, provider: 'BANK_QR', orderId: randomUUID(), amount: 50000 } });
    const payments = new PaymentsService(prisma, settings, notifications, service);
    await payments.markPaid(transaction.id, 'TEST_PAYMENT', { test: true });
    await payments.markPaid(transaction.id, 'TEST_PAYMENT', { test: true });
    const paidTicket = await service.getTicket(paidRegistration.registrations[0].ticketCode);
    assert.equal(paidTicket.paymentStatus, 'PAID');
    assert.equal(paidTicket.status, 'CONFIRMED');
    assert.equal(paidTicket.isValid, true);
    assert.equal(await prisma.registrationStatusHistory.count({ where: { registrationId } }), 1);
    assert.equal(await prisma.competitionEntry.count({ where: { eventId: paidEvent, athleteId } }), 1);
    const anonymous = await fetch('http://127.0.0.1:4000/api/participant-auth/identity/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lookupInput),
    });
    assert.equal(anonymous.status, 201);
    assert.equal((await anonymous.json()).status, 'VERIFY_CONTACT');
    console.log('Passed: immediate lookup privacy, confirmation, profile reuse without uploads/weight, concurrent retries, one ticket, scoped tokens, payment confirmation and PDF output.');
  } finally {
    for (const id of events) await prisma.event.deleteMany({ where: { id, name: prefix } });
    if (athleteId) await prisma.athlete.deleteMany({ where: { id: athleteId, fullName: prefix } });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId, name: prefix } });
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
