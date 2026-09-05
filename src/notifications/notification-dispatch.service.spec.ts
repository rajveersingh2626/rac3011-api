import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import type { ConsoleNotificationAdapter } from './console-notification.adapter';
import { NotificationDispatchService } from './notification-dispatch.service';
import type {
  NotificationOutboxRepository,
  QueuedOutboxInput,
} from './notification-outbox.repository';
import type { NotifyInput } from './notification.port';

function fakeOutbox(emails: Record<string, string> = {}) {
  const createQueued = vi.fn((rows: QueuedOutboxInput[]) =>
    Promise.resolve(rows.map((_, i) => `outbox-${i}`)),
  );
  const findUserEmails = vi.fn((userIds: string[]) => {
    const map = new Map<string, string>();
    for (const id of userIds) if (emails[id]) map.set(id, emails[id]);
    return Promise.resolve(map);
  });
  return {
    repo: { createQueued, findUserEmails } as unknown as NotificationOutboxRepository,
    createQueued,
    findUserEmails,
  };
}

function fakeQueue() {
  const jobs: { name: string; data: unknown; opts: unknown }[] = [];
  const add = vi.fn((name: string, data: unknown, opts: unknown) => {
    jobs.push({ name, data, opts });
    return Promise.resolve();
  });
  return { queue: { add } as unknown as Queue, jobs, add };
}

function fakeConsole() {
  const notify = vi.fn(() => Promise.resolve());
  return { adapter: { notify } as unknown as ConsoleNotificationAdapter, notify };
}

const BASE_INPUT: NotifyInput = {
  template: 'otp',
  to: [{ email: 'a@example.com' }],
  data: { otp: '123456', type: 'sign-in' },
};

describe('NotificationDispatchService', () => {
  it('creates one queued outbox row and enqueues one job for a plain email recipient', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await service.notify(BASE_INPUT);

    expect(outbox.createQueued).toHaveBeenCalledTimes(1);
    const rows = outbox.createQueued.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      toAddress: 'a@example.com',
      template: 'otp',
      toUserId: undefined,
    });
    expect(rows[0].subject).toContain('123456');

    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0].name).toBe('send');
    expect(queue.jobs[0].data).toEqual({ outboxId: 'outbox-0' });
    expect(queue.jobs[0].opts).toMatchObject({
      jobId: 'outbox-0',
      attempts: 5,
      backoff: { type: 'exponential' },
      removeOnComplete: true,
      removeOnFail: 1000,
    });
  });

  it('resolves a userId recipient to their email via the repository', async () => {
    const outbox = fakeOutbox({ 'user-1': 'resolved@example.com' });
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await service.notify({ ...BASE_INPUT, to: [{ userId: 'user-1' }] });

    expect(outbox.findUserEmails).toHaveBeenCalledWith(['user-1']);
    const rows = outbox.createQueued.mock.calls[0][0];
    expect(rows[0]).toMatchObject({ toAddress: 'resolved@example.com', toUserId: 'user-1' });
  });

  it('skips an unknown userId recipient with no outbox row and no error', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await expect(
      service.notify({ ...BASE_INPUT, to: [{ userId: 'ghost' }] }),
    ).resolves.toBeUndefined();

    expect(outbox.createQueued).not.toHaveBeenCalled();
    expect(queue.jobs).toHaveLength(0);
  });

  it('dedupes recipients by lower-cased email', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await service.notify({
      ...BASE_INPUT,
      to: [{ email: 'Same@Example.com' }, { email: 'same@example.com' }],
    });

    const rows = outbox.createQueued.mock.calls[0][0];
    expect(rows).toHaveLength(1);
    expect(rows[0].toAddress).toBe('Same@Example.com');
  });

  it('ignores a push-only request: no outbox row, no error, console adapter still notified', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await service.notify({ ...BASE_INPUT, channels: ['push'] });

    expect(outbox.createQueued).not.toHaveBeenCalled();
    expect(queue.jobs).toHaveLength(0);
    expect(consoleAdapter.notify).toHaveBeenCalledTimes(1);
  });

  it('logs and swallows an enqueue failure, leaving the row queued', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    queue.add.mockRejectedValueOnce(new Error('redis unavailable'));
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await expect(service.notify(BASE_INPUT)).resolves.toBeUndefined();
    expect(outbox.createQueued).toHaveBeenCalledTimes(1);
  });

  it('propagates a database failure from the outbox repository', async () => {
    const outbox = fakeOutbox();
    outbox.createQueued.mockRejectedValueOnce(new Error('db down'));
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await expect(service.notify(BASE_INPUT)).rejects.toThrow('db down');
  });

  it('always calls ConsoleNotificationAdapter.notify with the original input', async () => {
    const outbox = fakeOutbox();
    const queue = fakeQueue();
    const consoleAdapter = fakeConsole();
    const service = new NotificationDispatchService(
      queue.queue,
      outbox.repo,
      consoleAdapter.adapter,
    );

    await service.notify(BASE_INPUT);

    expect(consoleAdapter.notify).toHaveBeenCalledWith(BASE_INPUT);
  });
});
