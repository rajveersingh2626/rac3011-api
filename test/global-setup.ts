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
  // Long on purpose: a short delay lets the retry complete (job removed) before
  // notifications.e2e can assert the failed job is still pending.
  process.env.NOTIFICATIONS_RETRY_DELAY_MS = '5000';
  // email_provider_usage is one Postgres counter shared by every e2e file, and the fake transport
  // reports itself as 'oracle', so the 100/day default cap is reachable mid-run and later files
  // would see sends fail with NoEmailProviderAvailableError.
  process.env.ORACLE_DAILY_CAP = '1000000';
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
