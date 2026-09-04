import type { INestApplication } from '@nestjs/common';
import IORedis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CloudflarePurgeClient } from '../src/cache/cloudflare-purge.port';
import type { NoopCloudflarePurgeClient } from '../src/cache/noop-cloudflare-purge.client';
import { env } from '../src/config/env';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';

type ClubListResponse = { items: { name: string }[]; total: number };

async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe('L2 cache hit/miss + write-derived invalidation (§14.4, §14.7.2)', () => {
  let app: INestApplication;
  let president: TestAgent;
  let cf: NoopCloudflarePurgeClient;

  beforeAll(async () => {
    const redis = new IORedis(env.REDIS_URL);
    await redis.flushdb();
    await redis.quit();

    await createClub({ id: 'CACHE-CLUB-A', name: 'Cache Club Original', zoneName: 'Prithvi' });
    await createUser({
      email: 'cache-president@example.com',
      name: 'President Cache',
      clubId: 'CACHE-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'CACHE-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'CACHE-CLUB-A' },
      ],
    });
    app = await createTestApp();
    cf = app.get(CloudflarePurgeClient);
    president = await signInAndVerify(app, 'cache-president@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a second GET /public/clubs is served from L2 with zero Prisma queries', async () => {
    const prisma = app.get(PrismaService);

    const first = await request(httpServer(app)).get('/public/clubs').expect(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.headers['cache-control']).toContain('s-maxage=600');
    expect(first.headers['cache-tag']).toBe('clubs');

    let queryCount = 0;
    prisma.onQuery(() => {
      queryCount += 1;
    });

    const second = await request(httpServer(app)).get('/public/clubs').expect(200);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
    expect(queryCount).toBe(0);
  });

  it('PATCH /clubs/:id purges L2 and Cloudflare with the right URL, next GET reflects the change', async () => {
    cf.purgedUrlBatches.length = 0;

    await request(httpServer(app)).get('/public/clubs').expect(200);

    await president.patch('/clubs/CACHE-CLUB-A').send({ name: 'Cache Club Renamed' }).expect(200);

    await waitUntil(() => cf.purgedUrlBatches.length > 0);
    expect(cf.purgedUrlBatches.flat()).toContain(`${env.AUTH_URL}/public/clubs`);

    const after = await request(httpServer(app)).get('/public/clubs').expect(200);
    const names = (after.body as ClubListResponse).items.map((i) => i.name);
    expect(names).toContain('Cache Club Renamed');
  });
});

describe('authenticated routes never carry a Cache-Tag (§14.7.3)', () => {
  let app: INestApplication;
  let president: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'CACHE-CLUB-B', name: 'Cache Club B', zoneName: 'Prithvi' });
    await createUser({
      email: 'cache-president-b@example.com',
      name: 'President Cache B',
      clubId: 'CACHE-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'CACHE-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'CACHE-CLUB-B' },
      ],
    });
    app = await createTestApp();
    president = await signInAndVerify(app, 'cache-president-b@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /clubs (authenticated) always returns private, no-store and no Cache-Tag', async () => {
    const res = await president.get('/clubs').expect(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['cache-tag']).toBeUndefined();
  });

  it('GET /me (authenticated) also returns private, no-store and no Cache-Tag', async () => {
    const res = await president.get('/me').expect(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['cache-tag']).toBeUndefined();
  });
});
