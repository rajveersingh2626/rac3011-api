import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export const CANONICAL_ZONES = ['Prithvi', 'Agni', 'Vayu', 'Akash'];

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Club rows store their zone as "Zone Prithvi" while the canonical list is "Prithvi", so without this
// the seed created a second, empty zone beside each real one and the public zone list showed 8.
export function canonicalZoneName(raw: string): string {
  const name = raw.trim();
  const stripped = name.replace(/^zone\s+/i, '').trim();
  return CANONICAL_ZONES.find((z) => z.toLowerCase() === stripped.toLowerCase()) ?? name;
}

// Two containers can boot at once (rolling redeploy, `docker service update --force`, a crash-loop
// racing the previous process). The whole merge therefore runs inside one transaction behind a
// session-independent advisory lock, so the second seed sees the finished state and finds nothing to do.
const ZONE_MERGE_LOCK_KEY = 3011090501;

// Zone ids are also referenced by user_roles.scope_id and announcements.audience->'zoneIds', neither of
// which has a foreign key, so the row that survives a merge must be the one clubs already point at.
async function moveZoneScopedRoles(tx: Tx, fromZoneId: string, toZoneId: string): Promise<number> {
  // The unique key is [userId, roleId, scopeType, scopeId] and UserRole carries nothing else that
  // differentiates two grants, so a clash means the user already holds the role on the surviving zone.
  const dropped = await tx.$executeRaw`
    DELETE FROM "user_roles" a
    WHERE a."scope_type" = 'zone'::"ScopeType"
      AND a."scope_id" = ${fromZoneId}
      AND EXISTS (
        SELECT 1 FROM "user_roles" b
        WHERE b."user_id" = a."user_id"
          AND b."role_id" = a."role_id"
          AND b."scope_type" = 'zone'::"ScopeType"
          AND b."scope_id" = ${toZoneId}
      )`;
  await tx.userRole.updateMany({
    where: { scopeType: 'zone', scopeId: fromZoneId },
    data: { scopeId: toZoneId },
  });
  return dropped;
}

// Announcement.audience is free-form Json with no foreign key, so a dropped zone id would linger in
// historical audiences and corrupt later replay, reporting and admin inspection.
async function moveAnnouncementZoneIds(
  tx: Tx,
  fromZoneId: string,
  toZoneId: string,
): Promise<number> {
  return tx.$executeRaw`
    UPDATE "announcements" a
    SET "audience" = jsonb_set(
      a."audience",
      '{zoneIds}',
      COALESCE(
        (
          SELECT jsonb_agg(DISTINCT CASE WHEN e = to_jsonb(${fromZoneId}::text) THEN to_jsonb(${toZoneId}::text) ELSE e END)
          FROM jsonb_array_elements(a."audience" -> 'zoneIds') e
        ),
        '[]'::jsonb
      )
    )
    WHERE jsonb_typeof(a."audience") = 'object'
      AND jsonb_typeof(a."audience" -> 'zoneIds') = 'array'
      AND a."audience" -> 'zoneIds' @> to_jsonb(${fromZoneId}::text)`;
}

