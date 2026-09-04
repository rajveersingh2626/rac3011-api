import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { CachePurgeJobData } from './cache-invalidator.service';
import { CACHE_PURGE_QUEUE } from './cache.constants';
import { CacheService } from './cache.service';
import { CloudflarePurgeClient } from './cloudflare-purge.port';
import { PUBLIC_PREFIX, urlsForTags } from './tag-url-map';

@Processor(CACHE_PURGE_QUEUE)
export class CachePurgeProcessor extends WorkerHost {
  constructor(
    private readonly cache: CacheService,
    private readonly cf: CloudflarePurgeClient,
  ) {
    super();
  }

  async process(job: Job<CachePurgeJobData>): Promise<void> {
    if (job.data.all) {
      await this.cache.purgeAllKeys();
      await this.cf.purgePrefix(PUBLIC_PREFIX);
      return;
    }
    for (const tag of job.data.tags) await this.cache.delByTag(tag);
    await this.cf.purgeUrls(urlsForTags(job.data.tags));
  }
}
