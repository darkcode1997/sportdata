import { S3StorageProvider } from './s3-storage.provider';

export type R2StorageOptions = {
  bucket?: string;
  accountId?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export function validateR2Options(options: R2StorageOptions) {
  const { bucket, accountId, accessKeyId, secretAccessKey } = options;
  if (!bucket) throw new Error('STORAGE_R2_BUCKET is required for R2 storage');
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('STORAGE_R2_ACCESS_KEY_ID and STORAGE_R2_SECRET_ACCESS_KEY are required for R2 storage');
  }
  if (!options.endpoint && !accountId) {
    throw new Error('STORAGE_R2_ACCOUNT_ID or STORAGE_R2_ENDPOINT is required for R2 storage');
  }
  if (accountId && !/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error('STORAGE_R2_ACCOUNT_ID must be a 32-character hexadecimal Cloudflare account ID');
  }
  let endpoint: URL;
  try {
    endpoint = new URL(options.endpoint || `https://${accountId}.r2.cloudflarestorage.com`);
  } catch {
    throw new Error('STORAGE_R2_ENDPOINT must be a valid S3 API endpoint URL');
  }
  const localHttp = endpoint.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname);
  if ((endpoint.protocol !== 'https:' && !localHttp) || endpoint.username || endpoint.password
    || endpoint.search || endpoint.hash || endpoint.pathname !== '/') {
    throw new Error('STORAGE_R2_ENDPOINT must use HTTPS without a bucket path, credentials or query; HTTP localhost is allowed for development');
  }
  return endpoint.origin;
}

/** R2 uses the S3 API with its own endpoint, credentials and the auto region. */
export class R2StorageProvider extends S3StorageProvider {
  constructor(options: R2StorageOptions, timeoutMs: number) {
    const endpoint = validateR2Options(options);
    const { bucket, accessKeyId, secretAccessKey } = options;
    super(bucket!, timeoutMs, {
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      maxAttempts: 2,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
}
