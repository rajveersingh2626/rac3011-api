import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { CANONICAL_ZONES, seedZonesFromClubs, slugify } from './seed/zones';

export const DEV_ADMIN = { email: 'admin@rotaract3011.org', password: 'Admin@12345', name: 'Dev Super Admin' };
export const DEV_PASSWORD = 'Member@12345';

const DEV_CLUBS = [
  ['RAC Delhi Central', 'Prithvi'],
  ['RAC Delhi South', 'Agni'],
  ['RAC Gurgaon City', 'Vayu'],
  ['RAC Noida Skyline', 'Akash'],
  ['RAC Delhi Regency', 'Prithvi'],
];

type Ctx = { prisma: PrismaClient; log: (msg: string) => void; passwordHash: string };

async function ensureUser(ctx: Ctx, email: string, name: string, passwordHash: string): Promise<string> {
  const existing = await ctx.prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const id = randomUUID();
  await ctx.prisma.user.create({ data: { id, email, name, emailVerified: true } });
  await ctx.prisma.account.create({
    data: { id: randomUUID(), userId: id, accountId: id, providerId: 'credential', issuer: 'local:credential', password: passwordHash },
  });
  return id;
}

async function grant(ctx: Ctx, userId: string, roleKey: string, scopeType: 'none' | 'club' | 'zone' | 'project', scopeId: string | null): Promise<void> {
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const existing = await ctx.prisma.userRole.findFirst({ where: { userId, roleId: role.id, scopeType, scopeId } });
  if (!existing) await ctx.prisma.userRole.create({ data: { userId, roleId: role.id, scopeType, scopeId } });
}

async function ensureMember(ctx: Ctx, email: string, name: string, clubId: string, roleKey: 'president' | 'secretary' | 'member'): Promise<string> {
  const userId = await ensureUser(ctx, email, name, ctx.passwordHash);
  await ctx.prisma.memberProfile.upsert({
    where: { userId },
    create: { userId, fullName: name, email, clubId, status: 'approved', approvedAt: new Date() },
    update: {},
  });
  await grant(ctx, userId, 'member', 'club', clubId);
  if (roleKey !== 'member') await grant(ctx, userId, roleKey, 'club', clubId);
  return userId;
}

async function ensureClubs(ctx: Ctx): Promise<string[]> {
  const count = await ctx.prisma.club.count();
  if (count === 0) {
    for (const [name, zone] of DEV_CLUBS) {
      await ctx.prisma.club.create({ data: { id: slugify(name).toUpperCase(), name, zone, email: `${slugify(name)}@example.org` } });
    }
  }
  await seedZonesFromClubs(ctx.prisma, ctx.log);
  const clubs = await ctx.prisma.club.findMany({ orderBy: { name: 'asc' }, take: 5 });
  return clubs.map((c) => c.id);
}

async function seedReportsAndProjects(ctx: Ctx, clubIds: string[], submitterId: string): Promise<void> {
  const months = ['2026-07-01', '2026-08-01', '2026-09-01'];
  for (const [i, m] of months.entries()) {
    const clubId = clubIds[i % clubIds.length];
    const month = new Date(`${m}T00:00:00Z`);
    await ctx.prisma.report.upsert({
      where: { clubId_month: { clubId, month } },
      create: { clubId, month, ryYear: 2026, schemaVersion: 1, status: 'submitted', values: { legacySections: {} }, submittedById: submitterId, submittedAt: new Date() },
      update: {},
    });
  }
  for (const [i, title] of ['Blood donation camp', 'Tree plantation drive'].entries()) {
    const slug = slugify(title);
    const project = await ctx.prisma.project.upsert({
      where: { slug },
      create: {
        slug,
        title,
        category: 'Community Service',
        date: new Date('2026-08-15T00:00:00Z'),
        summary: `${title} organised by the club.`,
        status: 'published',
        publishedTitle: title,
        publishedSummary: `${title} organised by the club.`,
        publishedAt: new Date(),
        submittedById: submitterId,
        consentConfirmed: true,
      },
      update: {},
    });
    await ctx.prisma.projectClub.upsert({
      where: { projectId_clubId: { projectId: project.id, clubId: clubIds[i] } },
      create: { projectId: project.id, clubId: clubIds[i], role: 'lead' },
      update: {},
    });
  }
}

async function seedEventsAndAnnouncements(ctx: Ctx, clubIds: string[], adminId: string): Promise<void> {
  for (const [i, title] of ['District Installation', 'Leadership Assembly'].entries()) {
    const slug = slugify(title);
    const event = await ctx.prisma.event.upsert({
      where: { slug },
      create: { slug, title, startsAt: new Date(`2026-0${8 + i}-20T10:00:00Z`), isDistrictEvent: true, createdById: adminId },
      update: {},
    });
    const members = await ctx.prisma.memberProfile.findMany({ where: { clubId: clubIds[i] }, take: 3 });
    for (const m of members) {
      await ctx.prisma.eventCheckin.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: m.id } },
        create: { eventId: event.id, memberId: m.id, clubId: m.clubId, method: 'manual', checkedInById: adminId },
        update: {},
      });
    }
  }
  const count = await ctx.prisma.announcement.count();
  if (count === 0) {
    await ctx.prisma.announcement.createMany({
      data: [
        { title: 'Welcome to the new portal', body: 'Reports for July are due by the 5th.', audience: { roleKeys: ['member'] }, createdById: adminId, sentAt: new Date() },
        { title: 'Installation ceremony', body: 'Join us on 20 August.', audience: { roleKeys: ['member'] }, createdById: adminId, sentAt: new Date() },
      ],
    });
  }
}

export async function seedDevData(prisma: PrismaClient, log: (msg: string) => void = () => undefined): Promise<void> {
  const ctx: Ctx = { prisma, log, passwordHash: await hash(DEV_PASSWORD, 12) };
  const adminId = await ensureUser(ctx, DEV_ADMIN.email, DEV_ADMIN.name, await hash(DEV_ADMIN.password, 12));
  await grant(ctx, adminId, 'super_admin', 'none', null);
  const clubIds = await ensureClubs(ctx);
  for (const [i, clubId] of clubIds.entries()) {
    const tag = clubId.toLowerCase();
    await ensureMember(ctx, `president.${tag}@example.org`, `President ${i + 1}`, clubId, 'president');
    await ensureMember(ctx, `secretary.${tag}@example.org`, `Secretary ${i + 1}`, clubId, 'secretary');
    for (const n of [1, 2, 3]) await ensureMember(ctx, `member${n}.${tag}@example.org`, `Member ${n} of ${i + 1}`, clubId, 'member');
  }
  const zones = await prisma.zone.findMany({ where: { name: { in: CANONICAL_ZONES } } });
  if (zones[0]) {
    const zrr = await ensureUser(ctx, 'zrr.prithvi@example.org', 'ZRR Prithvi', ctx.passwordHash);
    await grant(ctx, zrr, 'zrr', 'zone', zones[0].id);
  }
  const dsc = await ensureUser(ctx, 'dsc@example.org', 'District Secretary', ctx.passwordHash);
  await grant(ctx, dsc, 'dsc', 'none', null);
  const firstPresident = await prisma.memberProfile.findFirstOrThrow({ where: { clubId: clubIds[0] } });
  await seedReportsAndProjects(ctx, clubIds, firstPresident.userId);
  await seedEventsAndAnnouncements(ctx, clubIds, adminId);
  log(`dev seed complete: ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`);
}
