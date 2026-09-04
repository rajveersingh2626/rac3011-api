import { PrismaClient } from '@prisma/client';
import { seedSystemData } from '../prisma/seed-system';

let client: PrismaClient | undefined;

const RESET_LOCK_KEY = 872634;

export function testPrisma(): PrismaClient {
  client ??= new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  return client;
}

// Advisory lock: beforeAll hooks across e2e files can overlap in-process and race the seed upserts.
export async function resetTestDatabase(): Promise<void> {
  const prisma = testPrisma();
  await prisma.$executeRaw`SELECT pg_advisory_lock(${RESET_LOCK_KEY})`;
  try {
    const rows = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
    if (rows.length > 0) {
      const list = rows.map((r) => `"${r.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
    }
    await seedSystemData(prisma);
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${RESET_LOCK_KEY})`;
  }
}

export async function closeTestPrisma(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
