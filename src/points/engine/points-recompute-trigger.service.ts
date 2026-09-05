import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { POINTS_RECOMPUTE_JOB_NAME, POINTS_RECOMPUTE_QUEUE } from './points-recompute.constants';

export type PointsRecomputeJobData = { ryYear: number };

@Injectable()
export class PointsRecomputeTrigger {
  private readonly logger = new Logger('PointsRecomputeTrigger');

  constructor(
    @InjectQueue(POINTS_RECOMPUTE_QUEUE) private readonly queue: Queue<PointsRecomputeJobData>,
  ) {}

  async enqueueRecomputeAll(ryYear: number): Promise<void> {
    try {
      await this.queue.add(
        POINTS_RECOMPUTE_JOB_NAME,
        { ryYear },
        { jobId: `recompute-all-${ryYear}`, removeOnComplete: true, removeOnFail: 20, attempts: 2 },
      );
    } catch (err) {
      this.logger.error(`failed to enqueue points recompute-all: ${(err as Error).message}`);
    }
  }
}
