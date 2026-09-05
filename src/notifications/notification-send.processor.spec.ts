import type { Job, Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';
import type { EmailProviderPool } from './email/email-provider-pool.service';
import { NotificationSendProcessor } from './notification-send.processor';
import type { NotificationOutboxRepository, OutboxRow } from './notification-outbox.repository';

function row(overrides: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: 'outbox-1',
    toUserId: null,
    toAddress: 'a@example.com',
    template: 'otp',
    subject: 'Your Rotaract District 3011 code is 123456',
    payload: { otp: '123456', type: 'sign-in' },
    status: 'queued',
    provider: null,
    attempts: 0,
    lastError: null,
    sentAt: null,
    ...overrides,
  };
}

function fakeOutbox(initial?: OutboxRow) {
  const findById = vi.fn(() => Promise.resolve(initial ?? null));
  const markSent = vi.fn(() => Promise.resolve());
  const recordFailedAttempt = vi.fn(() => Promise.resolve());
  const findStaleQueued = vi.fn(() => Promise.resolve<OutboxRow[]>([]));
  return {
    repo: {
      findById,
      markSent,
      recordFailedAttempt,
      findStaleQueued,
    } as unknown as NotificationOutboxRepository,
    findById,
    markSent,
    recordFailedAttempt,
    findStaleQueued,
  };
}

function fakePool(impl: (msg: unknown) => { provider: string }) {
  const send = vi.fn(impl);
  return { pool: { send } as unknown as EmailProviderPool, send };
}

function fakeQueue() {
  const jobs: { name: string; data: unknown; opts: unknown }[] = [];
  const add = vi.fn((name: string, data: unknown, opts: unknown) => {
    jobs.push({ name, data, opts });
    return Promise.resolve();
  });
  return { queue: { add } as unknown as Queue, jobs, add };
}

function sendJob(data: { outboxId: string }, opts: { attempts?: number } = { attempts: 5 }): Job {
  return { name: 'send', data, attemptsMade: 0, opts } as unknown as Job;
}

describe('NotificationSendProcessor', () => {
  it('renders the template, sends via the pool, and marks the row sent', async () => {
    const outbox = fakeOutbox(row());
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await processor.process(sendJob({ outboxId: 'outbox-1' }));

    const sent = pool.send.mock.calls[0][0] as { to: string; subject: string };
    expect(sent.to).toBe('a@example.com');
    expect(sent.subject).toContain('123456');
    expect(outbox.markSent).toHaveBeenCalledWith('outbox-1', 'oracle');
    expect(outbox.recordFailedAttempt).not.toHaveBeenCalled();
  });

  it('warns and returns when the outbox row is missing', async () => {
    const outbox = fakeOutbox(undefined);
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await expect(processor.process(sendJob({ outboxId: 'missing' }))).resolves.toBeUndefined();
    expect(pool.send).not.toHaveBeenCalled();
  });

  it('is idempotent: returns without re-sending when the row is already sent', async () => {
    const outbox = fakeOutbox(row({ status: 'sent' }));
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await processor.process(sendJob({ outboxId: 'outbox-1' }));

    expect(pool.send).not.toHaveBeenCalled();
    expect(outbox.markSent).not.toHaveBeenCalled();
  });

  it('records a non-final failed attempt and rethrows so BullMQ retries', async () => {
    const outbox = fakeOutbox(row());
    const pool = fakePool(() => {
      throw new Error('smtp down');
    });
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await expect(
      processor.process(sendJob({ outboxId: 'outbox-1' }, { attempts: 5 })),
    ).rejects.toThrow('smtp down');

    expect(outbox.recordFailedAttempt).toHaveBeenCalledWith('outbox-1', 'smtp down', false);
  });

  it('marks the failure final on the last allowed attempt', async () => {
    const outbox = fakeOutbox(row());
    const pool = fakePool(() => {
      throw new Error('smtp down');
    });
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    const job = {
      name: 'send',
      data: { outboxId: 'outbox-1' },
      attemptsMade: 4,
      opts: { attempts: 5 },
    } as unknown as Job;
    await expect(processor.process(job)).rejects.toThrow('smtp down');

    expect(outbox.recordFailedAttempt).toHaveBeenCalledWith('outbox-1', 'smtp down', true);
  });

  it('sweep re-enqueues a send job for every stale queued row, each with jobId = outboxId', async () => {
    const outbox = fakeOutbox();
    outbox.findStaleQueued.mockResolvedValueOnce([row({ id: 'a' }), row({ id: 'b' })]);
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await processor.process({ name: 'sweep', data: {} } as unknown as Job);

    expect(queue.jobs.map((j) => ({ name: j.name, data: j.data }))).toEqual([
      { name: 'send', data: { outboxId: 'a' } },
      { name: 'send', data: { outboxId: 'b' } },
    ]);
    expect(queue.jobs[0].opts).toMatchObject({ jobId: 'a' });
    expect(queue.jobs[1].opts).toMatchObject({ jobId: 'b' });
  });

  it('sweep continues past a row whose enqueue throws, logging and still enqueuing the rest', async () => {
    const outbox = fakeOutbox();
    outbox.findStaleQueued.mockResolvedValueOnce([row({ id: 'a' }), row({ id: 'b' })]);
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    queue.add.mockRejectedValueOnce(new Error('redis unavailable'));
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await expect(
      processor.process({ name: 'sweep', data: {} } as unknown as Job),
    ).resolves.toBeUndefined();

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.jobs.map((j) => ({ name: j.name, data: j.data }))).toEqual([
      { name: 'send', data: { outboxId: 'b' } },
    ]);
  });

  it('records an unknown template as an immediately final failure without calling the pool or rethrowing', async () => {
    const outbox = fakeOutbox(row({ template: 'not-a-real-template' }));
    const pool = fakePool(() => ({ provider: 'oracle' }));
    const queue = fakeQueue();
    const processor = new NotificationSendProcessor(queue.queue, outbox.repo, pool.pool);

    await expect(processor.process(sendJob({ outboxId: 'outbox-1' }))).resolves.toBeUndefined();

    expect(pool.send).not.toHaveBeenCalled();
    expect(outbox.markSent).not.toHaveBeenCalled();
    expect(outbox.recordFailedAttempt).toHaveBeenCalledWith(
      'outbox-1',
      'unknown template not-a-real-template',
      true,
    );
  });
});
