import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../config/env';
import { SiteRebuildTrigger } from '../site-rebuild/site-rebuild-trigger.service';
import { CACHE_PURGE_QUEUE, type CacheTag } from './cache.constants';
import { CacheService } from './cache.service';

export type CachePurgeJobData = { all: true } | { all?: false; tags: CacheTag[] };

const JOB_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 50,
};

@Injectable()
export class CacheInvalidator {
  constructor(
    @InjectQueue(CACHE_PURGE_QUEUE) private readonly queue: Queue<CachePurgeJobData>,
    private readonly siteRebuild: SiteRebuildTrigger,
    private readonly cache: CacheService,
  ) {}

  async purge(tags: CacheTag[]): Promise<void> {
    if (tags.length === 0) return;
    try {
      await Promise.all(tags.map((tag) => this.cache.delByTag(tag)));
    } catch {}
    if (env.CACHE_INVALIDATION === 'off') return;
    await this.queue.add('purge', { tags }, JOB_OPTS);
    await this.siteRebuild.maybeEnqueue(tags);
  }

  async purgeAll(): Promise<void> {
    try {
      await this.cache.purgeAllKeys();
    } catch {}
    if (env.CACHE_INVALIDATION === 'off') return;
    await this.queue.add('purge-all', { all: true }, JOB_OPTS);
  }

}

