const { createReadStream } = require('fs');
const { createGunzip } = require('zlib');
const { createInterface } = require('readline');
const { createHash } = require('crypto');
const { Client } = require('pg');
const fields = require('./storage-migration-fields.cjs');

async function recover(path) {
  if (!path) throw new Error('Provide the path to a SportData .jsonl.gz backup');
  // Verify the complete backup before changing anything.
  const hash = createHash('sha256'); let footer; let count = 0;
  const lines = () => createInterface({ input: createReadStream(path).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of lines()) {
    const row = JSON.parse(line);
    if (row.type === 'row') { hash.update(`${line}\n`); count++; }
    if (row.type === 'end') footer = row;
  }
  if (!footer || footer.sha256 !== hash.digest('hex') || footer.rows !== count) throw new Error('Backup checksum/count verification failed');
  const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "_StorageMigrationFiles" (
      "tableName" text NOT NULL, "recordId" text NOT NULL, "keyColumn" text NOT NULL,
      "mimeType" text NOT NULL, data bytea NOT NULL,
      PRIMARY KEY ("tableName", "recordId", "keyColumn"))`);
    let recovered = 0;
    for await (const line of lines()) {
      const row = JSON.parse(line);
      if (row.type !== 'row') continue;
      for (const [table,column,key,mime] of fields.filter(([table]) => table === row.table)) {
        const encoded = row.data[column];
        if (!encoded) continue;
        const base64 = encoded.$sportdataBytes;
        const data = typeof base64 === 'string' ? Buffer.from(base64, 'base64') :
          encoded.type === 'Buffer' && Array.isArray(encoded.data) ? Buffer.from(encoded.data) : null;
        if (!data) throw new Error('Unknown backup binary encoding');
        const identity = table === 'BackupUploadChunk' ? `"uploadId" || ':' || "index"::text` : 'id';
        const recordId = table === 'BackupUploadChunk' ? `${row.data.uploadId}:${row.data.index}` : row.data.id;
        // Never restore unrelated records, replace newer files, or rewrite profile data.
        const result = await client.query(`INSERT INTO "_StorageMigrationFiles"
          ("tableName", "recordId", "keyColumn", "mimeType", data)
          SELECT $1,$2,$3,$4,$5 WHERE EXISTS (SELECT 1 FROM "${table}" WHERE ${identity}=$2 AND "${key}" IS NULL)
          ON CONFLICT DO NOTHING`, [table,recordId,key,row.data[mime] || 'application/octet-stream',data]);
        recovered += result.rowCount;
      }
    }
    console.log(`Recovered ${recovered} matching source files into staging; no profile data was changed.`);
  } finally { await client.end(); }
}
recover(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
