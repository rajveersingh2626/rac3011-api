import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { env } from '../config/env';
import { SiteRebuildTrigger } from '../site-rebuild/site-rebuild-trigger.service';
import { CACHE_PURGE_QUEUE, type CacheTag } from './cache.constants';

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
  ) {}

  async purge(tags: CacheTag[]): Promise<void> {
    if (tags.length === 0 || env.CACHE_INVALIDATION === 'off') return;
    await this.queue.add('purge', { tags }, JOB_OPTS);
    await this.siteRebuild.maybeEnqueue(tags);
  }

  async purgeAll(): Promise<void> {
    await this.queue.add('purge-all', { all: true }, JOB_OPTS);
  }
}
