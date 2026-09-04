import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

const NIGHTLY_JOB_ID = 'link-health-nightly-recheck';

@Injectable()
export class LinkHealthScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue('link-health') private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      NIGHTLY_JOB_ID,
      { pattern: '0 2 * * *', tz: 'Asia/Kolkata' },
      { name: 'recheck-all' },
    );
  }
}
