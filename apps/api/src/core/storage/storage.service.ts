import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * File storage for generated documents (payslips today; contracts and
 * IPM/OCR uploads later). Backed by local disk under STORAGE_DIR, mounted
 * as a persistent Docker volume in infra/docker-compose.yml — this is
 * what keeps the whole deployment self-hostable with no third-party
 * dependency, which matters for CDP-Sénégal data-residency requirements.
 * Swap this implementation for an S3/MinIO client without touching any
 * caller if/when object storage is preferred; the interface (relative
 * path in, relative path/buffer out) stays the same either way.
 */
@Injectable()
export class StorageService {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = config.get<string>('STORAGE_DIR', path.join(process.cwd(), 'storage'));
  }

  async save(relativePath: string, content: string | Buffer): Promise<string> {
    const fullPath = this.resolve(relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    return fs.readFile(this.resolve(relativePath));
  }

  private resolve(relativePath: string): string {
    const full = path.normalize(path.join(this.root, relativePath));
    if (!full.startsWith(path.normalize(this.root))) {
      throw new Error('Invalid storage path.');
    }
    return full;
  }
}
