import IORedis from 'ioredis';
import { env } from '../config/env';

export const CACHE_REDIS = Symbol('CACHE_REDIS');

export function createCacheRedis(): IORedis {
  return new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
}
