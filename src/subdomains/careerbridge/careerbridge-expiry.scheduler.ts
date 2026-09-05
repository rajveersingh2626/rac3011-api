import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';

const NIGHTLY_JOB_ID = 'careerbridge-expiry-nightly';

@Injectable()
export class CareerbridgeExpiryScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue('careerbridge-expiry') private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      NIGHTLY_JOB_ID,
      { pattern: '0 3 * * *', tz: 'Asia/Kolkata' },
      { name: 'expire-due' },
    );
  }
}
