// Set MARKETING_TEST_DATABASE_URL to a local disposable PostgreSQL database.
// Builds an isolated schema, applies real migrations, and drops only that schema.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
const { MarketingService } = require('../dist/src/marketing/marketing.service');
const { MarketingWorkerService } = require('../dist/src/marketing/marketing-worker.service');
const { ArticlesService } = require('../dist/src/articles/articles.service');
const { EventsService } = require('../dist/src/events/events.service');

const databaseUrl = process.env.MARKETING_TEST_DATABASE_URL;
test('real publication outbox, recipient filters, rollback, concurrent claims and lease recovery', { skip: !databaseUrl }, async () => {
  const url = new URL(databaseUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only local disposable PostgreSQL is allowed');
  const schema = `marketing_test_${randomUUID().replaceAll('-', '')}`;
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  url.searchParams.set('schema', schema);
  const prisma = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  let created = false;
  try {
    await client.connect();
    await client.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    execFileSync(process.execPath, [
      require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', resolve(__dirname, '../prisma/schema.prisma'),
    ], { env: { ...process.env, DATABASE_URL: url.toString() }, stdio: 'pipe' });
    const marketing = new MarketingService(prisma);
    const worker = new MarketingWorkerService(prisma, marketing, { integrationValues: async () => ({}) });
    const articles = new ArticlesService(prisma, marketing, { kick() {} });
    const events = new EventsService(prisma, {}, marketing, { kick() {} });
    const accounts = [];
    for (const [index, overrides] of [
      { marketingArticles: false }, { marketingEvents: false }, {},
      { marketingEnabled: false }, { isActive: false }, { verificationStatus: 'PENDING' },
    ].entries()) {
      accounts.push(await prisma.participantAccount.create({ data: {
        email: `marketing-${index}@example.test`, displayName: `Test ${index}`, password: 'not-a-login-password',
        marketingEnabled: true, marketingConsentAt: new Date(Date.now() - 60000), ...overrides,
      } }));
    }
    assert.equal(new Set(accounts.map(account => account.marketingToken)).size, 6);
    const draft = await articles.create({ title: 'Draft test', content: '<p>Content</p>' });
    assert.equal(await prisma.marketingCampaign.count(), 0, 'drafts must not enqueue');
    await articles.update(draft.id, { isPublished: true });
    const articleCampaign = await prisma.marketingCampaign.findFirst({ where: { kind: 'ARTICLE' } });
    const articleRecipients = await prisma.marketingDelivery.findMany({ where: { campaignId: articleCampaign.id } });
    assert.deepEqual(articleRecipients.map(job => job.accountId).sort(), [accounts[1].id, accounts[2].id].sort());
    await articles.update(draft.id, { title: 'Edited' });
    await articles.update(draft.id, { isPublished: false });
    await articles.update(draft.id, { isPublished: true });
    assert.equal(await prisma.marketingCampaign.count(), 1, 'edits and republishing must not duplicate');
    const sport = await prisma.sport.create({ data: { name: 'Marketing Test Sport', code: 'MARKETING_TEST' } });
    const event = await events.create({
      name: 'Test event', sportId: sport.id, startDate: '2027-01-01T00:00:00Z', endDate: '2027-01-02T00:00:00Z', isPublished: true,
    });
    const eventCampaign = await prisma.marketingCampaign.findFirst({ where: { kind: 'EVENT' } });
    const eventRecipients = await prisma.marketingDelivery.findMany({ where: { campaignId: eventCampaign.id } });
    assert.deepEqual(eventRecipients.map(job => job.accountId).sort(), [accounts[0].id, accounts[2].id].sort());
    await events.update(event.id, { name: 'Updated test event' });
    assert.equal(await prisma.marketingCampaign.count(), 2);

    await assert.rejects(prisma.$transaction(async tx => {
      const article = await tx.article.create({ data: { title: 'Rollback', slug: 'rollback', content: 'No send', isPublished: true } });
      await marketing.enqueuePublication(tx, { id: article.id, kind: 'ARTICLE', title: article.title, path: '/news/rollback' });
      throw new Error('rollback');
    }), /rollback/);
    assert.equal(await prisma.article.count({ where: { slug: 'rollback' } }), 0);
    assert.equal(await prisma.marketingCampaign.count(), 2);

    await marketing.setCampaignStatus(eventCampaign.id, false);
    const claims = await Promise.all([worker.claim(), worker.claim()]);
    assert.ok(claims.every(job => job && job.campaignId === articleCampaign.id));
    assert.notEqual(claims[0].id, claims[1].id);
    assert.equal(await worker.claim(), undefined, 'paused campaign must not be claimed');
    await worker.finish(claims[0], 'SENT');
    await prisma.marketingDelivery.update({ where: { id: claims[1].id }, data: { lockedAt: new Date(Date.now() - 360000) } });
    const recovered = await worker.claim();
    assert.equal(recovered.id, claims[1].id);
    assert.equal(recovered.attempts, 2);
    assert.notEqual(recovered.lockToken, claims[1].lockToken);
    assert.equal((await worker.finish(claims[1], 'SENT')).count, 0, 'expired lease cannot finish a new claim');
    await worker.finish(recovered, 'FAILED');
    assert.equal((await marketing.retryFailed(articleCampaign.id)).count, 1);
    assert.equal(await prisma.marketingDelivery.count({ where: { status: 'SENT' } }), 1, 'retry must not requeue sent emails');
    const lastAttempt = await worker.claim();
    await prisma.marketingDelivery.update({ where: { id: lastAttempt.id }, data: { attempts: 5, lockedAt: new Date(Date.now() - 360000) } });
    assert.equal(await worker.claim(), undefined);
    assert.equal((await prisma.marketingDelivery.findUnique({ where: { id: lastAttempt.id } })).status, 'FAILED');

    const oldToken = accounts[0].marketingToken;
    await marketing.unsubscribe(oldToken);
    assert.equal((await marketing.preferences(accounts[0].id)).marketingEnabled, false);
    await marketing.updatePreferences(accounts[0].id, { marketingEnabled: true });
    await marketing.unsubscribe(oldToken);
    assert.equal((await marketing.preferences(accounts[0].id)).marketingEnabled, true, 'old token must not opt out renewed consent');
    const list = await marketing.listUsers({ page: 1, limit: 20, search: 'marketing-0' });
    assert.equal(list.total, 1);
    assert.ok(!('password' in list.items[0]));
    assert.ok(!('marketingToken' in list.items[0]));
    assert.ok((await marketing.campaigns()).every(campaign => campaign.counts));
  } finally {
    await prisma.$disconnect();
    if (created) await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
});
