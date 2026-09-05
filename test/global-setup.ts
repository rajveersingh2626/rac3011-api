import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { seedSystemData } from '../prisma/seed-system';

let container: StartedPostgreSqlContainer | undefined;

export async function setup(): Promise<void> {
  container = await new PostgreSqlContainer('postgres:18')
    .withDatabase('rac3011')
    .withUsername('rac3011')
    .withPassword('rac3011')
    .start();
  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.TEST_DATABASE_URL = url;
  process.env.MAIL_ALLOWLIST = 'notifications-allowlist@example.com';
  // Small on purpose: a failed send job's BullMQ retry must not linger past this file's own app,
  // leaking into whichever e2e file's worker boots next on the same shared Redis.
  process.env.NOTIFICATIONS_RETRY_DELAY_MS = '200';
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  // Seeded once here, not per file: e2e beforeAll hooks can overlap, so a per-file TRUNCATE would race.
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await seedSystemData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
