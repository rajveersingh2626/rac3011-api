import { Inject, Injectable } from '@nestjs/common';
import type IORedis from 'ioredis';
import {
  CACHE_KEY_PREFIX,
  CACHE_L2_TTL_SECONDS,
  CACHE_TAG_SET_PREFIX,
  type CacheTag,
} from './cache.constants';
import { CACHE_REDIS } from './redis.provider';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_REDIS) private readonly redis: IORedis) {}

  async get<T>(key: string): Promise<T | undefined> {
    const raw = await this.redis.get(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  }

  async set<T>(
    key: string,
    value: T,
    tags: CacheTag[],
    ttlSeconds = CACHE_L2_TTL_SECONDS,
  ): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    for (const tag of tags) pipeline.sadd(`${CACHE_TAG_SET_PREFIX}${tag}`, key);
    await pipeline.exec();
  }

  async delByTag(tag: CacheTag): Promise<number> {
    const setKey = `${CACHE_TAG_SET_PREFIX}${tag}`;
    const keys = await this.redis.smembers(setKey);
    if (keys.length > 0) await this.redis.del(...keys, setKey);
    else await this.redis.del(setKey);
    return keys.length;
  }

  async purgeAllKeys(): Promise<void> {
    const pattern = `${CACHE_KEY_PREFIX}*`;
    const tagPattern = `${CACHE_TAG_SET_PREFIX}*`;
    for (const p of [pattern, tagPattern]) {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(cursor, 'MATCH', p, 'COUNT', 500);
        cursor = next;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    }
  }
}
