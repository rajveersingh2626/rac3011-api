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
