import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { GithubDispatchClient } from './github-dispatch.client';
import { SITE_REBUILD_QUEUE } from './site-rebuild.constants';

@Processor(SITE_REBUILD_QUEUE)
export class SiteRebuildProcessor extends WorkerHost {
  private readonly logger = new Logger('SiteRebuildProcessor');

  constructor(private readonly github: GithubDispatchClient) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`dispatching site rebuild (job ${job.id})`);
    await this.github.dispatch();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `site rebuild dispatch failed after ${job.attemptsMade} attempt(s): ${error.message}`,
    );
  }
}
