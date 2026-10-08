const { execFileSync } = require('child_process');
const { Client } = require('pg');
const { preserveLegacyFiles } = require('./preserve-legacy-files.cjs');
const { migrateStorage } = require('./migrate-storage-r2.cjs');

async function deploy() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Preview/development: production database and files are unchanged.');
    return;
  }
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(872341902)');
    await preserveLegacyFiles(client);
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'deploy'], { stdio: 'inherit' });
    await migrateStorage({ apply: true, client });
  } finally {
    await client.query('SELECT pg_advisory_unlock(872341902)').catch(() => {});
    await client.end();
  }
}
deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
