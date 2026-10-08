const { createHash } = require('crypto');
const { existsSync, readFileSync } = require('fs');
const { resolve, sep } = require('path');
const { Client } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { ConfigService } = require('@nestjs/config');
const { SystemSettingsService } = require('../dist/src/system-settings/system-settings.service');
const { StorageService } = require('../dist/src/storage/storage.service');
const { R2StorageProvider } = require('../dist/src/storage/r2-storage.provider');
const fields = require('./storage-migration-fields.cjs');

const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/svg+xml': 'svg' };
const hash = data => createHash('sha256').update(data).digest('hex');
const publicPrefix = '/api/storage/public-images/';

async function migrateStorage({ apply = false, client: existingClient } = {}) {
  const client = existingClient || new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
  const prisma = new PrismaClient();
  const report = { scanned: 0, migrated: 0, failed: 0, missing: 0 };
  if (!existingClient) await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(872341901)');
    const settings = new SystemSettingsService(prisma);
    const values = await settings.integrationValues([
      'STORAGE_R2_BUCKET', 'STORAGE_R2_ACCOUNT_ID', 'STORAGE_R2_ENDPOINT',
      'STORAGE_R2_ACCESS_KEY_ID', 'STORAGE_R2_SECRET_ACCESS_KEY',
    ]);
    const source = new StorageService(new ConfigService(), settings);
    const target = apply ? new R2StorageProvider({ bucket: values.STORAGE_R2_BUCKET?.trim(),
      accountId: values.STORAGE_R2_ACCOUNT_ID?.trim(), endpoint: values.STORAGE_R2_ENDPOINT?.trim(),
      accessKeyId: values.STORAGE_R2_ACCESS_KEY_ID?.trim(), secretAccessKey: values.STORAGE_R2_SECRET_ACCESS_KEY?.trim(),
    }, Number(process.env.STORAGE_TIMEOUT_MS || 30000)) : null;

    async function upload(data, mimeType, publicImage = false) {
      if (!data.length) throw new Error('Source file is empty');
      const digest = hash(data);
      const key = publicImage ? `public/images/${digest}.${extensions[mimeType]}` : `migration/files/${digest}`;
      await target.put(key, data, mimeType);
      const stream = await target.open(key);
      const chunks = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      if (hash(Buffer.concat(chunks)) !== digest) throw new Error('R2 verification failed');
      return publicImage ? `${publicPrefix}${key.split('/').at(-1)}` : `r2:${key}`;
    }

    async function attempt(label, work) {
      report.scanned++;
      if (!apply) return;
      try { if (await work()) report.migrated++; }
      catch (error) { report.failed++; console.error(`${label}: ${error.name || 'Error'} (source or destination unavailable)`); }
      if (report.scanned % 25 === 0) console.log(`Progress: ${report.migrated} migrated, ${report.failed} failed`);
    }

    // Resume legacy bytes preserved before the destructive historical SQL migration.
    const stage = await client.query(`SELECT to_regclass('public."_StorageMigrationFiles"') AS name`);
    if (stage.rows[0].name) {
      if (apply) await client.query('ALTER TABLE "_StorageMigrationFiles" ADD COLUMN IF NOT EXISTS "migratedKey" text');
      let cursor = ['', '', ''];
      while (true) {
        const { rows } = await client.query(`SELECT * FROM "_StorageMigrationFiles"
          WHERE ("tableName", "recordId", "keyColumn") > ($1,$2,$3)
          ORDER BY "tableName", "recordId", "keyColumn" LIMIT 25`, cursor);
        if (!rows.length) break;
        for (const row of rows) {
          if (row.migratedKey) continue;
          if (!fields.some(([table,,key]) => table === row.tableName && key === row.keyColumn)) throw new Error('Unknown staged field');
          await attempt(`legacy ${row.tableName}.${row.keyColumn}`, async () => {
            const identity = row.tableName === 'BackupUploadChunk' ? `"uploadId" || ':' || "index"::text` : 'id';
            const current = await client.query(`SELECT "${row.keyColumn}" AS key FROM "${row.tableName}" WHERE ${identity}=$1`, [row.recordId]);
            if (!current.rows.length || current.rows[0].key) return false;
            const key = await upload(row.data, row.mimeType);
            const updated = await client.query(`UPDATE "${row.tableName}" SET "${row.keyColumn}"=$1
              WHERE ${identity}=$2 AND "${row.keyColumn}" IS NULL`, [key, row.recordId]);
            if (!updated.rowCount) return false;
            await client.query(`UPDATE "_StorageMigrationFiles" SET "migratedKey"=$1
              WHERE "tableName"=$2 AND "recordId"=$3 AND "keyColumn"=$4`, [key, row.tableName, row.recordId, row.keyColumn]);
            return true;
          });
        }
        const last = rows.at(-1); cursor = [last.tableName, last.recordId, last.keyColumn];
      }
    }

    for (const [table,,column,mimeColumn] of fields) {
      const identity = table === 'BackupUploadChunk' ? `"uploadId" || ':' || "index"::text` : 'id';
      let cursor = '';
      while (true) {
        const { rows } = await client.query(`SELECT ${identity} AS id, "${column}" AS key,
          ${mimeColumn ? `"${mimeColumn}"` : "'application/octet-stream'"} AS mime
          FROM "${table}" WHERE ${identity} > $1 AND "${column}" IS NOT NULL
          AND "${column}" NOT LIKE 'r2:%' ORDER BY ${identity} LIMIT 25`, [cursor]);
        if (!rows.length) break;
        for (const row of rows) await attempt(`${table}.${column}`, async () => {
          const data = await source.read(row.key);
          const key = await upload(data, row.mime || 'application/octet-stream');
          const updated = await client.query(`UPDATE "${table}" SET "${column}"=$1 WHERE ${identity}=$2 AND "${column}"=$3`, [key,row.id,row.key]);
          return updated.rowCount > 0;
        });
        cursor = rows.at(-1).id;
      }
      const missing = await client.query(`SELECT count(*)::int AS count FROM "${table}" WHERE "${column}" IS NULL
        ${mimeColumn ? `AND "${mimeColumn}" IS NOT NULL` : ''}`);
      report.missing += missing.rows[0].count;
    }

    const allowedHosts = new Set((process.env.STORAGE_MIGRATION_ALLOWED_HOSTS ||
      'images.unsplash.com,res.cloudinary.com,upload.wikimedia.org,flagcdn.com').split(',').map(s => s.trim()).filter(Boolean));
    async function imageData(url) {
      if (url.startsWith('data:image/')) {
        const match = /^data:(image\/[a-z+.-]+);base64,([a-zA-Z0-9+/=\s]+)$/.exec(url);
        if (!match) throw new Error('Unsupported data URL');
        return { data: Buffer.from(match[2], 'base64'), mime: match[1] };
      }
      if (url.startsWith('/')) {
        for (const root of [process.env.STORAGE_LEGACY_PUBLIC_DIR, resolve(__dirname, '../../frontend/public')].filter(Boolean)) {
          const base = resolve(root); const path = resolve(base, `.${url.split('?')[0]}`);
          if (path.startsWith(base + sep) && existsSync(path)) {
            const extension = path.split('.').at(-1).toLowerCase();
            const mime = Object.entries(extensions).find(([,ext]) => ext === extension || (ext === 'jpg' && extension === 'jpeg'))?.[0];
            return { data: readFileSync(path), mime };
          }
        }
        throw new Error('Local source image unavailable');
      }
      for (let redirects = 0; redirects < 5; redirects++) {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !allowedHosts.has(parsed.hostname)) {
          throw new Error('Source hostname not allowlisted');
        }
        const response = await fetch(parsed, { signal: AbortSignal.timeout(30000), redirect: 'manual' });
        if ([301,302,303,307,308].includes(response.status)) { url = new URL(response.headers.get('location'), parsed).href; continue; }
        if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
        const mime = response.headers.get('content-type')?.split(';')[0].trim();
        if (!extensions[mime]) throw new Error('Source is not a supported image');
        if (Number(response.headers.get('content-length')) > 25 * 1024 * 1024) throw new Error('Source image too large');
        const chunks = []; let size = 0;
        for await (const chunk of response.body) { size += chunk.length; if (size > 25 * 1024 * 1024) throw new Error('Source image too large'); chunks.push(Buffer.from(chunk)); }
        return { data: Buffer.concat(chunks), mime };
      }
      throw new Error('Too many source redirects');
    }
    const imageCache = new Map();
    async function publicImage(url) {
      if (!imageCache.has(url)) {
        const { data, mime } = await imageData(url);
        if (!extensions[mime]) throw new Error('Unsupported image type');
        imageCache.set(url, await upload(data, mime, true));
      }
      return imageCache.get(url);
    }
    const urls = [['Article','coverImageUrl'],['Sport','logoUrl'],['Event','bannerUrl'],
      ['Event','logoUrl'],['Athlete','photoUrl'],['Country','flagUrl']];
    for (const [table,column] of urls) {
      let cursor = '';
      while (true) {
        const { rows } = await client.query(`SELECT id,"${column}" AS url FROM "${table}"
          WHERE id>$1 AND "${column}" IS NOT NULL ORDER BY id LIMIT 25`, [cursor]);
        if (!rows.length) break;
        for (const row of rows) {
          if (!row.url || row.url.startsWith('/api/')) continue;
          await attempt(`${table}.${column}`, async () => {
            const url = await publicImage(row.url);
            const updated = await client.query(`UPDATE "${table}" SET "${column}"=$1 WHERE id=$2 AND "${column}"=$3`, [url,row.id,row.url]);
            return updated.rowCount > 0;
          });
        }
        cursor = rows.at(-1).id;
      }
    }
    // Article inline images use the same private-bucket/public-proxy approach.
    let cursor = '';
    while (true) {
      const { rows } = await client.query('SELECT id,content FROM "Article" WHERE id>$1 ORDER BY id LIMIT 25', [cursor]);
      if (!rows.length) break;
      for (const row of rows) {
        const matches = [...row.content.matchAll(/(?:src=["']|!\[[^\]]*\]\()((?:https?:\/\/|data:image\/|\/)[^"'\s)]+)/g)];
        const sources = [...new Set(matches.map(m => m[1]))].filter(url => !url.startsWith('/api/'));
        if (!sources.length) continue;
        await attempt('Article.content', async () => {
          let content = row.content;
          for (const url of sources) content = content.split(url).join(await publicImage(url));
          const updated = await client.query('UPDATE "Article" SET content=$1 WHERE id=$2 AND content=$3', [content,row.id,row.content]);
          return updated.rowCount > 0;
        });
      }
      cursor = rows.at(-1).id;
    }
    if (apply && !report.failed) await settings.updateIntegrations({ STORAGE_DRIVER: 'r2' });
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...report }));
    if (report.missing) console.warn('Some records have no source file/key. Restore original files or a pre-storage-migration backup; metadata cannot recreate deleted bytes.');
    if (report.failed) throw new Error(`${report.failed} source files failed; originals and references were retained. Rerun after resolving sources.`);
    return report;
  } finally {
    await client.query('SELECT pg_advisory_unlock(872341901)').catch(() => {});
    if (!existingClient) await client.end();
    await prisma.$disconnect();
  }
}
module.exports = { migrateStorage };
if (require.main === module) migrateStorage({ apply: process.argv.includes('--apply') })
  .catch(error => { console.error(error.message); process.exitCode = 1; });
