import { randomBytes } from 'node:crypto';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const CACHE_REDIS = Symbol('CACHE_REDIS');

export function createCacheRedis(): IORedis {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

// Per-process prefix in test isolates each e2e file's app from every other's shared Redis jobs.
const BULL_PREFIX =
  env.NODE_ENV === 'test'
    ? `rac3011-test-${process.pid}-${randomBytes(4).toString('hex')}`
    : 'bull';

export function bullRootOptions(): { connection: IORedis; prefix: string } {
  return { connection: createCacheRedis(), prefix: BULL_PREFIX };
}
