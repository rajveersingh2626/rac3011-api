import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { CacheTag } from '../cache/cache.constants';
import { env } from '../config/env';
import {
  SITE_REBUILD_JOB_ID,
  SITE_REBUILD_JOB_NAME,
  SITE_REBUILD_QUEUE,
} from './site-rebuild.constants';
import { tagsTriggerRebuild } from './site-rebuild-tags';

export type SiteRebuildJobData = Record<string, never>;

@Injectable()
export class SiteRebuildTrigger {
  private readonly logger = new Logger('SiteRebuildTrigger');

  constructor(@InjectQueue(SITE_REBUILD_QUEUE) private readonly queue: Queue<SiteRebuildJobData>) {}

  async maybeEnqueue(tags: CacheTag[]): Promise<void> {
    if (env.CACHE_INVALIDATION === 'off') return;
    if (env.SITE_REBUILD_ENABLED === 'off') return;
    if (!tagsTriggerRebuild(tags)) return;
    try {
      await this.queue.add(
        SITE_REBUILD_JOB_NAME,
        {},
        {
          jobId: SITE_REBUILD_JOB_ID,
          delay: env.SITE_REBUILD_DEBOUNCE_MS,
          removeOnComplete: true,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );
    } catch (err) {
      this.logger.error(`failed to enqueue site rebuild: ${(err as Error).message}`);
    }
  }
}
