import { PrismaClient } from '@prisma/client';
import { purgeAllStandalone } from '../src/cache/purge-all.standalone';
import { seedSystemData } from './seed-system';
import { seedDevData } from './seed-dev';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedSystemData(prisma, console.log);
    if (process.env.SEED_DEV === '1') {
      // The dev seed creates accounts with repo-published passwords and fabricated
      // public content. It reached production once via deployment config and kept
      // being restored on every redeploy, so refusing here is the durable stop.
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.ALLOW_DEV_SEED_IN_PRODUCTION !== '1'
      ) {
        console.warn(
          'SEED_DEV=1 ignored: refusing to seed demo data with NODE_ENV=production. ' +
            'Set ALLOW_DEV_SEED_IN_PRODUCTION=1 to override on a non-live stack.',
        );
      } else {
        await seedDevData(prisma, console.log);
      }
    }
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
