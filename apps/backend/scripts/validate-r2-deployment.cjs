const { SystemSettingsService } = require('../dist/src/system-settings/system-settings.service');
const { validateR2Options } = require('../dist/src/storage/r2-storage.provider');

const names = [
  'STORAGE_R2_BUCKET', 'STORAGE_R2_ACCOUNT_ID', 'STORAGE_R2_ENDPOINT',
  'STORAGE_R2_ACCESS_KEY_ID', 'STORAGE_R2_SECRET_ACCESS_KEY',
];

async function validateR2Deployment(client) {
  // Read overrides without depending on the pre-migration Prisma schema.
  const table = await client.query(`SELECT to_regclass('public."IntegrationSetting"') AS name`);
  const rows = table.rows[0].name
    ? (await client.query('SELECT name, value FROM "IntegrationSetting" WHERE name = ANY($1::text[])', [names])).rows
    : [];
  const settings = new SystemSettingsService({ integrationSetting: { findMany: async () => rows } });
  const values = await settings.integrationValues(names);
  const missing = ['STORAGE_R2_BUCKET', 'STORAGE_R2_ACCESS_KEY_ID', 'STORAGE_R2_SECRET_ACCESS_KEY']
    .filter(name => !values[name]?.trim());
  if (!values.STORAGE_R2_ACCOUNT_ID?.trim() && !values.STORAGE_R2_ENDPOINT?.trim()) {
    missing.push('STORAGE_R2_ACCOUNT_ID (or STORAGE_R2_ENDPOINT)');
  }
  if (missing.length) {
    throw new Error(`Missing R2 configuration: ${missing.join(', ')}. `
      + 'Set these in Vercel project sportdata-api > Settings > Environment Variables > Production, then redeploy. '
      + 'The local .env and local CMS settings are not automatically copied to Vercel. Database migrations have not run.');
  }
  validateR2Options({ bucket: values.STORAGE_R2_BUCKET.trim(), accountId: values.STORAGE_R2_ACCOUNT_ID?.trim(),
    endpoint: values.STORAGE_R2_ENDPOINT?.trim(), accessKeyId: values.STORAGE_R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: values.STORAGE_R2_SECRET_ACCESS_KEY.trim() });
}

module.exports = { validateR2Deployment };
