import type { Readable } from 'stream';
import type { ImageVariant } from './image-variant';

export type StorageUploadResult = { size: number };

export interface StorageProvider {
  prepareKey?(key: string, mimeType: string): string;
  put(key: string, data: Buffer, mimeType: string): Promise<StorageUploadResult | void>;
  open(key: string, variant?: ImageVariant): Promise<Readable>;
  imageUrl?(key: string, variant: ImageVariant, webp?: boolean): Promise<string | undefined>;
  delete(key: string): Promise<void>;
}
