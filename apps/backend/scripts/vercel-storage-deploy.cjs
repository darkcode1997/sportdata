const { execFileSync } = require('child_process');
const { Client } = require('pg');
const { preserveLegacyFiles } = require('./preserve-legacy-files.cjs');
const { migrateStorage } = require('./migrate-storage-r2.cjs');
const { validateR2Deployment } = require('./validate-r2-deployment.cjs');

async function deploy() {
  if (process.env.VERCEL_ENV !== 'production') {
    console.log('Preview/development: production database and files are unchanged.');
    return;
  }
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  let locked = false;
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock(872341902) AS acquired');
    locked = lock.rows[0].acquired;
    if (!locked) throw new Error('Another production deployment is migrating files/database. Wait for it to finish or cancel the old build, then redeploy.');
    await validateR2Deployment(client);
    await preserveLegacyFiles(client);
    execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      // Prisma's schema reads DATABASE_URL; the pg client already uses DIRECT_URL.
      // Both migration connections must use the same direct database endpoint.
      env: { ...process.env, DATABASE_URL: process.env.DIRECT_URL || process.env.DATABASE_URL },
    });
    await migrateStorage({ apply: true, client });
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(872341902)').catch(() => {});
    await client.end();
  }
}
deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
