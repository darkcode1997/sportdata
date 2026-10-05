import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { once } from 'events';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';
import { finished } from 'stream/promises';
import { createGunzip, createGzip } from 'zlib';
import type { Response } from 'express';
import { Client } from 'pg';
import QueryStream from 'pg-query-stream';

export const MAX_BACKUP_FILE_SIZE = 2 * 1024 * 1024 * 1024;

const BACKUP_FORMAT = 'sportdata-jsonl';
const BACKUP_VERSION = 1;
const BACKUP_BYTES_KEY = '$sportdataBytes';
const MAX_BATCH_ROWS = 500;
const MAX_BATCH_BYTES = 4 * 1024 * 1024;
export const BACKUP_UPLOAD_CHUNK_SIZE = 3 * 1024 * 1024;
const BACKUP_UPLOAD_TTL_HOURS = 24;
const BACKUP_STAGING_TABLES = ['BackupUpload', 'BackupUploadChunk'];

type SchemaTable = {
  table: string;
  columns: string[];
};

type ForeignKey = {
  tableName: string;
  constraintName: string;
  isDeferrable: 'YES' | 'NO';
  initiallyDeferred: 'YES' | 'NO';
};

type BackupMetadata = {
  type: 'sportdata-backup';
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  schema: SchemaTable[];
};

type BackupRow = {
  type: 'row';
  table: string;
  data: Record<string, unknown>;
};

