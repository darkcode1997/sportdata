import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import type { StorageProvider } from './storage-provider';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly bucket: string, private readonly timeoutMs: number, options: ConstructorParameters<typeof S3Client>[0]) {
    this.client = new S3Client(options);
  }

  async put(key: string, data: Buffer, mimeType: string) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: mimeType,
    }), { abortSignal: AbortSignal.timeout(this.timeoutMs) });
  }

  async open(key: string): Promise<Readable> {
    const result = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }), { abortSignal: AbortSignal.timeout(this.timeoutMs) });
    if (!(result.Body instanceof Readable)) throw new Error('Storage returned an invalid stream');
    return result.Body;
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
