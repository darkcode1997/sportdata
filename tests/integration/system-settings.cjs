// Run after npm run build:backend. Uses an isolated in-memory database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { SystemSettingsService } = require('../../apps/backend/dist/src/system-settings/system-settings.service');

async function main() {
  process.env.SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  process.env.SMTP_HOST = 'env.example.test';
  const rows = new Map();
  const prisma = {
    integrationSetting: {
      findMany: async () => [...rows].map(([name, value]) => ({ name, value })),
      upsert: (args) => () => rows.set(args.where.name, args.update.value),
      deleteMany: (args) => () => rows.delete(args.where.name),
    },
    $transaction: async (operations) => operations.forEach((operation) => operation()),
  };
  const service = new SystemSettingsService(prisma);
  await service.updateIntegrations({ SMTP_HOST: 'cms.example.test', SMTP_PASSWORD: 'test-secret' });
  assert.equal((await service.integrationValues()).SMTP_HOST, 'cms.example.test');
  assert.equal((await service.integrationValues()).SMTP_PASSWORD, 'test-secret');
  assert(!rows.get('SMTP_PASSWORD').includes('test-secret'));
  assert(!JSON.stringify(await service.integrations()).includes('test-secret'));
  await assert.rejects(service.updateIntegrations({ DATABASE_URL: 'blocked' }));
  await assert.rejects(service.updateIntegrations({ SMTP_PORT: '70000' }));
  await assert.rejects(service.updateIntegrations({ SMTP_SECURE: 'yes' }));
  await assert.rejects(service.updateIntegrations({ MOMO_API_URL: 'http://example.test' }));
  await assert.rejects(service.updateIntegrations({ SMTP_USER: 123 }));
  await assert.rejects(service.updateIntegrations({ SMTP_HOST: 'must-not-save', UNKNOWN: 'invalid' }));
  assert.equal((await service.integrationValues()).SMTP_HOST, 'cms.example.test');
  await service.updateIntegrations({ SMTP_HOST: null });
  assert.equal((await service.integrationValues()).SMTP_HOST, 'env.example.test');
  const ciphertext = rows.get('SMTP_PASSWORD');
  rows.set('MOMO_SECRET_KEY', ciphertext);
  await assert.rejects(service.integrationValues());
  rows.delete('MOMO_SECRET_KEY');
  rows.set('SMTP_PASSWORD', ciphertext.slice(0, -4) + 'AAAA');
  await assert.rejects(service.integrationValues());
  rows.set('SMTP_PASSWORD', ciphertext);
  process.env.SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  await assert.rejects(service.integrationValues());
  delete process.env.SETTINGS_ENCRYPTION_KEY;
  process.env.JWT_SECRET = 'sportdata-dev-secret-change-me-please';
  await assert.rejects(service.updateIntegrations({ SMTP_PASSWORD: 'new-secret' }));
  await service.updateIntegrations({ SMTP_PASSWORD: null });
  assert.equal(rows.has('SMTP_PASSWORD'), false);
  console.log('Integration settings: encryption, masking, fallback, validation, atomic rejection and tamper checks passed.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
