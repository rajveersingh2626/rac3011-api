import type { PrismaClient } from '@prisma/client';

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

export async function seedZonesFromClubs(prisma: PrismaClient, log: (msg: string) => void = console.log): Promise<void> {
  const distinct = await prisma.club.findMany({ where: { zone: { not: null } }, select: { zone: true }, distinct: ['zone'] });
  const names = new Set<string>(CANONICAL_ZONES);
  for (const row of distinct) {
    const name = row.zone?.trim();
    if (!name) continue;
    if (!names.has(name)) log(`zone "${name}" is not in the canonical list; keeping it as an extra zone`);
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
  const clubs = await prisma.club.findMany({ select: { id: true, name: true, zone: true, zoneId: true, slug: true } });
  const takenSlugs = new Set(clubs.map((c) => c.slug).filter((s): s is string => !!s));
  for (const club of clubs) {
    const zoneId = club.zone ? byName.get(club.zone.trim()) ?? null : null;
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
