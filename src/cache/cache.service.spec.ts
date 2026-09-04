import type IORedis from 'ioredis';
import { describe, expect, it } from 'vitest';
import { CacheService } from './cache.service';

class FakePipeline {
  private readonly ops: (() => void)[] = [];
  constructor(
    private readonly store: Map<string, string>,
    private readonly sets: Map<string, Set<string>>,
  ) {}
  set(key: string, value: string): this {
    this.ops.push(() => this.store.set(key, value));
    return this;
  }
  sadd(key: string, member: string): this {
    this.ops.push(() => {
      const set = this.sets.get(key) ?? new Set<string>();
      set.add(member);
      this.sets.set(key, set);
    });
    return this;
  }
  exec(): Promise<void> {
    for (const op of this.ops) op();
    return Promise.resolve();
  }
}

function fakeRedis() {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();
  const redis = {
    store,
    sets,
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    pipeline: () => new FakePipeline(store, sets),
    smembers: (key: string) => Promise.resolve([...(sets.get(key) ?? [])]),
    del: (...keys: string[]) => {
      for (const k of keys) {
        store.delete(k);
        sets.delete(k);
      }
      return Promise.resolve(keys.length);
    },
    scan: () => Promise.resolve(['0', [] as string[]] as [string, string[]]),
  };
  return { redis, store, sets };
}

describe('CacheService', () => {
  it('stores a value and tags it, then a hit returns the parsed value', async () => {
    const { redis, sets } = fakeRedis();
    const cache = new CacheService(redis as unknown as IORedis);
    await cache.set('k1', { a: 1 }, ['clubs']);
    expect(await cache.get('k1')).toEqual({ a: 1 });
    expect([...(sets.get('rac3011:tag:clubs') ?? [])]).toEqual(['k1']);
  });

  it('a miss returns undefined', async () => {
    const { redis } = fakeRedis();
    const cache = new CacheService(redis as unknown as IORedis);
    expect(await cache.get('missing')).toBeUndefined();
  });

  it('delByTag removes every key tagged with it plus the tag set itself', async () => {
    const { redis, sets } = fakeRedis();
    const cache = new CacheService(redis as unknown as IORedis);
    await cache.set('k1', { a: 1 }, ['clubs']);
    await cache.set('k2', { a: 2 }, ['clubs', 'projects']);
    const removed = await cache.delByTag('clubs');
    expect(removed).toBe(2);
    expect(await cache.get('k1')).toBeUndefined();
    expect(await cache.get('k2')).toBeUndefined();
    expect(sets.has('rac3011:tag:clubs')).toBe(false);
  });
});