async function mergeAliasZonesInTx(tx: Tx, log: (msg: string) => void): Promise<void> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${ZONE_MERGE_LOCK_KEY})`);
  const zones = await tx.zone.findMany({
    select: { id: true, name: true, _count: { select: { clubs: true } } },
  });
  const byName = new Map(zones.map((z) => [z.name, z]));
  for (const alias of zones) {
    const canonical = canonicalZoneName(alias.name);
    if (canonical === alias.name) continue;
    const existing = byName.get(canonical);
    if (existing) {
      // Keep whichever row carries the clubs; on a tie the canonical row wins.
      const [keep, drop] =
        alias._count.clubs > existing._count.clubs ? [alias, existing] : [existing, alias];
      await tx.club.updateMany({ where: { zoneId: drop.id }, data: { zoneId: keep.id } });
      const droppedGrants = await moveZoneScopedRoles(tx, drop.id, keep.id);
      const rewrittenAudiences = await moveAnnouncementZoneIds(tx, drop.id, keep.id);
      // clubs.zone_id is ON DELETE SET NULL and is the only foreign key to zones, so deleting a row
      // that still has clubs would silently null their zone instead of failing.
      const stranded = await tx.club.count({ where: { zoneId: drop.id } });
      if (stranded > 0) {
        throw new Error(
          `refusing to delete zone "${drop.name}" (${drop.id}): ${stranded} club(s) still point at it`,
        );
      }
      await tx.zone.deleteMany({ where: { id: drop.id } });
      byName.delete(drop.name);
      const clubs = alias._count.clubs + existing._count.clubs;
      if (keep.id === alias.id) {
        await tx.zone.update({ where: { id: alias.id }, data: { name: canonical } });
      }
      byName.set(canonical, { id: keep.id, name: canonical, _count: { clubs } });
      log(
        `merged zone "${alias.name}" into "${canonical}" ` +
          `(${droppedGrants} duplicate role grant(s) dropped, ${rewrittenAudiences} announcement audience(s) rewritten)`,
      );
      continue;
    }
    await tx.zone.update({ where: { id: alias.id }, data: { name: canonical } });
    byName.delete(alias.name);
    byName.set(canonical, { ...alias, name: canonical });
    log(`renamed zone "${alias.name}" to "${canonical}"`);
  }
}

// This is a repair, not a prerequisite: the seed runs on every container start under `set -e`, so a
// failure here must degrade the zone list rather than stop the API from booting.
async function mergeAliasZones(prisma: PrismaClient, log: (msg: string) => void): Promise<void> {
  try {
    await prisma.$transaction((tx) => mergeAliasZonesInTx(tx, log), {
      maxWait: 15_000,
      timeout: 60_000,
    });
  } catch (err) {
    log(`zone alias merge skipped: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function seedZonesFromClubs(
  prisma: PrismaClient,
  log: (msg: string) => void = console.log,
): Promise<void> {
  await mergeAliasZones(prisma, log);
  const distinct = await prisma.club.findMany({
    where: { zone: { not: null } },
    select: { zone: true },
    distinct: ['zone'],
  });
  const names = new Set<string>(CANONICAL_ZONES);
  for (const row of distinct) {
    const name = row.zone ? canonicalZoneName(row.zone) : '';
    if (!name) continue;
    if (!names.has(name))
      log(`zone "${name}" is not in the canonical list; keeping it as an extra zone`);
    names.add(name);
  }
  const ordered = [...names];
  for (const [i, name] of ordered.entries()) {
    const order = CANONICAL_ZONES.indexOf(name);
    await prisma.zone.upsert({
      where: { name },
      create: { name, order: order >= 0 ? order : 10 + i },
      update: { order: order >= 0 ? order : 10 + i },
    });
  }
  const zones = await prisma.zone.findMany();
  const byName = new Map(zones.map((z) => [z.name, z.id]));
  const clubs = await prisma.club.findMany({
    select: { id: true, name: true, zone: true, zoneId: true, slug: true },
  });
  const takenSlugs = new Set(clubs.map((c) => c.slug).filter((s): s is string => !!s));
  for (const club of clubs) {
    const zoneId = club.zone ? (byName.get(canonicalZoneName(club.zone)) ?? null) : null;
    let slug = club.slug;
    if (!slug) {
      const base = slugify(club.name) || club.id.toLowerCase();
      slug = takenSlugs.has(base) ? `${base}-${club.id.toLowerCase().slice(0, 6)}` : base;
      takenSlugs.add(slug);
    }
    if (zoneId !== club.zoneId || slug !== club.slug) {
      await prisma.club.update({ where: { id: club.id }, data: { zoneId, slug } });
    }
  }
}
