// Build first. Uses in-memory fixtures and a fake SMTP transport only.
const assert = require('node:assert/strict');
const { test } = require('node:test');
require('reflect-metadata');
const { MarketingService } = require('../dist/src/marketing/marketing.service');
const { MarketingWorkerService } = require('../dist/src/marketing/marketing-worker.service');
const { marketingTemplate } = require('../dist/src/marketing/marketing-template');

process.env.FRONTEND_URL = 'https://sportdata.example.test';
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.VERCEL_ENV = 'production';

test('email escapes content, rejects unsafe images and includes opt-out links', () => {
  const rendered = marketingTemplate({
    name: '<script>alert(1)</script>', title: 'Event\r\nBcc: attack',
    summary: '<b>unsafe</b>', kind: 'EVENT', imageUrl: 'javascript:alert(1)',
    url: 'https://sportdata.example.test/events/1', unsubscribeUrl: 'https://sportdata.example.test/email/unsubscribe?token=test',
  });
  assert.ok(!rendered.html.includes('<script>'));
  assert.ok(rendered.html.includes('&lt;script&gt;'));
  assert.ok(!rendered.html.includes('javascript:'));
  assert.ok(!/[\r\n]/.test(rendered.subject));
  assert.ok(rendered.html.includes('Hủy đăng ký'));
  assert.ok(rendered.text.includes('/email/unsubscribe?token=test'));
});

test('repeated publication does not create another audience snapshot', async () => {
  let created = false;
  let queued = 0;
  const tx = {
    marketingCampaign: { createMany: async ({ data, skipDuplicates }) => {
      assert.equal(skipDuplicates, true);
      assert.equal(data.summary, 'Hello everyone');
      if (created) return { count: 0 };
      created = true;
      return { count: 1 };
    } },
    $executeRaw: async (strings, ...values) => {
      queued++;
      const text = strings.join(' ') + values.map(value => value?.text || '').join(' ');
      assert.ok(text.includes('"marketingEnabled" = true'));
      assert.ok(text.includes('"marketingEvents"'));
      assert.ok(text.includes('"verificationStatus"'));
      assert.ok(text.includes('ON CONFLICT'));
    },
  };
  const service = new MarketingService({});
  const source = { id: '1', kind: 'EVENT', title: 'Event', summary: '<p>Hello</p> everyone', path: '/events/1' };
  await service.enqueuePublication(tx, source);
  await service.enqueuePublication(tx, source);
  assert.equal(queued, 1);
});

test('renewed consent rotates unsubscribe token; existing consent date is preserved', async () => {
  const previousDate = new Date('2026-01-01');
  let previous = { marketingEnabled: false, marketingConsentAt: previousDate };
  let saved;
  const service = new MarketingService({ participantAccount: {
    findUnique: async () => previous,
    update: async ({ data }) => { saved = data; return data; },
  } });
  await service.updatePreferences('account', { marketingEnabled: true });
  assert.ok(saved.marketingToken);
  assert.ok(saved.marketingConsentAt > previousDate);
  previous = { marketingEnabled: true, marketingConsentAt: previousDate };
  await service.updatePreferences('account', { marketingEnabled: true, marketingEvents: false });
  assert.equal(saved.marketingToken, undefined);
  assert.equal(saved.marketingConsentAt, previousDate);
  await service.updatePreferences('account', { marketingEnabled: false });
  assert.ok(saved.marketingUnsubscribedAt instanceof Date);
});

function fixture(overrides = {}) {
  return {
    id: 'delivery', attempts: 1, lockToken: 'lease', campaignId: 'campaign',
    account: {
      email: 'test@example.test', displayName: 'Người dùng', isActive: true, verificationStatus: 'VERIFIED',
      marketingEnabled: true, marketingEvents: true, marketingArticles: true,
      marketingConsentAt: new Date('2026-01-01'), marketingToken: 'random-token',
      ...overrides,
    },
    campaign: { kind: 'EVENT', sourceId: 'event', createdAt: new Date('2026-02-01'), enabled: true, title: 'Event', summary: 'Intro', path: '/events/event' },
  };
}

function workerFor(items, { source = { isPublished: true }, enabled = true, smtp = true } = {}) {
  const updates = [];
  const pending = [...items];
  const worker = new MarketingWorkerService({
    marketingDelivery: {
      findUnique: async ({ where }) => items.find(item => item.id === where.id),
      updateMany: async query => { updates.push(query); return { count: 1 }; },
    },
    event: { findUnique: async () => source }, article: { findUnique: async () => source },
  }, { automationEnabled: async () => enabled }, {
    integrationValues: async () => smtp ? { SMTP_HOST: 'fixture.invalid', SMTP_FROM: 'SportData <test@example.test>' } : {},
  });
  worker.claim = async () => pending.shift();
  worker.createTransport = () => ({ sendMail: async () => assert.fail('Unexpected email send'), close() {} });
  return { worker, updates, pending };
}

test('worker sends opted-in email with individual recipient and one-click headers', async () => {
  const sent = [];
  const { worker, updates } = workerFor([fixture()]);
  worker.createTransport = () => ({ sendMail: async mail => sent.push(mail), close() {} });
  assert.deepEqual(await worker.drain(), { processed: 1, ready: true });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'test@example.test');
  assert.equal(sent[0].headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(sent[0].headers['List-Unsubscribe'].includes('/api/marketing/unsubscribe?token=random-token'));
  assert.equal(updates[0].data.status, 'SENT');
  assert.equal(updates[0].where.lockToken, 'lease');
});

