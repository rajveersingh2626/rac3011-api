import { PrismaClient } from '@prisma/client';
import { purgeAllStandalone } from '../src/cache/purge-all.standalone';
import { seedSystemData } from './seed-system';
import { seedDevData } from './seed-dev';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedSystemData(prisma, console.log);
    if (process.env.SEED_DEV === '1') await seedDevData(prisma, console.log);
    await purgeAllStandalone();
    console.log('seed complete');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
