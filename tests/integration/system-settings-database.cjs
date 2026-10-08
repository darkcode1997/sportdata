// Pipe into `docker compose exec -T backend node`. All writes are rolled back.
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { SystemSettingsService } = require('./apps/backend/dist/src/system-settings/system-settings.service');
const { PaymentsService } = require('./apps/backend/dist/src/payments/payments.service');

async function main() {
  const prisma = new PrismaClient();
  const rollback = new Error('ROLLBACK_TEST');
  try {
    const before = await prisma.integrationSetting.findMany({ orderBy: { name: 'asc' } });
    try {
      await prisma.$transaction(async (tx) => {
        const database = {
          integrationSetting: tx.integrationSetting,
          systemSetting: tx.systemSetting,
          $transaction: (operations) => Promise.all(operations),
        };
        const settings = new SystemSettingsService(database);
        await settings.updateIntegrations({
          SMTP_HOST: 'smtp.test.invalid', SMTP_PASSWORD: 'temporary-test-password',
          VNPAY_TMN_CODE: 'TEST', VNPAY_HASH_SECRET: 'temporary-test-vnpay-secret',
        });
        const stored = await tx.integrationSetting.findUnique({ where: { name: 'SMTP_PASSWORD' } });
        assert(!stored.value.includes('temporary-test-password'));
        assert.equal((await settings.integrationValues()).SMTP_PASSWORD, 'temporary-test-password');
        const fields = await settings.integrations();
        assert(fields.filter((field) => field.secret).every((field) => field.value === ''));
        assert.equal((await settings.get()).configured.ticketEmailEnabled, true);
        const payments = new PaymentsService(database, settings, {});
        const input = { vnp_TmnCode: 'TEST', vnp_Amount: '10000', vnp_TxnRef: 'TESTORDER' };
        input.vnp_SecureHash = createHmac('sha512', 'temporary-test-vnpay-secret')
          .update(payments.vnpayQuery(input), 'utf8').digest('hex');
        assert.equal(await payments.verifyVnpay(input), true);
        assert.equal(await payments.verifyVnpay({ ...input, vnp_Amount: '20000' }), false);
        await settings.updateIntegrations({ SMTP_HOST: null });
        assert.equal((await settings.integrationValues()).SMTP_HOST, process.env.SMTP_HOST);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    assert.deepEqual(await prisma.integrationSetting.findMany({ orderBy: { name: 'asc' } }), before);
    console.log('Database: encrypted persistence, secret masking, immediate feature configuration, VNPAY signature verification, ENV fallback and complete rollback passed.');
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
