import { Injectable, Logger } from '@nestjs/common';
import { env } from '../config/env';
import { CLOUDFLARE_PURGE_BATCH_SIZE } from './cache.constants';
import { CloudflarePurgeClient } from './cloudflare-purge.port';

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

@Injectable()
export class LiveCloudflarePurgeClient extends CloudflarePurgeClient {
  private readonly logger = new Logger('LiveCloudflarePurgeClient');

  private async call(body: Record<string, unknown>): Promise<void> {
    const url = `https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Email': env.CLOUDFLARE_API_EMAIL ?? '',
        'X-Auth-Key': env.CLOUDFLARE_API_KEY ?? '',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Cloudflare purge failed (${res.status}): ${text}`);
    }
  }

  async purgeUrls(urls: string[]): Promise<void> {
    if (urls.length === 0) return;
    for (const batch of chunk(urls, CLOUDFLARE_PURGE_BATCH_SIZE)) {
      await this.call({ files: batch });
    }
    this.logger.log(`purged ${urls.length} url(s)`);
  }

  async purgePrefix(prefix: string): Promise<void> {
    await this.call({ prefixes: [prefix] });
    this.logger.log(`purged prefix ${prefix}`);
  }
}
