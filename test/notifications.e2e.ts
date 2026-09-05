import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env';
import { FakeEmailTransport } from '../src/notifications/email/transports/fake.transport';
import {
  NOTIFICATIONS_QUEUE,
  NOTIFICATIONS_SEND_JOB,
  sendJobOptions,
} from '../src/notifications/notifications.constants';
import { NotificationPort } from '../src/notifications/notification.port';
import { createTestApp } from './app';
import { testPrisma } from './db';
import { createUser } from './fixtures';

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe('notification dispatch (outbox + BullMQ send worker, spec §7 step 9)', () => {
  let app: INestApplication;
  let allowlisted: string;

  beforeAll(async () => {
    app = await createTestApp();
    allowlisted = env.MAIL_ALLOWLIST[0];
  });

  afterAll(async () => {
    // Drain before close: an undelivered/delayed job left behind would otherwise sit in the
    // shared Redis queue for the next e2e file's own worker to pick up.
    const queue = app.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE));
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('queues one outbox row for an email recipient, then the worker sends it and marks it sent', async () => {
    const notifications = app.get(NotificationPort);
    const fake = app.get(FakeEmailTransport);

    await notifications.notify({
      template: 'otp',
      to: [{ email: allowlisted }],
      data: { otp: '123456', type: 'sign-in' },
    });

    const prisma = testPrisma();
    const queued = await prisma.notificationOutbox.findFirst({
      where: { toAddress: allowlisted, template: 'otp', subject: { contains: '123456' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(queued).not.toBeNull();
    // The worker may already have picked up the row by the time we read it back under load,
    // so only 'queued' or 'sent' are valid here; 'sent' is asserted for real just below.
    expect(['queued', 'sent']).toContain(queued?.status);
    expect(queued?.subject).toContain('123456');

    await waitUntil(async () => {
      const current = await prisma.notificationOutbox.findUnique({ where: { id: queued!.id } });
      return current?.status === 'sent';
    });

    const sentRow = await prisma.notificationOutbox.findUnique({ where: { id: queued!.id } });
    expect(sentRow?.provider).toBe('oracle');
    expect(sentRow?.sentAt).not.toBeNull();
    const delivered = fake.sent.find((m) => m.html.includes('123456'));
    expect(delivered).toBeDefined();
    // Allowlisted recipient: rewriteRecipient delivers it as-is, no [original] subject prefix.
    expect(delivered?.to).toBe(allowlisted);
    expect(delivered?.subject).not.toContain('[');
  });

  it('rewrites a non-allowlisted recipient to the allowlist address with an [original] subject prefix', async () => {
    const notifications = app.get(NotificationPort);
    const fake = app.get(FakeEmailTransport);
    const nonAllowlisted = 'someone-else@example.com';

    await notifications.notify({
      template: 'otp',
      to: [{ email: nonAllowlisted }],
      data: { otp: '654321', type: 'sign-in' },
    });

    const prisma = testPrisma();
    const queued = await prisma.notificationOutbox.findFirst({
      where: { toAddress: nonAllowlisted, template: 'otp', subject: { contains: '654321' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(queued).not.toBeNull();

    await waitUntil(async () => {
      const current = await prisma.notificationOutbox.findUnique({ where: { id: queued!.id } });
      return current?.status === 'sent';
    });

    const delivered = fake.sent.find((m) => m.html.includes('654321'));
    expect(delivered).toBeDefined();
    expect(delivered?.to).toBe(allowlisted);
    expect(delivered?.subject).toContain(`[${nonAllowlisted}]`);
  });

  it("resolves a userId recipient to that user's own email address", async () => {
    const user = await createUser({ email: 'notif-user-a@example.com', name: 'Notif User A' });
    const notifications = app.get(NotificationPort);

    await notifications.notify({
      template: 'otp',
      to: [{ userId: user.id }],
      data: { otp: '222333', type: 'sign-in' },
    });

    const prisma = testPrisma();
    const row = await prisma.notificationOutbox.findFirst({
      where: { toUserId: user.id, template: 'otp' },
      orderBy: { createdAt: 'desc' },
    });
    expect(row).not.toBeNull();
    expect(row?.toAddress).toBe(user.email);
  });

  it('records the first failed attempt (attempts, lastError) without exhausting the row, and a same-jobId re-enqueue while it is still pending does not double-send', async () => {
    const fake = app.get(FakeEmailTransport);
    fake.failNext = 1;
    const notifications = app.get(NotificationPort);

    await notifications.notify({
      template: 'otp',
      to: [{ email: allowlisted }],
      data: { otp: '999000', type: 'sign-in' },
    });

    const prisma = testPrisma();
    const queued = await prisma.notificationOutbox.findFirst({
      where: { toAddress: allowlisted, template: 'otp', subject: { contains: '999000' } },
      orderBy: { createdAt: 'desc' },
    });
    expect(queued).not.toBeNull();

    // Capture the row at the exact moment attempts first hits 1, rather than re-querying after
    // waitUntil resolves, to keep the window tight against NOTIFICATIONS_RETRY_DELAY_MS's retry.
    let afterFirstAttempt: Awaited<ReturnType<typeof prisma.notificationOutbox.findUnique>> = null;
    await waitUntil(async () => {
      const current = await prisma.notificationOutbox.findUnique({ where: { id: queued!.id } });
      if ((current?.attempts ?? 0) >= 1) {
        afterFirstAttempt = current;
        return true;
      }
      return false;
    });
    expect(afterFirstAttempt?.status).toBe('queued');
    expect(afterFirstAttempt?.attempts).toBe(1);
    expect(afterFirstAttempt?.lastError).toBeTruthy();

    // Simulate a sweep re-enqueue of this still-pending row: same jobId, BullMQ returns the
    // existing job unchanged instead of creating a second one.
    const queue = app.get<Queue>(getQueueToken(NOTIFICATIONS_QUEUE));
    const jobBefore = await queue.getJob(queued!.id);
    expect(jobBefore).toBeDefined();
    const stateBefore = await jobBefore!.getState();

    await queue.add(NOTIFICATIONS_SEND_JOB, { outboxId: queued!.id }, sendJobOptions(queued!.id));

    const jobAfter = await queue.getJob(queued!.id);
    expect(jobAfter).toBeDefined();
    expect(jobAfter!.id).toBe(jobBefore!.id);
    expect(await jobAfter!.getState()).toBe(stateBefore);

    const deliveries = fake.sent.filter((m) => m.html.includes('999000'));
    expect(deliveries.length).toBeLessThanOrEqual(1);
  });
});
