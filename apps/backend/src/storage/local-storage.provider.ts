import { createReadStream, promises as fs } from 'fs';
import { dirname, resolve, sep } from 'path';
import type { StorageProvider } from './storage-provider';

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(directory: string) {
    this.root = resolve(directory);
  }

  async put(key: string, data: Buffer) {
    const filePath = this.path(key);
    await fs.mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
    await fs.writeFile(filePath, data, { flag: 'wx', mode: 0o600 });
  }

  async open(key: string) {
    const filePath = this.path(key);
    await fs.access(filePath);
    return createReadStream(filePath);
  }

  async delete(key: string) {
    await fs.unlink(this.path(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  private path(key: string) {
    const filePath = resolve(this.root, key);
    if (!filePath.startsWith(`${this.root}${sep}`)) {
      throw new Error('Invalid storage key');
    }
    return filePath;
  }
}
