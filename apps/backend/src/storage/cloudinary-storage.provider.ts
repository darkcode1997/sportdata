import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import type { StorageProvider, StorageUploadResult } from './storage-provider';
import { IMAGE_VARIANTS, ImageVariant } from './image-variant';

type CloudinaryCredentials = { cloud_name: string; api_key: string; api_secret: string };
export type CloudinaryImageOptions = {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
  avatarMaxWidth: number;
  avatarMaxHeight: number;
  documentMaxWidth: number;
  documentMaxHeight: number;
  quality: string;
};

export const DEFAULT_CLOUDINARY_IMAGE_OPTIONS: CloudinaryImageOptions = {
  enabled: true,
  maxWidth: 1920,
  maxHeight: 1920,
  avatarMaxWidth: 800,
  avatarMaxHeight: 1200,
  documentMaxWidth: 2400,
  documentMaxHeight: 2400,
  quality: 'auto:good',
};
type CloudinaryAsset = {
  publicId: string;
  resourceType: 'image' | 'raw';
  format?: string;
  base64?: boolean;
};

const IMAGE_FORMATS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export class CloudinaryStorageProvider implements StorageProvider {
  private readonly variants = new Map<string, { url: string; expiresAt: number }>();
  private readonly pendingVariants = new Map<string, Promise<string>>();
  constructor(
    private readonly credentials: CloudinaryCredentials,
    private readonly timeoutMs: number,
    private readonly images: CloudinaryImageOptions = DEFAULT_CLOUDINARY_IMAGE_OPTIONS,
  ) {}

  prepareKey(key: string, mimeType: string) {
    const format = IMAGE_FORMATS[mimeType];
    if (format) return `v2/image/${format}/${key}`;
    if (mimeType === 'application/pdf') return `v2/raw/pdf/${key}`;
    // Backup chunks are arbitrary bytes, so encode them as a supported text asset.
    return `v2/raw/base64/${key}`;
  }

  async put(key: string, data: Buffer) {
    const asset = this.asset(key);
    const payload = asset.base64 ? Buffer.from(data.toString('base64'), 'ascii') : data;
    return new Promise<StorageUploadResult>((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream({
        ...this.credentials,
        resource_type: asset.resourceType,
        type: 'authenticated',
        public_id: asset.publicId,
        // Images have extension-free public IDs; raw files include their extension.
        ...(asset.format ? { allowed_formats: [asset.format] } : {}),
        ...(asset.resourceType === 'image' && this.images.enabled
          ? { transformation: this.imageTransformation(asset.publicId) }
          : {}),
        overwrite: false,
        timeout: this.timeoutMs,
        disable_promise: true,
      }, (error, result) => {
        if (error) reject(error);
        else if (!result) reject(new Error('Cloudinary returned no upload result'));
        else resolve({ size: asset.base64 ? data.length : result.bytes });
      });
      upload.on('error', reject);
      upload.end(payload);
    });
  }

  private imageTransformation(publicId: string) {
    let width = this.images.maxWidth;
    let height = this.images.maxHeight;
    if (publicId.startsWith('athletes/avatars/') || publicId.startsWith('participant-uploads/avatar/')) {
      width = this.images.avatarMaxWidth;
      height = this.images.avatarMaxHeight;
    } else if (publicId.startsWith('athletes/documents/') || /^participant-uploads\/(cccd_front|cccd_back|passport)\//.test(publicId)) {
      width = this.images.documentMaxWidth;
      height = this.images.documentMaxHeight;
    }
    return {
      crop: 'limit' as const,
      width,
      height,
      ...(this.images.quality ? { quality: this.images.quality } : {}),
    };
  }

  async imageUrl(key: string, variant: ImageVariant, webp = true): Promise<string | undefined> {
    const asset = this.asset(key);
    if (asset.resourceType !== 'image') return undefined;
    const cacheKey = `${key}:${variant}:${webp}`;
    const cached = this.variants.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.url;
    const pending = this.pendingVariants.get(cacheKey);
    if (pending) return pending;
    const task = this.ensureVariant(asset, variant, webp).then((url) => {
      this.variants.delete(cacheKey);
      while (this.variants.size >= 2000) this.variants.delete(this.variants.keys().next().value);
      this.variants.set(cacheKey, { url, expiresAt: Date.now() + 60 * 60 * 1000 });
      return url;
    });
    this.pendingVariants.set(cacheKey, task);
    try {
      return await task;
    } finally {
      this.pendingVariants.delete(cacheKey);
    }
  }

  private async ensureVariant(asset: CloudinaryAsset, variant: ImageVariant, webp: boolean) {
    const transformation = { ...IMAGE_VARIANTS[variant], quality: 'auto:good' };
    const format = webp ? 'webp' : asset.format;
    const options = {
      ...this.credentials, resource_type: 'image', type: 'authenticated',
      transformation, format, sign_url: true, secure: true,
    };
    const url = cloudinary.utils.url(asset.publicId, { ...options });
    // Authenticated images require explicit eager generation. Existing variants
    // survive backend restarts, so check the CDN before asking Cloudinary again.
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(this.timeoutMs) });
    if (response.ok) return url;
    if (![401, 403, 404].includes(response.status)) throw new Error(`Cloudinary preview failed (${response.status})`);
    const result = await cloudinary.uploader.explicit(asset.publicId, {
      ...this.credentials, resource_type: 'image', type: 'authenticated',
      eager: [{ ...transformation, format }], eager_async: false, timeout: this.timeoutMs,
    });
    if (!result.eager?.[0]?.secure_url || result.eager[0].status === 'failed') {
      throw new Error('Cloudinary could not generate the image variant');
    }
    return cloudinary.utils.url(asset.publicId, { ...options, version: result.version });
  }

  async open(key: string, variant?: ImageVariant): Promise<Readable> {
    const asset = this.asset(key);
    const url = (variant && await this.imageUrl(key, variant, false)) || cloudinary.utils.url(asset.publicId, {
      ...this.credentials,
      resource_type: asset.resourceType,
      ...(asset.format ? { format: asset.format } : {}),
      type: 'authenticated',
      sign_url: true,
      secure: true,
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok || !response.body) {
      const error = new Error(`Cloudinary download failed (${response.status})`);
      if (response.status === 404) error.name = 'NoSuchKey';
      throw error;
    }
    const stream = Readable.fromWeb(response.body as any);
    return asset.base64 ? Readable.from(this.decodeBase64(stream)) : stream;
  }

  async delete(key: string) {
    const asset = this.asset(key);
    const options = {
      ...this.credentials,
      resource_type: asset.resourceType,
      type: 'authenticated' as const,
      invalidate: true,
      timeout: this.timeoutMs,
    };
    const result = await cloudinary.uploader.destroy(asset.publicId, options);
    if (!['ok', 'not found'].includes(result.result)) throw new Error('Cloudinary could not delete the asset');
    for (const cacheKey of this.variants.keys()) {
      if (cacheKey.startsWith(`${key}:`)) this.variants.delete(cacheKey);
    }
  }

  private asset(key: string): CloudinaryAsset {
    const match = /^v2\/(image|raw)\/([a-z0-9]+)\/(.+)$/.exec(key);
    if (!match) {
      // Keep existing references readable and deletable without migrating data.
      return { publicId: `${key}.bin`, resourceType: 'raw' };
    }
    const [, type, format, publicId] = match;
    if (type === 'image' && Object.values(IMAGE_FORMATS).includes(format)) {
      return { publicId, resourceType: 'image', format };
    }
    if (type === 'raw' && format === 'pdf') return { publicId: `${publicId}.pdf`, resourceType: 'raw' };
    if (type === 'raw' && format === 'base64') return { publicId: `${publicId}.txt`, resourceType: 'raw', base64: true };
    throw new Error('Invalid Cloudinary storage key');
  }

  private async *decodeBase64(stream: Readable) {
    let pending = '';
    for await (const chunk of stream) {
      pending += Buffer.from(chunk).toString('ascii');
      if (!/^[A-Za-z0-9+/=]*$/.test(pending)) throw new Error('Invalid encoded Cloudinary file');
      const length = pending.length - (pending.length % 4);
      if (length) {
        yield Buffer.from(pending.slice(0, length), 'base64');
        pending = pending.slice(length);
      }
    }
    if (pending) throw new Error('Incomplete encoded Cloudinary file');
  }
}
