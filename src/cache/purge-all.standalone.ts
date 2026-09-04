import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { CACHE_PURGE_QUEUE } from './cache.constants';
import type { CachePurgeJobData } from './cache-invalidator.service';

// Seed scripts use a raw PrismaClient (no extension attached), so this is their only purge path;
// never throws, since a Redis outage at deploy time must not block container startup.
export async function purgeAllStandalone(): Promise<void> {
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
  });
  try {
    await connection.connect();
    const queue = new Queue<CachePurgeJobData>(CACHE_PURGE_QUEUE, { connection });
    await queue.add(
      'purge-all',
      { all: true },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
    await queue.close();
  } catch (err) {
    console.error('purgeAllStandalone: skipped edge/L2 purge, Redis unreachable', err);
  } finally {
    connection.disconnect();
  }
}
