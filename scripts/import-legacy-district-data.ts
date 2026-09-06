import 'dotenv/config';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { PrismaClient, type Prisma } from '@prisma/client';
import { isPlaceholderClub, mergeClubFields } from '../src/legacy-import/club-mapper';
import { mapDrrRecord, mergeDrrFields } from '../src/legacy-import/drr-mapper';
import { parseAreasOfFocus, parseStatTiles } from '../src/legacy-import/home-content-parser';
import type {
  ExistingClubRow,
  ScrapedClub,
  ScrapedDrr,
} from '../src/legacy-import/legacy-import.types';
import { uploadPermanentImage, uploadThingConfigured } from './legacy-import/uploadthing-upload';

type Args = { dataDir: string; dryRun: boolean; skipImages: boolean };

function parseArgs(argv: string[]): Args {
  const dataDirIdx = argv.indexOf('--data-dir');
  const dataDir = dataDirIdx !== -1 ? argv[dataDirIdx + 1] : undefined;
  if (!dataDir) {
    throw new Error(
      'usage: tsx scripts/import-legacy-district-data.ts --data-dir <path-to-rotaract3011-scrape> [--dry-run] [--skip-images]',
    );
  }
  return {
    dataDir,
    dryRun: argv.includes('--dry-run'),
    skipImages: argv.includes('--skip-images'),
  };
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function normalize(name: string): string {
  return name.trim().toLowerCase();
}

async function importClubs(
  prisma: PrismaClient,
  scrapedClubs: ScrapedClub[],
  dryRun: boolean,
  log: (m: string) => void,
) {
  const existingRows = await prisma.club.findMany({
    select: {
      id: true,
      name: true,
      shortName: true,
      zone: true,
      lat: true,
      lng: true,
      president: true,
      phone: true,
      email: true,
      rotaryId: true,
      secretary: true,
      secretaryEmail: true,
      secretaryPhone: true,
    },
  });
  const existingByName = new Map<string, ExistingClubRow>(
    existingRows.map((c) => [normalize(c.name), c]),
  );
  const clubsByNormalizedName = new Map<string, string>();
  for (const c of existingRows) {
    clubsByNormalizedName.set(normalize(c.name), c.id);
    if (c.shortName) clubsByNormalizedName.set(normalize(c.shortName), c.id);
  }

  let created = 0;
  let updated = 0;
  let noop = 0;
  const placeholderClubs: string[] = [];

  for (const scraped of scrapedClubs) {
    if (isPlaceholderClub(scraped)) placeholderClubs.push(scraped.name);
    const existing = existingByName.get(normalize(scraped.name)) ?? null;
    const result = mergeClubFields(existing, scraped);
    log(`club "${scraped.name}": ${result.action} (${result.notes.join('; ')})`);

    if (result.action === 'create') {
      created += 1;
      clubsByNormalizedName.set(normalize(scraped.name), result.id);
      if (scraped.short_name) clubsByNormalizedName.set(normalize(scraped.short_name), result.id);
      if (!dryRun) await prisma.club.create({ data: result.data as Prisma.ClubCreateInput });
    } else if (result.action === 'update') {
      updated += 1;
      if (!dryRun) {
        const data = Object.fromEntries(
          result.updates.map((u) => [u.field, u.value]),
        ) as Prisma.ClubUpdateInput;
        await prisma.club.update({ where: { id: result.id }, data });
      }
    } else {
      noop += 1;
    }
  }

  return { created, updated, noop, placeholderClubs, clubsByNormalizedName };
}

async function importDrrs(
  prisma: PrismaClient,
  scrapedDrrs: ScrapedDrr[],
  clubsByNormalizedName: Map<string, string>,
  dataDir: string,
  args: Args,
  log: (m: string) => void,
) {
  let created = 0;
  let updated = 0;
  let photosUploaded = 0;
  let photosSkipped = 0;
  const canUpload = !args.skipImages && !args.dryRun && uploadThingConfigured();

  for (const entry of scrapedDrrs) {
    const mapped = mapDrrRecord(entry, clubsByNormalizedName);
    const existing = await prisma.pastDrr.findUnique({ where: { slug: mapped.slug } });
    let photoUrl: string | null = null;

    if (mapped.photoKey && !existing?.photoUrl) {
      if (canUpload) {
        const filePath = join(dataDir, 'images', `drr_${mapped.photoKey}.webp`);
        photoUrl = await uploadPermanentImage(filePath, `drr_${mapped.photoKey}.webp`);
        photosUploaded += 1;
      } else {
        photosSkipped += 1;
        log(
          `drr "${entry.name}": has photo but skipping upload (${args.dryRun ? 'dry run' : args.skipImages ? '--skip-images' : 'no UPLOADTHING_TOKEN_PERMANENT'})`,
        );
      }
    }

    log(
      `drr "${entry.name}" (${entry.year}): slug=${mapped.slug} homeClubId=${mapped.homeClubId ?? 'none'}`,
    );

    if (existing) {
      const data = mergeDrrFields(existing, mapped, photoUrl);
      if (Object.keys(data).length > 0) {
        updated += 1;
        if (!args.dryRun) await prisma.pastDrr.update({ where: { slug: mapped.slug }, data });
      }
    } else {
      created += 1;
      if (!args.dryRun) {
        await prisma.pastDrr.create({
          data: {
            name: mapped.name,
            terms: mapped.terms,
            homeClubId: mapped.homeClubId,
            bio: mapped.bio,
            order: mapped.order,
            slug: mapped.slug,
            photoUrl: photoUrl ?? null,
          },
        });
      }
    }
  }

  return { created, updated, photosUploaded, photosSkipped };
}

async function importHomeContent(
  prisma: PrismaClient,
  homeMd: string,
  dryRun: boolean,
  log: (m: string) => void,
) {
  const stats = parseStatTiles(homeMd);
  const areas = parseAreasOfFocus(homeMd);
  log(`parsed ${stats.length} stat tiles and ${areas.length} areas of focus from home.md`);

  const blocks: { pageKey: string; sectionKey: string; type: 'list'; value: unknown }[] = [
    { pageKey: 'home', sectionKey: 'impact-stats', type: 'list', value: stats },
    { pageKey: 'about', sectionKey: 'areas-of-focus', type: 'list', value: areas },
  ];
  if (dryRun) return blocks.length;

  for (const block of blocks) {
    const value = block.value as Prisma.InputJsonValue;
    await prisma.contentBlock.upsert({
      where: { pageKey_sectionKey: { pageKey: block.pageKey, sectionKey: block.sectionKey } },
      create: {
        pageKey: block.pageKey,
        sectionKey: block.sectionKey,
        type: block.type,
        draftValue: value,
        publishedValue: value,
        publishedAt: new Date(),
      },
      update: { draftValue: value, publishedValue: value, publishedAt: new Date() },
    });
  }
  return blocks.length;
}

export async function runImport(
  prisma: PrismaClient,
  args: Args,
  log: (m: string) => void = console.log,
) {
  const scrapedClubs = await loadJson<ScrapedClub[]>(join(args.dataDir, 'raw', 'clubs_full.json'));
  const scrapedDrrs = await loadJson<ScrapedDrr[]>(join(args.dataDir, 'raw', 'drr_history.json'));
  const homeMd = await readFile(join(args.dataDir, 'pages', 'home.md'), 'utf8');

  const clubResult = await importClubs(prisma, scrapedClubs, args.dryRun, log);
  const drrResult = await importDrrs(
    prisma,
    scrapedDrrs,
    clubResult.clubsByNormalizedName,
    args.dataDir,
    args,
    log,
  );
  const contentBlockCount = await importHomeContent(prisma, homeMd, args.dryRun, log);

  return {
    clubs: { created: clubResult.created, updated: clubResult.updated, noop: clubResult.noop },
    placeholderClubs: clubResult.placeholderClubs,
    drrs: { created: drrResult.created, updated: drrResult.updated },
    photos: { uploaded: drrResult.photosUploaded, skipped: drrResult.photosSkipped },
    contentBlocks: contentBlockCount,
  };
}

function redactedDbTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return '(no DATABASE_URL set)';
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}`;
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `target database: ${redactedDbTarget()}${args.dryRun ? ' (dry run, no writes)' : ''}`,
  );
  const prisma = new PrismaClient();
  runImport(prisma, args)
    .then((result) => {
      console.log(`\n${args.dryRun ? '[dry run] ' : ''}import summary:`);
      console.log(
        `  clubs: ${result.clubs.created} created, ${result.clubs.updated} updated, ${result.clubs.noop} unchanged`,
      );
      console.log(
        `  placeholder-only clubs (officer fields skipped): ${result.placeholderClubs.length}`,
      );
      for (const name of result.placeholderClubs) console.log(`    - ${name}`);
      console.log(`  past DRRs: ${result.drrs.created} created, ${result.drrs.updated} updated`);
      console.log(
        `  DRR photos: ${result.photos.uploaded} uploaded, ${result.photos.skipped} skipped`,
      );
      console.log(`  content blocks: ${result.contentBlocks} upserted`);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
