import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PointsRepository } from '../points.repository';
import { PointsEngineService } from './points-engine.service';
import { POINTS_RECOMPUTE_QUEUE } from './points-recompute.constants';
import type { PointsRecomputeJobData } from './points-recompute-trigger.service';

@Processor(POINTS_RECOMPUTE_QUEUE)
export class PointsRecomputeProcessor extends WorkerHost {
  private readonly logger = new Logger('PointsRecomputeProcessor');

  constructor(
    private readonly rules: PointsRepository,
    private readonly engine: PointsEngineService,
  ) {
    super();
  }

  async process(job: Job<PointsRecomputeJobData>): Promise<void> {
    const { ryYear } = job.data;
    const clubIds = await this.rules.listActiveClubIds();
    this.logger.log(`recompute-all: ${clubIds.length} club(s) for RY ${ryYear}`);
    for (const clubId of clubIds) {
      await this.engine.recompute({ clubId, ryYear, trigger: 'rule.changed' });
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `points recompute-all failed after ${job.attemptsMade} attempt(s): ${error.message}`,
    );
  }
}
