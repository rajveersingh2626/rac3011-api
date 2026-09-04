import type { Queue } from 'bullmq';
import { afterEach, describe, expect, it } from 'vitest';
import { env } from '../config/env';
import { SITE_REBUILD_JOB_ID } from './site-rebuild.constants';
import { SiteRebuildTrigger, type SiteRebuildJobData } from './site-rebuild-trigger.service';

type FakeJob = { id: string; name: string; data: SiteRebuildJobData };

// Mirrors BullMQ's real addDelayedJob semantics: adding a job whose jobId already exists returns
// the existing job instead of creating a new one (verified against addDelayedJob-6.lua).
function fakeQueue() {
  const jobs = new Map<string, FakeJob>();
  let addCalls = 0;
  const queue = {
    add: (name: string, data: SiteRebuildJobData, opts: { jobId?: string }) => {
      addCalls++;
      if (opts.jobId && jobs.has(opts.jobId)) return Promise.resolve(jobs.get(opts.jobId));
      const job: FakeJob = { id: opts.jobId ?? String(jobs.size + 1), name, data };
      jobs.set(opts.jobId ?? job.id, job);
      return Promise.resolve(job);
    },
  };
  return {
    queue: queue as unknown as Queue<SiteRebuildJobData>,
    jobs,
    getAddCalls: () => addCalls,
  };
}

describe('SiteRebuildTrigger', () => {
  const originalEnabled = env.SITE_REBUILD_ENABLED;
  const originalInvalidation = env.CACHE_INVALIDATION;

  afterEach(() => {
    env.SITE_REBUILD_ENABLED = originalEnabled;
    env.CACHE_INVALIDATION = originalInvalidation;
  });

  it('does not enqueue when SITE_REBUILD_ENABLED is off (the default)', async () => {
    env.SITE_REBUILD_ENABLED = 'off';
    const { queue, jobs } = fakeQueue();
    await new SiteRebuildTrigger(queue).maybeEnqueue(['content']);
    expect(jobs.size).toBe(0);
  });

  it('does not enqueue when CACHE_INVALIDATION is off, even if rebuild is enabled', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.CACHE_INVALIDATION = 'off';
    const { queue, jobs } = fakeQueue();
    await new SiteRebuildTrigger(queue).maybeEnqueue(['content']);
    expect(jobs.size).toBe(0);
  });

  it('does not enqueue for tags outside the allow-list', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.CACHE_INVALIDATION = 'on';
    const { queue, jobs } = fakeQueue();
    await new SiteRebuildTrigger(queue).maybeEnqueue(['reports', 'points', 'members']);
    expect(jobs.size).toBe(0);
  });

  it('enqueues a single job with the fixed jobId for an allow-listed tag', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.CACHE_INVALIDATION = 'on';
    const { queue, jobs } = fakeQueue();
    await new SiteRebuildTrigger(queue).maybeEnqueue(['clubs']);
    expect(jobs.size).toBe(1);
    expect(jobs.has(SITE_REBUILD_JOB_ID)).toBe(true);
  });

  it('coalesces 50 rapid invalidations into exactly one enqueued rebuild job', async () => {
    env.SITE_REBUILD_ENABLED = 'on';
    env.CACHE_INVALIDATION = 'on';
    const { queue, jobs, getAddCalls } = fakeQueue();
    const trigger = new SiteRebuildTrigger(queue);
    await Promise.all(Array.from({ length: 50 }, () => trigger.maybeEnqueue(['content'])));
    expect(getAddCalls()).toBe(50);
    expect(jobs.size).toBe(1);
  });
});
