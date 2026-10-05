const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

const baselineMigrations = [
  '20260914050000_initial_schema',
  '20260914050100_schedule_constraints',
  '20260914050200_domestic_organizations',
];

const scheduleConstraints = [
  'Match_valid_time_range',
  'Match_fop_time_no_overlap',
  'CompetitionSession_valid_time_range',
  'TimeSlot_valid_time_range',
  'TimeSlot_fop_time_no_overlap',
];

function runPrisma(args) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(executable, ['prisma', ...args], { stdio: 'inherit' });
}

async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = $1
     ) AS exists`,
    [tableName],
  );
  return result.rows[0].exists;
}

async function getAppliedMigrations(client) {
  if (!(await tableExists(client, '_prisma_migrations'))) return new Set();

  const result = await client.query(`
    SELECT migration_name
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL
      AND rolled_back_at IS NULL
  `);
  return new Set(result.rows.map((row) => row.migration_name));
}

async function validateLegacyBaseline(client) {
  const requiredTables = ['User', 'Event', 'Federation', '_EventParticipatingFederations'];
  for (const tableName of requiredTables) {
    if (!(await tableExists(client, tableName))) {
      throw new Error(`Cannot baseline production database: missing table ${tableName}.`);
    }
  }

  if (await tableExists(client, 'Banner')) {
    throw new Error(
      'Cannot automatically baseline production database: later schema tables already exist.',
    );
  }

  const columns = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (table_name, column_name) IN (
        ('Federation', 'code'),
        ('Federation', 'type'),
        ('Event', 'level'),
        ('Event', 'organizerId'),
        ('Event', 'allowIndependentAthletes')
      )
  `);
  if (columns.rowCount !== 5) {
    throw new Error('Cannot baseline production database: domestic organization schema is incomplete.');
  }
}

async function ensureScheduleConstraints(client) {
  const result = await client.query(
    `SELECT conname
     FROM pg_constraint
     WHERE connamespace = 'public'::regnamespace
       AND conname = ANY($1::text[])`,
    [scheduleConstraints],
  );

  if (result.rowCount === scheduleConstraints.length) return;
  if (result.rowCount !== 0) {
    throw new Error('Cannot baseline production database: schedule constraints are partially applied.');
  }

  const migrationSql = readFileSync(
    join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      '20260914050100_schedule_constraints',
      'migration.sql',
    ),
    'utf8',
  );

  await client.query('BEGIN');
  try {
    await client.query(migrationSql);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function baselineLegacyDatabase(client, appliedMigrations) {
  const needsBaseline = baselineMigrations.some(
    (migration) => !appliedMigrations.has(migration),
  );
  if (!needsBaseline) return;

  await validateLegacyBaseline(client);
  await ensureScheduleConstraints(client);

  for (const migration of baselineMigrations) {
    if (!appliedMigrations.has(migration)) {
      runPrisma(['migrate', 'resolve', '--applied', migration]);
    }
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to deploy migrations.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const appliedMigrations = await getAppliedMigrations(client);
    await baselineLegacyDatabase(client, appliedMigrations);
  } finally {
    await client.end();
  }

  runPrisma(['migrate', 'deploy']);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
