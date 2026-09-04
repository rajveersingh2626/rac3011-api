import type { INestApplication } from '@nestjs/common';
import IORedis from 'ioredis';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { env } from '../src/config/env';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, httpServer } from './app';
import { createClub, createPublishedProject } from './fixtures';

describe('public repository query counts stay O(1) (§14.5)', () => {
  let app: INestApplication;
  const redis = new IORedis(env.REDIS_URL);

  beforeAll(async () => {
    app = await createTestApp();
    await createClub({ id: 'PERF-CLUB-A', name: 'Perf Club A', zoneName: 'Prithvi' });
  });

  afterAll(async () => {
    await redis.quit();
    await app.close();
  });

  async function countQueriesFor(path: string): Promise<number> {
    await redis.flushdb();
    const prisma = app.get(PrismaService);
    let count = 0;
    prisma.onQuery(() => {
      count += 1;
    });
    await request(httpServer(app)).get(path).expect(200);
    return count;
  }

  it('/public/home issues the same query count with 1 or 5 published projects', async () => {
    await createPublishedProject({
      id: 'PERF-P1',
      slug: 'perf-p1',
      title: 'Perf Project 1',
      clubIds: ['PERF-CLUB-A'],
    });
    const withOne = await countQueriesFor('/public/home');

    for (let i = 2; i <= 5; i += 1) {
      await createPublishedProject({
        id: `PERF-P${i}`,
        slug: `perf-p${i}`,
        title: `Perf Project ${i}`,
        clubIds: ['PERF-CLUB-A'],
      });
    }
    const withFive = await countQueriesFor('/public/home');

    expect(withFive).toBe(withOne);
  });

  it('/public/clubs issues the same query count with 1 or 5 clubs', async () => {
    const withOne = await countQueriesFor('/public/clubs');

    for (let i = 2; i <= 5; i += 1) {
      await createClub({ id: `PERF-CLUB-${i}`, name: `Perf Club ${i}`, zoneName: 'Prithvi' });
    }
    const withFive = await countQueriesFor('/public/clubs');

    expect(withFive).toBe(withOne);
  });

  it('/public/projects issues the same query count regardless of collaborating-club fan-out', async () => {
    const withOneClub = await countQueriesFor('/public/projects');

    await createPublishedProject({
      id: 'PERF-P-MULTI',
      slug: 'perf-p-multi',
      title: 'Perf Project Multi',
      clubIds: ['PERF-CLUB-A', 'PERF-CLUB-2', 'PERF-CLUB-3', 'PERF-CLUB-4', 'PERF-CLUB-5'],
    });
    const withManyClubs = await countQueriesFor('/public/projects');

    expect(withManyClubs).toBe(withOneClub);
  });
});
