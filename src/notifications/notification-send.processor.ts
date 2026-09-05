import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { EmailProviderPool } from './email/email-provider-pool.service';
import { NotificationOutboxRepository } from './notification-outbox.repository';
import type { TemplateKey } from './notification.port';
import {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_SEND_JOB,
  NOTIFICATIONS_SWEEP_BATCH_SIZE,
  NOTIFICATIONS_SWEEP_JOB,
  NOTIFICATIONS_SWEEP_STALE_MS,
  sendJobOptions,
} from './notifications.constants';
import { renderEmail, TEMPLATES } from './templates';

type SendJobData = { outboxId: string };

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationSendProcessor extends WorkerHost {
  private readonly logger = new Logger('NotificationSend');

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly outbox: NotificationOutboxRepository,
    private readonly pool: EmailProviderPool,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === NOTIFICATIONS_SWEEP_JOB) {
      await this.sweep();
      return;
    }
    await this.processSend(job as Job<SendJobData>);
  }

  private async processSend(job: Job<SendJobData>): Promise<void> {
    const row = await this.outbox.findById(job.data.outboxId);
    if (!row) {
      this.logger.warn(`outbox row ${job.data.outboxId} not found`);
      return;
    }
    if (row.status === 'sent') return;

    if (!(row.template in TEMPLATES)) {
      await this.outbox.recordFailedAttempt(row.id, `unknown template ${row.template}`, true);
      return;
    }

    try {
      const rendered = renderEmail(row.template as TemplateKey, row.payload);
      const result = await this.pool.send({
        to: row.toAddress,
        subject: row.subject ?? rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await this.outbox.markSent(row.id, result.provider);
    } catch (error) {
      const message = (error as Error).message;
      const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.outbox.recordFailedAttempt(row.id, message, final);
      throw error;
    }
  }

  private async sweep(): Promise<void> {
    const staleBefore = new Date(Date.now() - NOTIFICATIONS_SWEEP_STALE_MS);
    const stale = await this.outbox.findStaleQueued(staleBefore, NOTIFICATIONS_SWEEP_BATCH_SIZE);
    for (const row of stale) {
      try {
        await this.queue.add(NOTIFICATIONS_SEND_JOB, { outboxId: row.id }, sendJobOptions(row.id));
      } catch (error) {
        this.logger.error(
          `sweep failed to enqueue outbox row ${row.id}: ${(error as Error).message}`,
        );
      }
    }
  }
}
