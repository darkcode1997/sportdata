import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { LocalStorageProvider } from './local-storage.provider';
import { S3StorageProvider } from './s3-storage.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { CloudinaryStorageProvider, DEFAULT_CLOUDINARY_IMAGE_OPTIONS } from './cloudinary-storage.provider';
import type { StorageProvider } from './storage-provider';
import type { ImageVariant } from './image-variant';

type UploadFile = { buffer: Buffer; mimetype: string };
type StorageDriver = 'local' | 's3' | 'cloudinary' | 'r2';
export type StoredFile = { key: string; size: number; mimeType: string };

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: StorageDriver;
  private readonly providers = new Map<string, StorageProvider>();

  private r2Configuration?: string;

  constructor(private readonly config: ConfigService, private readonly settings: SystemSettingsService) {
    const driver = config.get<string>('STORAGE_DRIVER') || 'local';
    if (!['local', 's3', 'cloudinary', 'r2'].includes(driver)) throw new Error('STORAGE_DRIVER must be local, s3, cloudinary or r2');
    this.driver = driver as StorageDriver;
    this.providers.set('local', new LocalStorageProvider(config.get<string>('STORAGE_LOCAL_DIR') || 'static/uploads'));

    const timeoutMs = Number(config.get<string>('STORAGE_TIMEOUT_MS') || 30000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid STORAGE_TIMEOUT_MS');
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    if ((driver === 'cloudinary' || cloudName || apiKey || apiSecret) && !(cloudName && apiKey && apiSecret)) {
      throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required');
    }
    if (cloudName && apiKey && apiSecret) {
      const dimension = (name: string, fallback: number) => {
        const value = Number(config.get<string>(name) || fallback);
        if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new Error(`${name} must be an integer between 1 and 10000`);
        return value;
      };
      const resizeEnabled = config.get<string>('CLOUDINARY_RESIZE_ENABLED') || 'true';
      if (!['true', 'false'].includes(resizeEnabled)) throw new Error('CLOUDINARY_RESIZE_ENABLED must be true or false');
      const quality = config.get<string>('CLOUDINARY_IMAGE_QUALITY') ?? DEFAULT_CLOUDINARY_IMAGE_OPTIONS.quality;
      if (quality && !/^(?:auto(?::(?:best|good|eco|low))?|[1-9][0-9]?|100)$/.test(quality)) {
        throw new Error('CLOUDINARY_IMAGE_QUALITY must be empty, auto, auto:best/good/eco/low, or 1-100');
      }
      this.providers.set('cloudinary', new CloudinaryStorageProvider({
        cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret,
      }, timeoutMs, {
        enabled: resizeEnabled === 'true',
        maxWidth: dimension('CLOUDINARY_IMAGE_MAX_WIDTH', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.maxWidth),
        maxHeight: dimension('CLOUDINARY_IMAGE_MAX_HEIGHT', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.maxHeight),
        avatarMaxWidth: dimension('CLOUDINARY_AVATAR_MAX_WIDTH', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.avatarMaxWidth),
        avatarMaxHeight: dimension('CLOUDINARY_AVATAR_MAX_HEIGHT', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.avatarMaxHeight),
        documentMaxWidth: dimension('CLOUDINARY_DOCUMENT_MAX_WIDTH', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.documentMaxWidth),
        documentMaxHeight: dimension('CLOUDINARY_DOCUMENT_MAX_HEIGHT', DEFAULT_CLOUDINARY_IMAGE_OPTIONS.documentMaxHeight),
        quality,
      }));
    }

    const bucket = config.get<string>('STORAGE_S3_BUCKET');
    if (driver === 's3' && !bucket) throw new Error('STORAGE_S3_BUCKET is required for S3 storage');
    if (bucket) {
      const accessKeyId = config.get<string>('STORAGE_S3_ACCESS_KEY_ID');
      const secretAccessKey = config.get<string>('STORAGE_S3_SECRET_ACCESS_KEY');
      if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
        throw new Error('Configure both STORAGE_S3_ACCESS_KEY_ID and STORAGE_S3_SECRET_ACCESS_KEY');
      }
      this.providers.set('s3', new S3StorageProvider(bucket, timeoutMs, {
        region: config.get<string>('STORAGE_S3_REGION') || 'us-east-1',
        endpoint: config.get<string>('STORAGE_S3_ENDPOINT') || undefined,
        forcePathStyle: config.get<string>('STORAGE_S3_FORCE_PATH_STYLE') === 'true',
        credentials: accessKeyId ? { accessKeyId, secretAccessKey } : undefined,
        maxAttempts: 2,
        // Compatible services may not support AWS's optional checksum trailers.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }));
    }
  }

  private async storageConfiguration() {
    const values = await this.settings.integrationValues([
      'STORAGE_DRIVER', 'STORAGE_R2_BUCKET', 'STORAGE_R2_ACCOUNT_ID', 'STORAGE_R2_ENDPOINT',
      'STORAGE_R2_ACCESS_KEY_ID', 'STORAGE_R2_SECRET_ACCESS_KEY',
    ]);
    const driver = values.STORAGE_DRIVER?.trim() || this.driver;
    if (!['local', 's3', 'cloudinary', 'r2'].includes(driver)) {
      throw new ServiceUnavailableException('Nơi lưu file chưa được cấu hình hợp lệ');
    }
    return { values, driver };
  }

  private r2Provider(values: Record<string, string | undefined>): StorageProvider {
    const options = {
      bucket: values.STORAGE_R2_BUCKET?.trim(), accountId: values.STORAGE_R2_ACCOUNT_ID?.trim(),
      endpoint: values.STORAGE_R2_ENDPOINT?.trim(), accessKeyId: values.STORAGE_R2_ACCESS_KEY_ID?.trim(),
      secretAccessKey: values.STORAGE_R2_SECRET_ACCESS_KEY?.trim(),
    };
    const signature = JSON.stringify(options);
    if (signature !== this.r2Configuration) {
      try {
        const provider = new R2StorageProvider(options, Number(this.config.get<string>('STORAGE_TIMEOUT_MS') || 30000));
        this.providers.set('r2', provider);
        this.r2Configuration = signature;
      } catch {
        throw new ServiceUnavailableException('Cấu hình Cloudflare R2 chưa đầy đủ hoặc không hợp lệ. Kiểm tra cài đặt hệ thống.');
      }
    }
    return this.providers.get('r2')!;
  }

  async put(data: Buffer, mimeType: string, folder: string): Promise<string> {
    return (await this.upload(data, mimeType, folder)).key;
  }

  async upload(data: Buffer, mimeType: string, folder: string): Promise<StoredFile> {
    if (!/^[a-zA-Z0-9/_-]+$/.test(folder) || folder.startsWith('/')) throw new Error('Invalid storage folder');
    const key = `${folder}/${randomUUID()}`;
    const { values, driver } = await this.storageConfiguration();
    const provider = driver === 'r2' ? this.r2Provider(values) : this.providers.get(driver);
    if (!provider) throw new ServiceUnavailableException('Nơi lưu file chưa được cấu hình');
    const storageKey = provider.prepareKey?.(key, mimeType) || key;
    const reference = `${driver}:${storageKey}`;
    try {
      const result = await provider.put(storageKey, data, mimeType);
      const size = result && Number.isSafeInteger(result.size) && result.size > 0 ? result.size : data.length;
      return { key: reference, size, mimeType };
    } catch (error) {
      await this.deleteQuietly(reference);
      this.logger.error(`Storage upload failed (${driver}): ${(error as Error).message}`);
      throw new ServiceUnavailableException('Không thể lưu tệp, vui lòng thử lại');
    }
  }

  async imageUrl(reference: string, variant?: ImageVariant): Promise<string | undefined> {
    if (!variant || !reference) return undefined;
    const { provider, key } = await this.resolve(reference);
    try {
      return await provider.imageUrl?.(key, variant);
    } catch (error) {
      this.logger.warn(`Image variant failed; using original: ${(error as Error).message}`);
      return undefined;
    }
  }

  async open(reference: string, variant?: ImageVariant): Promise<Readable> {
    if (!reference) throw new NotFoundException('Chưa có tệp trong storage');
    const { provider, key } = await this.resolve(reference);
    try {
      if (variant) {
        try {
          return await provider.open(key, variant);
        } catch (error) {
          this.logger.warn(`Image variant failed; using original: ${(error as Error).message}`);
        }
      }
      return await provider.open(key);
    } catch (error: any) {
      if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException('Không tìm thấy tệp trong storage');
      }
      this.logger.error(`Storage download failed: ${error.message}`);
      throw new ServiceUnavailableException('Không thể đọc tệp, vui lòng thử lại');
    }
  }

  async read(reference: string, variant?: ImageVariant): Promise<Buffer> {
    const stream = await this.open(reference, variant);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  async delete(reference: string) {
    if (!reference) return;
    const { provider, key } = await this.resolve(reference);
    await provider.delete(key);
  }

  async deleteQuietly(reference: string) {
    try {
      await this.delete(reference);
    } catch (error) {
      this.logger.warn(`Storage cleanup failed for ${reference}: ${(error as Error).message}`);
    }
  }

  // Publish the new reference only after upload succeeds; compensate on DB failure.
  async withUpload<T>(file: UploadFile, folder: string, previous: string | null | undefined, persist: (reference: string, stored: StoredFile) => Promise<T>): Promise<T> {
    const stored = await this.upload(file.buffer, file.mimetype, folder);
    let result: T;
    try {
      result = await persist(stored.key, stored);
    } catch (error) {
      await this.deleteQuietly(stored.key);
      throw error;
    }
    await this.deleteQuietly(previous);
    return result;
  }

  private async resolve(reference: string) {
    const separator = reference.indexOf(':');
    const driver = reference.slice(0, separator);
    const key = reference.slice(separator + 1);
    if (separator < 0 || !/^[a-zA-Z0-9/_.-]+$/.test(key) || key.startsWith('/')
      || key.split('/').some((part) => part === '.' || part === '..')) {
      throw new NotFoundException('Định danh tệp không hợp lệ');
    }
    const provider = driver === 'r2'
      ? this.r2Provider((await this.storageConfiguration()).values) : this.providers.get(driver);
    if (!provider) throw new ServiceUnavailableException('Storage của tệp chưa được cấu hình');
    return { provider, key };
  }
}
