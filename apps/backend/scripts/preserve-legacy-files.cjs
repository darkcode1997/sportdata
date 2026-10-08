const { Client } = require('pg');
const fields = require('./storage-migration-fields.cjs');

async function preserveLegacyFiles(client) {
  const { rows } = await client.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'bytea'`);
  const available = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
  const legacy = fields.filter(([table, column]) => available.has(`${table}.${column}`));
  if (!legacy.length) return;
  // This durable staging table survives prisma's DROP COLUMN and failed builds.
  // It is deliberately outside Prisma; rows are removed only after verified R2 writes.
  await client.query(`CREATE TABLE IF NOT EXISTS "_StorageMigrationFiles" (
    "tableName" text NOT NULL, "recordId" text NOT NULL, "keyColumn" text NOT NULL,
    "mimeType" text NOT NULL, data bytea NOT NULL,
    PRIMARY KEY ("tableName", "recordId", "keyColumn"))`);
  for (const [table, column, keyColumn, mimeColumn] of legacy) {
    const result = await client.query(`INSERT INTO "_StorageMigrationFiles"
      ("tableName", "recordId", "keyColumn", "mimeType", data)
      SELECT $1, ${table === 'BackupUploadChunk' ? `"uploadId" || ':' || "index"::text` : 'id'}, $2, ${mimeColumn ? `COALESCE("${mimeColumn}", 'application/octet-stream')` : "'application/octet-stream'"}, "${column}"
      FROM "${table}" WHERE "${column}" IS NOT NULL
      ON CONFLICT ("tableName", "recordId", "keyColumn") DO UPDATE
      SET data = EXCLUDED.data, "mimeType" = EXCLUDED."mimeType"`, [table, keyColumn]);
    console.log(`Preserved ${table}.${column}: ${result.rowCount} files`);
  }
}

module.exports = { preserveLegacyFiles };
if (require.main === module) {
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  (async () => { await client.connect(); try { await preserveLegacyFiles(client); } finally { await client.end(); } })()
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
