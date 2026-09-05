import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ryYearOf } from '../common/ry-year';
import { PointsEngineService } from '../points/engine/points-engine.service';
import type { AttendanceRecomputeJobData } from './attendance-recompute.trigger';
import { ATTENDANCE_RECOMPUTE_QUEUE } from './attendance-recompute.constants';
import { EventsAdminRepository } from './events-admin.repository';

@Processor(ATTENDANCE_RECOMPUTE_QUEUE)
export class AttendanceRecomputeProcessor extends WorkerHost {
  private readonly logger = new Logger('AttendanceRecomputeProcessor');

  constructor(
    private readonly events: EventsAdminRepository,
    private readonly pointsEngine: PointsEngineService,
  ) {
    super();
  }

  async process(job: Job<AttendanceRecomputeJobData>): Promise<void> {
    const { eventId, clubId } = job.data;
    const event = await this.events.findById(eventId);
    if (!event) return;
    const month = new Date(
      Date.UTC(event.startsAt.getUTCFullYear(), event.startsAt.getUTCMonth(), 1),
    );
    await this.pointsEngine.recompute({
      clubId,
      ryYear: ryYearOf(event.startsAt),
      month,
      trigger: 'checkin.created',
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `attendance recompute failed after ${job.attemptsMade} attempt(s): ${error.message}`,
    );
  }
}