test('worker rechecks unsubscribe, account status, topics, renewed consent and publication', async () => {
  const variants = [
    { marketingEnabled: false }, { isActive: false }, { marketingEvents: false },
    { verificationStatus: 'PENDING' }, { marketingConsentAt: new Date('2026-03-01') },
  ];
  const items = variants.map((variant, index) => ({ ...fixture(variant), id: `delivery-${index}` }));
  const { worker, updates } = workerFor(items);
  await worker.drain();
  assert.equal(updates.length, variants.length);
  assert.ok(updates.every(update => update.data.status === 'SKIPPED'));
  const unpublished = workerFor([fixture()], { source: { isPublished: false } });
  await unpublished.worker.drain();
  assert.equal(unpublished.updates[0].data.status, 'SKIPPED');
});

test('paused automation or missing SMTP leaves jobs pending', async () => {
  for (const settings of [{ enabled: false }, { smtp: false }]) {
    const { worker, pending, updates } = workerFor([fixture()], settings);
    assert.deepEqual(await worker.drain(), { processed: 0, ready: false });
    assert.equal(pending.length, 1);
    assert.equal(updates.length, 0);
  }
});

test('SMTP failures back off, stop at five attempts and never expose secrets in errors', async () => {
  const items = [fixture(), { ...fixture(), id: 'last-attempt', attempts: 5 }];
  const { worker, updates } = workerFor(items);
  worker.createTransport = () => ({ sendMail: async () => { throw Object.assign(new Error('password=private recipient=test@example.test'), { code: 'EAUTH' }); }, close() {} });
  const started = Date.now();
  await worker.drain();
  assert.equal(updates[0].data.status, 'PENDING');
  assert.ok(updates[0].data.availableAt.getTime() >= started + 60000);
  assert.equal(updates[1].data.status, 'FAILED');
  assert.equal(updates[1].data.lastError, 'Email delivery failed (EAUTH)');
});

test('future publication is deferred without consuming a delivery attempt', async () => {
  const item = fixture();
  item.campaign.kind = 'ARTICLE';
  const publishedAt = new Date(Date.now() + 60000);
  const { worker, updates } = workerFor([item], { source: { isPublished: true, publishedAt, slug: 'future' } });
  await worker.drain();
  assert.equal(updates[0].data.status, 'PENDING');
  assert.equal(updates[0].data.availableAt, publishedAt);
  assert.deepEqual(updates[0].data.attempts, { decrement: 1 });
});

test('marketing APIs enforce CMS role, participant identity, cron secret and validated payloads', async () => {
  const { NestFactory } = require('@nestjs/core');
  const { Module, Global, ValidationPipe } = require('@nestjs/common');
  const { ConfigModule } = require('@nestjs/config');
  const { JwtService } = require('@nestjs/jwt');
  const { MarketingModule } = require('../dist/src/marketing/marketing.module');
  const { PrismaService } = require('../dist/src/prisma/prisma.service');
  process.env.JWT_SECRET = 'test-marketing-jwt-secret-with-enough-characters';
  process.env.CRON_SECRET = 'test-only-cron-secret';
  process.env.VERCEL_ENV = 'preview';
  const fakePrisma = {
    integrationSetting: { findUnique: async () => null, findMany: async () => [] },
    user: { findUnique: async ({ where }) => ({
      id: where.id, name: 'Test', email: 'cms@example.test', isActive: true,
      role: where.id === 'admin' ? 'ADMIN' : 'CONTENT', permissions: [], passwordChangedAt: null,
    }) },
    participantAccount: {
      findUnique: async () => ({ id: 'participant', email: 'test@example.test', isActive: true, marketingEnabled: false }),
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [], count: async () => 0,
    },
  };
  class MockPrismaModule {}
  Global()(MockPrismaModule);
  Module({ providers: [{ provide: PrismaService, useValue: fakePrisma }], exports: [PrismaService] })(MockPrismaModule);
  class TestModule {}
  Module({ imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), MockPrismaModule, MarketingModule] })(TestModule);
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(0, '127.0.0.1');
  try {
    const base = await app.getUrl();
    const jwt = app.get(JwtService);
    const token = (id, type) => jwt.sign({ sub: id, ...(type ? { type } : {}) });
    const get = (path, accessToken) => fetch(`${base}/api/marketing/${path}`, { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
    assert.equal((await get('users')).status, 401);
    assert.equal((await get('users', token('content'))).status, 403);
    assert.equal((await get('users', token('admin'))).status, 200);
    assert.equal((await get('users?limit=1000', token('admin'))).status, 400);
    assert.equal((await get('preferences', token('admin'))).status, 401);
    assert.equal((await get('preferences', token('participant', 'participant'))).status, 200);
    assert.equal((await get('cron')).status, 401);
    assert.equal((await get('cron', process.env.CRON_SECRET)).status, 200);
    assert.equal((await fetch(`${base}/api/marketing/unsubscribe?token=test`, { method: 'POST' })).status, 201);
    assert.equal((await fetch(`${base}/api/marketing/unsubscribe`, { method: 'POST' })).status, 400);
    const invalid = await fetch(`${base}/api/marketing/preferences`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token('participant', 'participant')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketingEnabled: 'true' }),
    });
    assert.equal(invalid.status, 400);
  } finally { await app.close(); }
});
