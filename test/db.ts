import { PrismaClient } from '@prisma/client';
import { seedSystemData } from '../prisma/seed-system';

let client: PrismaClient | undefined;

export function testPrisma(): PrismaClient {
  client ??= new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  return client;
}

export async function resetTestDatabase(): Promise<void> {
  const prisma = testPrisma();
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length > 0) {
    const list = rows.map((r) => `"${r.tablename}"`).join(', ');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
  }
  await seedSystemData(prisma);
}

export async function closeTestPrisma(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
