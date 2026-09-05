import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { ConsoleNotificationAdapter } from './console-notification.adapter';
import { NotificationOutboxRepository } from './notification-outbox.repository';
import { NotificationPort, type NotifyInput } from './notification.port';
import {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_SEND_JOB,
  sendJobOptions,
} from './notifications.constants';
import { renderEmail } from './templates';

type ResolvedRecipient = { email: string; userId?: string };

@Injectable()
export class NotificationDispatchService extends NotificationPort {
  private readonly logger = new Logger('NotificationDispatch');

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly outbox: NotificationOutboxRepository,
    private readonly console: ConsoleNotificationAdapter,
  ) {
    super();
  }

  async notify(input: NotifyInput): Promise<void> {
    const channels = input.channels ?? ['email'];
    // push delivery is a later task: a push-only or push+email request is honoured for email,
    // and the push part is silently dropped (no outbox row, no error).
    if (channels.includes('email')) {
      await this.dispatchEmail(input);
    }
    await this.console.notify(input);
  }

  private async dispatchEmail(input: NotifyInput): Promise<void> {
    const recipients = await this.resolveRecipients(input.to);
    if (recipients.length === 0) return;

    const rendered = renderEmail(input.template, input.data);
    const ids = await this.outbox.createQueued(
      recipients.map((r) => ({
        toUserId: r.userId,
        toAddress: r.email,
        template: input.template,
        subject: rendered.subject,
        payload: input.data,
      })),
    );

    for (const id of ids) {
      try {
        await this.queue.add(NOTIFICATIONS_SEND_JOB, { outboxId: id }, sendJobOptions(id));
      } catch (error) {
        this.logger.error(`failed to enqueue outbox row ${id}: ${(error as Error).message}`);
      }
    }
  }

  private async resolveRecipients(to: NotifyInput['to']): Promise<ResolvedRecipient[]> {
    const userIdsToResolve = to.filter((t) => !t.email && t.userId).map((t) => t.userId as string);
    const emailByUserId =
      userIdsToResolve.length > 0
        ? await this.outbox.findUserEmails(userIdsToResolve)
        : new Map<string, string>();

    const seen = new Set<string>();
    const resolved: ResolvedRecipient[] = [];
    for (const recipient of to) {
      let email = recipient.email;
      if (!email && recipient.userId) {
        email = emailByUserId.get(recipient.userId);
        if (!email) {
          this.logger.warn(`no user found for userId ${recipient.userId}; skipping recipient`);
          continue;
        }
      }
      if (!email) continue;

      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({ email, userId: recipient.userId });
    }
    return resolved;
  }
}