type BackupEnd = {
  type: 'end';
  rows: number;
  tables: Record<string, number>;
  sha256: string;
};

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  async createImportUpload(filename?: string, size?: number) {
    const normalizedFilename = filename?.trim();
    if (!normalizedFilename?.toLowerCase().endsWith('.jsonl.gz')) {
      throw new BadRequestException('Chỉ chấp nhận file .jsonl.gz');
    }
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BACKUP_FILE_SIZE) {
      throw new BadRequestException('Dung lượng file backup không hợp lệ');
    }

    const client = this.createClient();
    await client.connect();
    try {
      await client.query('DELETE FROM "BackupUpload" WHERE "expiresAt" < NOW()');
      const uploadId = randomUUID();
      await client.query(
        `INSERT INTO "BackupUpload"
          ("id", "fileName", "totalSize", "expiresAt")
         VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 hour'))`,
        [uploadId, normalizedFilename, size, BACKUP_UPLOAD_TTL_HOURS],
      );
      return { uploadId, chunkSize: BACKUP_UPLOAD_CHUNK_SIZE };
    } finally {
      await client.end();
    }
  }

  async storeImportChunk(uploadId: string, index: number, data: Buffer) {
    if (!Number.isSafeInteger(index) || index < 0) {
      throw new BadRequestException('Chỉ số chunk không hợp lệ');
    }
    if (!data.length || data.length > BACKUP_UPLOAD_CHUNK_SIZE) {
      throw new BadRequestException('Dung lượng chunk backup không hợp lệ');
    }

    const client = this.createClient();
    await client.connect();
    let transactionOpen = false;
    try {
      await client.query('BEGIN');
      transactionOpen = true;
      const uploadResult = await client.query<{
        totalSize: string;
        receivedSize: string;
        nextChunk: number;
        status: string;
        expired: boolean;
      }>(
        `SELECT "totalSize", "receivedSize", "nextChunk", "status",
                "expiresAt" < NOW() AS expired
         FROM "BackupUpload"
         WHERE "id" = $1
         FOR UPDATE`,
        [uploadId],
      );
      const upload = uploadResult.rows[0];
      if (!upload || upload.expired) {
        throw new BadRequestException('Phiên tải backup không tồn tại hoặc đã hết hạn');
      }
      if (upload.status !== 'UPLOADING') {
        throw new BadRequestException('Phiên tải backup không còn nhận dữ liệu');
      }

      const chunkHash = createHash('sha256').update(data).digest('hex');
      if (index < upload.nextChunk) {
        const existing = await client.query<{ sha256: string }>(
          `SELECT "sha256" FROM "BackupUploadChunk"
           WHERE "uploadId" = $1 AND "index" = $2`,
          [uploadId, index],
        );
        if (existing.rows[0]?.sha256 !== chunkHash) {
          throw new BadRequestException('Chunk tải lại không khớp dữ liệu đã nhận');
        }
        await client.query('COMMIT');
        transactionOpen = false;
        return { receivedSize: Number(upload.receivedSize), nextChunk: upload.nextChunk };
      }
      if (index !== upload.nextChunk) {
        throw new BadRequestException(`Chunk không đúng thứ tự, cần chunk ${upload.nextChunk}`);
      }

      const receivedSize = Number(upload.receivedSize) + data.length;
      if (receivedSize > Number(upload.totalSize)) {
        throw new BadRequestException('Dữ liệu tải lên vượt quá dung lượng file đã khai báo');
      }
      await client.query(
        `INSERT INTO "BackupUploadChunk"
          ("uploadId", "index", "size", "sha256", "data")
         VALUES ($1, $2, $3, $4, $5)`,
        [uploadId, index, data.length, chunkHash, data],
      );
      await client.query(
        `UPDATE "BackupUpload"
         SET "receivedSize" = $2, "nextChunk" = $3, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [uploadId, receivedSize, index + 1],
      );
      await client.query('COMMIT');
      transactionOpen = false;
      return { receivedSize, nextChunk: index + 1 };
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      await client.end();
    }
  }

  async importUploadedBackup(uploadId: string) {
    const filePath = join(tmpdir(), `sportdata-import-${randomUUID()}.jsonl.gz`);
    try {
      const client = this.createClient();
      await client.connect();
      try {
        const uploadResult = await client.query<{
          totalSize: string;
          receivedSize: string;
          status: string;
          expired: boolean;
        }>(
          `UPDATE "BackupUpload"
           SET "status" = 'PROCESSING', "updatedAt" = NOW()
           WHERE "id" = $1 AND "status" = 'UPLOADING'
           RETURNING "totalSize", "receivedSize", "status", "expiresAt" < NOW() AS expired`,
          [uploadId],
        );
        const upload = uploadResult.rows[0];
        if (!upload || upload.expired) {
          throw new BadRequestException('Phiên tải backup không tồn tại, đã hết hạn hoặc đang xử lý');
        }
        if (upload.totalSize !== upload.receivedSize) {
          throw new BadRequestException('File backup chưa được tải lên đầy đủ');
        }

        const output = createWriteStream(filePath, { flags: 'wx' });
        const chunks = client.query(new QueryStream(
          `SELECT "data" FROM "BackupUploadChunk"
           WHERE "uploadId" = $1 ORDER BY "index" ASC`,
          [uploadId],
          { batchSize: 8 },
        ));
        try {
          for await (const row of chunks) {
            if (!output.write(row.data)) await once(output, 'drain');
          }
          output.end();
          await finished(output);
        } catch (error) {
          output.destroy();
          chunks.destroy();
          throw error;
        }
      } finally {
        await client.end();
      }

      const stats = await fs.stat(filePath);
      return await this.importDatabase(filePath, stats.size);
    } finally {
      await fs.unlink(filePath).catch(() => undefined);
      await this.deleteImportUpload(uploadId).catch(() => undefined);
    }
  }

  async deleteImportUpload(uploadId: string) {
    const client = this.createClient();
    await client.connect();
    try {
      await client.query('DELETE FROM "BackupUpload" WHERE "id" = $1', [uploadId]);
      return { success: true };
    } finally {
      await client.end();
    }
  }

  async exportDatabase(response: Response) {
    const client = this.createClient();
    await client.connect();

    let transactionOpen = false;
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      transactionOpen = true;
      const schema = await this.getSchema(client);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sportdata-backup-${timestamp}.jsonl.gz`;

      response.status(200);
      response.setHeader('Content-Type', 'application/gzip');
      response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');

      const gzip = createGzip({ level: 6 });
      gzip.pipe(response);

      const writeLine = async (value: unknown) => {
        const line = `${JSON.stringify(value)}\n`;
        if (!gzip.write(line)) {
          await once(gzip, 'drain');
        }
        return line;
      };

      const metadata: BackupMetadata = {
        type: 'sportdata-backup',
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        schema,
      };
      await writeLine(metadata);

      const hash = createHash('sha256');
      const tableCounts: Record<string, number> = {};
      let totalRows = 0;

      for (const table of schema) {
        let tableRows = 0;
        const query = new QueryStream(
          `SELECT * FROM ${quoteIdentifier(table.table)}`,
          [],
          { batchSize: 500 },
        );
        const stream = client.query(query);

        for await (const data of stream) {
          const row: BackupRow = { type: 'row', table: table.table, data: serializeRowData(data) };
          const line = await writeLine(row);
          hash.update(line);
          tableRows += 1;
          totalRows += 1;
        }
        tableCounts[table.table] = tableRows;
      }

      const footer: BackupEnd = {
        type: 'end',
        rows: totalRows,
        tables: tableCounts,
        sha256: hash.digest('hex'),
      };
      await writeLine(footer);
      gzip.end();
      await finished(gzip);

      await client.query('COMMIT');
      transactionOpen = false;
      this.logger.log(`Exported ${totalRows} rows to ${filename}`);
    } catch (error) {
      if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined);
      if (response.headersSent) response.destroy(error as Error);
      throw error;
    } finally {
      await client.end();
    }
  }

  async importDatabase(filePath: string, compressedSize: number) {
    if (compressedSize > MAX_BACKUP_FILE_SIZE) {
      throw new BadRequestException('File backup vượt quá giới hạn 2GB');
    }

    await this.assertGzipFile(filePath);
    const client = this.createClient();
    await client.connect();

    try {
      const schema = await this.getSchema(client);
      const validation = await this.validateBackup(filePath, schema);
      const foreignKeys = await this.getForeignKeys(client);
      let transactionOpen = false;

      try {
        await client.query('BEGIN');
        transactionOpen = true;

        for (const foreignKey of foreignKeys) {
          await client.query(
            `ALTER TABLE ${quoteIdentifier(foreignKey.tableName)} ` +
              `ALTER CONSTRAINT ${quoteIdentifier(foreignKey.constraintName)} ` +
              'DEFERRABLE INITIALLY DEFERRED',
          );
        }
        await client.query('SET CONSTRAINTS ALL DEFERRED');

        const tableList = schema.map((table) => quoteIdentifier(table.table)).join(', ');
        if (tableList) {
          await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
        }

        let batchTable = '';
        let batch: Array<Record<string, unknown>> = [];
        let batchBytes = 0;
        let importedRows = 0;

        const flushBatch = async () => {
          if (!batch.length || !batchTable) return;
          await client.query(
            `INSERT INTO ${quoteIdentifier(batchTable)} ` +
              `SELECT * FROM json_populate_recordset(NULL::${quoteIdentifier(batchTable)}, $1::json)`,
            [JSON.stringify(batch)],
          );
          importedRows += batch.length;
          batch = [];
          batchBytes = 0;
        };

        for await (const line of this.readBackupLines(filePath)) {
          if (!line) continue;
          const record = JSON.parse(line) as BackupMetadata | BackupRow | BackupEnd;
          if (record.type !== 'row') continue;

          const restoredData = deserializeRowData(record.data);
          const rowBytes = Buffer.byteLength(JSON.stringify(restoredData));
          if (
            batch.length &&
            (record.table !== batchTable ||
              batch.length >= MAX_BATCH_ROWS ||
              batchBytes + rowBytes > MAX_BATCH_BYTES)
          ) {
            await flushBatch();
          }
          batchTable = record.table;
          batch.push(restoredData);
          batchBytes += rowBytes;
        }
        await flushBatch();

        await client.query('SET CONSTRAINTS ALL IMMEDIATE');
        for (const foreignKey of foreignKeys) {
          const originalMode = foreignKey.isDeferrable === 'YES'
            ? `DEFERRABLE INITIALLY ${foreignKey.initiallyDeferred === 'YES' ? 'DEFERRED' : 'IMMEDIATE'}`
            : 'NOT DEFERRABLE';
          await client.query(
            `ALTER TABLE ${quoteIdentifier(foreignKey.tableName)} ` +
              `ALTER CONSTRAINT ${quoteIdentifier(foreignKey.constraintName)} ${originalMode}`,
          );
        }

        await client.query('COMMIT');
        transactionOpen = false;
        this.logger.log(`Imported ${importedRows} rows from backup`);
        return {
          success: true,
          rows: importedRows,
          tables: validation.tables,
          createdAt: validation.createdAt,
        };
      } catch (error) {
        if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      }
    } finally {
      await client.end();
    }
  }

  private createClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not configured');
    return new Client({ connectionString });
  }

  private async getSchema(client: Client): Promise<SchemaTable[]> {
    const result = await client.query<{
      table_name: string;
      column_name: string;
      ordinal_position: number;
    }>(`
      SELECT columns.table_name, columns.column_name, columns.ordinal_position
      FROM information_schema.columns AS columns
      INNER JOIN information_schema.tables AS tables
        ON tables.table_schema = columns.table_schema
        AND tables.table_name = columns.table_name
      WHERE columns.table_schema = 'public'
        AND tables.table_type = 'BASE TABLE'
        AND columns.table_name <> '_prisma_migrations'
        AND columns.table_name <> ALL($1::text[])
      ORDER BY columns.table_name ASC, columns.ordinal_position ASC
    `, [BACKUP_STAGING_TABLES]);

    const tables = new Map<string, string[]>();
    for (const row of result.rows) {
      const columns = tables.get(row.table_name) || [];
      columns.push(row.column_name);
      tables.set(row.table_name, columns);
    }
    return Array.from(tables, ([table, columns]) => ({ table, columns }));
  }

  private async getForeignKeys(client: Client): Promise<ForeignKey[]> {
    const result = await client.query<{
      table_name: string;
      constraint_name: string;
      is_deferrable: 'YES' | 'NO';
      initially_deferred: 'YES' | 'NO';
    }>(`
      SELECT table_name, constraint_name, is_deferrable, initially_deferred
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
      ORDER BY table_name, constraint_name
    `);
    return result.rows.map((row) => ({
      tableName: row.table_name,
      constraintName: row.constraint_name,
      isDeferrable: row.is_deferrable,
      initiallyDeferred: row.initially_deferred,
    }));
  }

  private async validateBackup(filePath: string, schema: SchemaTable[]) {
    const schemaByTable = new Map(schema.map((table) => [table.table, table.columns]));
    const hash = createHash('sha256');
    const tableCounts: Record<string, number> = Object.fromEntries(
      schema.map((table) => [table.table, 0]),
    );
    let metadata: BackupMetadata | null = null;
    let footer: BackupEnd | null = null;
    let totalRows = 0;
    let lineNumber = 0;

    try {
      for await (const line of this.readBackupLines(filePath)) {
        if (!line) continue;
        lineNumber += 1;
        if (footer) {
          throw new BadRequestException('File backup có dữ liệu nằm sau dòng kết thúc');
        }

        let record: BackupMetadata | BackupRow | BackupEnd;
        try {
          record = JSON.parse(line);
        } catch {
          throw new BadRequestException(`JSONL không hợp lệ tại dòng ${lineNumber}`);
        }

        if (!metadata) {
          if (
            record.type !== 'sportdata-backup' ||
            record.format !== BACKUP_FORMAT ||
            record.version !== BACKUP_VERSION ||
            !Array.isArray(record.schema)
          ) {
            throw new BadRequestException('Đây không phải file backup SportData được hỗ trợ');
          }
          if (!schemasAreCompatible(record.schema, schema)) {
            throw new BadRequestException(
              'Cấu trúc file backup không tương thích với phiên bản hệ thống hiện tại',
            );
          }
          metadata = record;
          continue;
        }

        if (record.type === 'row') {
          const expectedColumns = schemaByTable.get(record.table);
          if (!expectedColumns || !record.data || Array.isArray(record.data)) {
            throw new BadRequestException(`Dữ liệu bảng không hợp lệ tại dòng ${lineNumber}`);
          }
          const actualColumns = Object.keys(record.data);
          if (
            actualColumns.length !== expectedColumns.length ||
            expectedColumns.some((column) => !Object.prototype.hasOwnProperty.call(record.data, column))
          ) {
            throw new BadRequestException(
              `Cột dữ liệu của bảng ${record.table} không hợp lệ tại dòng ${lineNumber}`,
            );
          }
          hash.update(`${line}\n`);
          tableCounts[record.table] += 1;
          totalRows += 1;
          continue;
        }

        if (record.type === 'end') {
          footer = record;
          continue;
        }

        throw new BadRequestException(`Loại bản ghi không hợp lệ tại dòng ${lineNumber}`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Không thể đọc file gzip: ${(error as Error).message}`);
    }

    if (!metadata || !footer) {
      throw new BadRequestException('File backup chưa hoàn chỉnh');
    }
    if (footer.rows !== totalRows || footer.sha256 !== hash.digest('hex')) {
      throw new BadRequestException('File backup bị thiếu hoặc sai checksum');
    }
    for (const table of schema) {
      if (footer.tables?.[table.table] !== tableCounts[table.table]) {
        throw new BadRequestException(`Số dòng của bảng ${table.table} không khớp`);
      }
    }

    return {
      createdAt: metadata.createdAt,
      rows: totalRows,
      tables: tableCounts,
    };
  }

  private async assertGzipFile(filePath: string) {
    const handle = await fs.open(filePath, 'r');
    try {
      const signature = Buffer.alloc(2);
      const { bytesRead } = await handle.read(signature, 0, 2, 0);
      if (bytesRead !== 2 || signature[0] !== 0x1f || signature[1] !== 0x8b) {
        throw new BadRequestException('File tải lên không phải định dạng gzip hợp lệ');
      }
    } finally {
      await handle.close();
    }
  }

  private async *readBackupLines(filePath: string) {
    const source = createReadStream(filePath);
    const gunzip = createGunzip();
    const lines = createInterface({ input: source.pipe(gunzip), crlfDelay: Infinity });
    try {
      for await (const line of lines) yield line;
    } finally {
      lines.close();
      source.destroy();
      gunzip.destroy();
    }
  }
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function schemasAreCompatible(backupSchema: SchemaTable[], currentSchema: SchemaTable[]) {
  if (backupSchema.length !== currentSchema.length) return false;

  const backupTables = new Map(backupSchema.map(({ table, columns }) => [table, new Set(columns)]));
  return currentSchema.every(({ table, columns }) => {
    const backupColumns = backupTables.get(table);
    return backupColumns?.size === columns.length && columns.every((column) => backupColumns.has(column));
  });
}

function serializeRowData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([column, value]) => [
    column,
    Buffer.isBuffer(value) ? { [BACKUP_BYTES_KEY]: value.toString('base64') } : value,
  ]));
}

function deserializeRowData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([column, value]) => [
    column,
    deserializeBinaryValue(value),
  ]));
}

function deserializeBinaryValue(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;

  const encoded = value as Record<string, unknown>;
  if (typeof encoded[BACKUP_BYTES_KEY] === 'string') {
    return `\\x${Buffer.from(encoded[BACKUP_BYTES_KEY], 'base64').toString('hex')}`;
  }
  if (encoded.type === 'Buffer' && Array.isArray(encoded.data)) {
    const bytes = encoded.data;
    if (bytes.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
      return `\\x${Buffer.from(bytes).toString('hex')}`;
    }
  }
  return value;
}
