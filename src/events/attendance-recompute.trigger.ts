import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  ATTENDANCE_RECOMPUTE_DEBOUNCE_MS,
  ATTENDANCE_RECOMPUTE_JOB_NAME,
  ATTENDANCE_RECOMPUTE_QUEUE,
} from './attendance-recompute.constants';

export type AttendanceRecomputeJobData = { eventId: string; clubId: string };

@Injectable()
export class AttendanceRecomputeTrigger {
  private readonly logger = new Logger('AttendanceRecomputeTrigger');

  constructor(
    @InjectQueue(ATTENDANCE_RECOMPUTE_QUEUE)
    private readonly queue: Queue<AttendanceRecomputeJobData>,
  ) {}

  // Coalesces a burst of check-ins for the same (event, club) into one recompute a few seconds later.
  async schedule(eventId: string, clubId: string): Promise<void> {
    try {
      await this.queue.add(
        ATTENDANCE_RECOMPUTE_JOB_NAME,
        { eventId, clubId },
        {
          debounce: { id: `${eventId}:${clubId}`, ttl: ATTENDANCE_RECOMPUTE_DEBOUNCE_MS },
          delay: ATTENDANCE_RECOMPUTE_DEBOUNCE_MS,
          removeOnComplete: true,
          removeOnFail: 20,
          attempts: 2,
        },
      );
    } catch (err) {
      this.logger.error(`failed to schedule attendance recompute: ${(err as Error).message}`);
    }
  }
}
