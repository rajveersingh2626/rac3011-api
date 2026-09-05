import type { JobsOptions } from 'bullmq';
import { env } from '../config/env';

export const NOTIFICATIONS_QUEUE = 'notifications';
export const NOTIFICATIONS_SEND_JOB = 'send';
export const NOTIFICATIONS_SWEEP_JOB = 'sweep';
export const NOTIFICATIONS_MAX_ATTEMPTS = 5;
export const NOTIFICATIONS_SWEEP_CRON = '*/5 * * * *';
export const NOTIFICATIONS_SWEEP_STALE_MS = 2 * 60 * 1000;
export const NOTIFICATIONS_SWEEP_BATCH_SIZE = 200;

// jobId = outboxId so a sweep re-enqueue of a row whose original job is still pending is a BullMQ no-op.
export function sendJobOptions(outboxId: string): JobsOptions {
  return {
    jobId: outboxId,
    attempts: NOTIFICATIONS_MAX_ATTEMPTS,
    backoff: { type: 'exponential', delay: env.NOTIFICATIONS_RETRY_DELAY_MS },
    removeOnComplete: true,
    removeOnFail: 1000,
  };
}
