import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const apiBase = process.env.SMOKE_API_URL || 'http://localhost:4000/api';
const email = `smoke-${randomUUID()}@example.test`;
let eventId;
let athleteId;
let accountId;

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${response.status} ${path}: ${JSON.stringify(body)}`);
  return body;
}

try {
  const sport = await prisma.sport.findFirst({
    where: { OR: [{ name: { contains: 'Jitsu', mode: 'insensitive' } }, { code: { contains: 'JJ', mode: 'insensitive' } }] },
    include: { categories: true },
  });
  if (!sport?.categories.length) throw new Error('Ju-Jitsu chưa có hạng đấu để kiểm thử.');
  const category = sport.categories[0];
  const country = await prisma.country.findFirst({ orderBy: { code: 'asc' } });
  if (!country) throw new Error('Chưa có quốc gia để kiểm thử.');

  const now = new Date();
  const startDate = new Date(now.getTime() + 10 * 86_400_000);
  const event = await prisma.event.create({
    data: {
      name: 'SMOKE TEST - JU-JITSU REGISTRATION',
      sportId: sport.id,
      sports: { connect: { id: sport.id } },
      categories: { connect: { id: category.id } },
      startDate,
      endDate: new Date(startDate.getTime() + 86_400_000),
      location: 'Local automated test',
      level: 'OPEN',
      isPublished: true,
      allowIndependentAthletes: true,
      registrationEnabled: true,
      registrationOpenAt: new Date(now.getTime() - 86_400_000),
      registrationCloseAt: new Date(now.getTime() + 86_400_000),
      registrationFee: 0,
      registrationCurrency: 'VND',
      paymentMode: 'FREE',
    },
  });
  eventId = event.id;

  let age = category.minAge ?? 20;
  if (category.maxAge !== null && age > category.maxAge) age = category.maxAge;
  let weight = 65;
  if (category.minWeight !== null && category.maxWeight !== null) weight = (category.minWeight + category.maxWeight) / 2;
  else if (category.minWeight !== null) weight = category.minWeight + 1;
  else if (category.maxWeight !== null) weight = Math.max(1, category.maxWeight - 1);

  const session = await api('/participant-auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'SmokeTest@2026!',
      displayName: 'Vận Động Viên Kiểm Thử',
      gender: category.gender === 'MIXED' ? 'MALE' : category.gender,
      birthDate: new Date(Date.UTC(startDate.getUTCFullYear() - age, startDate.getUTCMonth(), startDate.getUTCDate() - 1)).toISOString(),
      countryId: country.id,
      weight,
    }),
  });
  accountId = session.account.id;
  const authorization = { Authorization: `Bearer ${session.accessToken}` };
  const profile = await api('/participant-auth/me', { headers: authorization });
  athleteId = profile.athlete.id;

  const image = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
  for (const type of ['CCCD_FRONT', 'CCCD_BACK']) {
    const form = new FormData();
    form.append('file', new Blob([image], { type: 'image/png' }), `${type}.png`);
    await api(`/participant-auth/me/media/${type}`, { method: 'POST', headers: authorization, body: form });
  }

  const registration = await api('/participant-auth/registrations', {
    method: 'POST',
    headers: authorization,
    body: JSON.stringify({ eventId, categoryId: category.id }),
  });
  const tickets = await api('/participant-auth/registrations', { headers: authorization });
  const competitionEntry = await prisma.competitionEntry.findFirst({
    where: { eventId, categoryId: category.id, athleteId },
  });
  if (registration.status !== 'CONFIRMED' || !registration.ticketCode || tickets.length !== 1 || competitionEntry?.status !== 'VERIFIED') {
    throw new Error('Không nhận được vé đã xác nhận.');
  }
  console.log(`PASS: registration=${registration.status}, entry=${competitionEntry.status}, ticket generated`);
} finally {
  if (eventId) await prisma.event.delete({ where: { id: eventId } }).catch(() => undefined);
  if (athleteId) await prisma.athlete.delete({ where: { id: athleteId } }).catch(() => undefined);
  if (accountId) await prisma.participantAccount.delete({ where: { id: accountId } }).catch(() => undefined);
  await prisma.$disconnect();
}
