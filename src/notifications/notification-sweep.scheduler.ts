import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_SWEEP_CRON,
  NOTIFICATIONS_SWEEP_JOB,
} from './notifications.constants';

const SWEEP_JOB_ID = 'notifications-outbox-sweep';

@Injectable()
export class NotificationSweepScheduler implements OnApplicationBootstrap {
  constructor(@InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.queue.upsertJobScheduler(
      SWEEP_JOB_ID,
      { pattern: NOTIFICATIONS_SWEEP_CRON },
      { name: NOTIFICATIONS_SWEEP_JOB },
    );
  }
}
