import { Injectable, Logger } from '@nestjs/common';
import { CloudflarePurgeClient } from './cloudflare-purge.port';

// Bound whenever CLOUDFLARE_* env vars are absent (local/dev/test). Records calls in memory so
// tests can assert purge correctness (§14.7.2) without real Cloudflare credentials.
@Injectable()
export class NoopCloudflarePurgeClient extends CloudflarePurgeClient {
  private readonly logger = new Logger('NoopCloudflarePurgeClient');
  readonly purgedUrlBatches: string[][] = [];
  readonly purgedPrefixes: string[] = [];

  async purgeUrls(urls: string[]): Promise<void> {
    this.purgedUrlBatches.push(urls);
    this.logger.warn(`skipped edge purge of ${urls.length} url(s), CLOUDFLARE_* env not set`);
    await Promise.resolve();
  }

  async purgePrefix(prefix: string): Promise<void> {
    this.purgedPrefixes.push(prefix);
    this.logger.warn(`skipped edge purge-all (${prefix}), CLOUDFLARE_* env not set`);
    await Promise.resolve();
  }
}
