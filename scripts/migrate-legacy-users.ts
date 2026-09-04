import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const DISTRICT_CLUB_ID = 'DISTRICT';
const DISTRICT_CLUB_NAME = 'District 3011 (Officers)';

type LegacyRole = 'president' | 'secretary' | 'officer' | 'dac_member';

type UnmatchedRow = { legacyId: string; email: string; clubName: string | null };

async function resolveClubId(
  prisma: PrismaClient,
  email: string,
  clubName: string | null,
): Promise<string | null> {
  const byEmail = await prisma.club.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (byEmail) return byEmail.id;
  if (clubName) {
    const byName = await prisma.club.findFirst({ where: { name: clubName } });
    if (byName) return byName.id;
    const byShortName = await prisma.club.findFirst({ where: { shortName: clubName } });
    if (byShortName) return byShortName.id;
  }
  return null;
}

function rolesFor(
  legacyRole: string,
  clubId: string,
): { key: string; scopeType: 'club' | 'none'; scopeId: string | null }[] {
  const member = { key: 'member', scopeType: 'club' as const, scopeId: clubId };
  switch (legacyRole as LegacyRole) {
    case 'president':
      return [member, { key: 'president', scopeType: 'club', scopeId: clubId }];
    case 'secretary':
      return [member, { key: 'secretary', scopeType: 'club', scopeId: clubId }];
    case 'officer':
      return [member, { key: 'dsc', scopeType: 'none', scopeId: null }];
    case 'dac_member':
      return [member];
    default:
      return [member];
  }
}

async function ensureDistrictClub(prisma: PrismaClient): Promise<void> {
  await prisma.club.upsert({
    where: { id: DISTRICT_CLUB_ID },
    create: { id: DISTRICT_CLUB_ID, name: DISTRICT_CLUB_NAME, isActive: true },
    update: {},
  });
}

export async function migrateLegacyUsers(
  prisma: PrismaClient,
  log: (msg: string) => void = console.log,
): Promise<{ migrated: number; skipped: number; unmatched: number }> {
  const rows = await prisma.legacyUserProfile.findMany();
  let migrated = 0;
  let skipped = 0;
  const unmatched: UnmatchedRow[] = [];

  for (const row of rows) {
    const existing = await prisma.memberProfile.findUnique({ where: { legacyId: row.id } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const email = row.email.toLowerCase();
    let clubId = await resolveClubId(prisma, email, row.clubName);
    if (!clubId) {
      unmatched.push({ legacyId: row.id, email, clubName: row.clubName });
      await ensureDistrictClub(prisma);
      clubId = DISTRICT_CLUB_ID;
    }

    const isBcryptHash = row.password.startsWith('$2');
    if (!isBcryptHash)
      log(`legacy user ${email} has a non-bcrypt password hash; login will require a reset`);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { id: crypto.randomUUID(), name: row.fullName, email, emailVerified: true },
      });
      await tx.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: 'credential',
          issuer: 'local:credential',
          password: row.password,
        },
      });
      const profile = await tx.memberProfile.create({
        data: {
          userId: user.id,
          fullName: row.fullName,
          email,
          phone: row.phone,
          rotaryId: row.rotaryId,
          clubId: clubId,
          status: 'approved',
          isDacMember: row.role === 'dac_member',
          legacyId: row.id,
        },
      });
      for (const grant of rolesFor(row.role, clubId)) {
        const role = await tx.role.findUniqueOrThrow({ where: { key: grant.key } });
        const existingGrant = await tx.userRole.findFirst({
          where: {
            userId: user.id,
            roleId: role.id,
            scopeType: grant.scopeType,
            scopeId: grant.scopeId,
          },
        });
        if (!existingGrant) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: role.id,
              scopeType: grant.scopeType,
              scopeId: grant.scopeId,
            },
          });
        }
      }
      return profile;
    });
    migrated += 1;
  }

  if (unmatched.length > 0) {
    const dir = join('scripts', 'out');
    mkdirSync(dir, { recursive: true });
    const csv = [
      'legacy_id,email,club_name',
      ...unmatched.map((u) => `${u.legacyId},${u.email},${u.clubName ?? ''}`),
    ].join('\n');
    writeFileSync(join(dir, 'unmatched-users.csv'), csv);
    log(
      `${unmatched.length} user(s) had no club match; assigned to ${DISTRICT_CLUB_ID} and logged to scripts/out/unmatched-users.csv`,
    );
  }

  return { migrated, skipped, unmatched: unmatched.length };
}

if (require.main === module) {
  const prisma = new PrismaClient();
  migrateLegacyUsers(prisma)
    .then((result) => {
      console.log(
        `migrated ${result.migrated}, skipped ${result.skipped} (already migrated), ${result.unmatched} unmatched`,
      );
      if (result.unmatched > 0) process.exitCode = 1;
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
