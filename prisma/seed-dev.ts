import { PrismaClient, type Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClubFactAdapter } from '../src/points/adapters/club-fact.adapter';
import { DeferredSourceAdapter } from '../src/points/adapters/deferred-source.adapter';
import type { PointSourceAdapter } from '../src/points/adapters/point-source.port';
import { ReportFieldAdapter } from '../src/points/adapters/report-field.adapter';
import { PointsEngineService } from '../src/points/engine/points-engine.service';
import { PointsEntriesRepository } from '../src/points/points-entries.repository';
import { PointsRepository } from '../src/points/points.repository';
import { PointsSourceRepository } from '../src/points/points-source.repository';
import type { SourceTypeKey } from '../src/points/points.types';
import type { PrismaService } from '../src/prisma/prisma.service';
import { CANONICAL_ZONES, seedZonesFromClubs, slugify } from './seed/zones';

export const DEV_ADMIN = {
  email: 'admin@rotaract3011.org',
  password: 'Admin@12345',
  name: 'Dev Super Admin',
};
export const DEV_PASSWORD = 'Member@12345';

const DEV_CLUBS = [
  ['RAC Delhi Central', 'Prithvi'],
  ['RAC Delhi South', 'Agni'],
  ['RAC Gurgaon City', 'Vayu'],
  ['RAC Noida Skyline', 'Akash'],
  ['RAC Delhi Regency', 'Prithvi'],
];

type Ctx = { prisma: PrismaClient; log: (msg: string) => void; passwordHash: string };

async function ensureUser(
  ctx: Ctx,
  email: string,
  name: string,
  passwordHash: string,
): Promise<string> {
  const existing = await ctx.prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const id = randomUUID();
  await ctx.prisma.user.create({ data: { id, email, name, emailVerified: true } });
  await ctx.prisma.account.create({
    data: {
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: 'credential',
      issuer: 'local:credential',
      password: passwordHash,
    },
  });
  return id;
}

async function grant(
  ctx: Ctx,
  userId: string,
  roleKey: string,
  scopeType: 'none' | 'club' | 'zone' | 'project',
  scopeId: string | null,
): Promise<void> {
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { key: roleKey } });
  const existing = await ctx.prisma.userRole.findFirst({
    where: { userId, roleId: role.id, scopeType, scopeId },
  });
  if (!existing)
    await ctx.prisma.userRole.create({ data: { userId, roleId: role.id, scopeType, scopeId } });
}

async function ensureMember(
  ctx: Ctx,
  email: string,
  name: string,
  clubId: string,
  roleKey: 'president' | 'secretary' | 'member',
): Promise<string> {
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
      await ctx.prisma.club.create({
        data: {
          id: slugify(name).toUpperCase(),
          name,
          zone,
          email: `${slugify(name)}@example.org`,
        },
      });
    }
  }
  await seedZonesFromClubs(ctx.prisma, ctx.log);
  const clubs = await ctx.prisma.club.findMany({ orderBy: { name: 'asc' }, take: 5 });
  return clubs.map((c) => c.id);
}

async function seedReportsAndProjects(
  ctx: Ctx,
  clubIds: string[],
  submitterId: string,
): Promise<void> {
  const legacyMonth = new Date('2026-07-01T00:00:00Z');
  await ctx.prisma.report.upsert({
    where: { clubId_month: { clubId: clubIds[0], month: legacyMonth } },
    create: {
      clubId: clubIds[0],
      month: legacyMonth,
      ryYear: 2026,
      schemaVersion: 1,
      status: 'submitted',
      values: { legacySections: {} },
      submittedById: submitterId,
      submittedAt: new Date('2026-08-04T00:00:00Z'),
      filedOnTime: true,
    },
    update: {},
  });

  const v2Months = ['2026-08-01', '2026-09-01'];
  for (const [i, m] of v2Months.entries()) {
    const clubId = clubIds[(i + 1) % clubIds.length];
    const month = new Date(`${m}T00:00:00Z`);
    await ctx.prisma.report.upsert({
      where: { clubId_month: { clubId, month } },
      create: {
        clubId,
        month,
        ryYear: 2026,
        schemaVersion: 2,
        status: 'submitted',
        values: {
          physical_meetings: 4,
          virtual_meetings: 1,
          new_members_inducted: 2,
          social_posts: 6,
          activities: [
            {
              activity_title: 'Blood donation camp',
              activity_date: `${m.slice(0, 7)}-10`,
              avenue: 'community',
              area_of_focus: 'Disease prevention and treatment',
              initiated_by: 'rotaract',
              members_participated: 12,
              people_reached: 80,
              collaborating_clubs: clubIds.filter((c) => c !== clubId).slice(0, 2),
              is_physical: true,
            },
          ],
        },
        submittedById: submitterId,
        submittedAt: new Date(`${m.slice(0, 7)}-31T12:00:00Z`),
        filedOnTime: true,
      },
      update: {},
    });
  }
}

// Demo rows carry a `demo-` slug prefix at every status (not just published) as the purge key: `DELETE FROM projects WHERE slug LIKE 'demo-%'`.
async function findRealClub(
  prisma: PrismaClient,
  needle: string,
  excludeIds: string[] = [],
): Promise<{ id: string; name: string } | null> {
  return prisma.club.findFirst({
    where: {
      id: { notIn: excludeIds },
      OR: [
        { name: { contains: needle, mode: 'insensitive' } },
        { shortName: { contains: needle, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
}

async function pickShowcaseClubs(
  ctx: Ctx,
  fallbackClubIds: string[],
): Promise<{ lead: string; others: string[] }> {
  const racddl = await findRealClub(ctx.prisma, 'Dynamic Leaders');
  if (!racddl) {
    ctx.log('showcase seed: RACDDL not found (fresh/local dataset) - using synthetic dev clubs');
    const [lead, ...rest] = fallbackClubIds;
    return { lead, others: rest };
  }
  const wanted = [
    'Delhi South East',
    'Delhi South',
    'Delhi Ehsaas',
    'Delhi Rajdhani',
    'Lady Shri Ram',
    'Saksham',
  ];
  const others: string[] = [];
  for (const needle of wanted) {
    const row = await findRealClub(ctx.prisma, needle, [racddl.id, ...others]);
    if (row) others.push(row.id);
  }
  if (others.length < 4) {
    const rest = await ctx.prisma.club.findMany({
      where: { id: { notIn: [racddl.id, ...others] } },
      take: 6 - others.length,
      orderBy: { name: 'asc' },
      select: { id: true },
    });
    others.push(...rest.map((c) => c.id));
  }
  return { lead: racddl.id, others };
}

type DemoProjectSpec = {
  slug: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  body?: string;
  beneficiaries?: number;
  photos?: string[];
  status: 'draft' | 'submitted' | 'published' | 'rejected';
  leadClubId: string;
  collaboratorClubIds?: string[];
  rejectionReason?: string;
};

async function upsertDemoProject(
  ctx: Ctx,
  submittedById: string,
  spec: DemoProjectSpec,
): Promise<void> {
  const isSubmittedOrLater = spec.status !== 'draft';
  const isPublished = spec.status === 'published';
  const project = await ctx.prisma.project.upsert({
    where: { slug: spec.slug },
    create: {
      slug: spec.slug,
      title: spec.title,
      category: spec.category,
      date: new Date(`${spec.date}T00:00:00Z`),
      summary: spec.summary,
      body: spec.body ?? null,
      beneficiaries: spec.beneficiaries ?? null,
      photos: spec.photos ?? [],
      status: spec.status,
      submittedById,
      consentConfirmed: isSubmittedOrLater,
      submittedAt: isSubmittedOrLater ? new Date(`${spec.date}T12:00:00Z`) : null,
      publishedTitle: isPublished ? spec.title : null,
      publishedSummary: isPublished ? spec.summary : null,
      publishedBody: isPublished ? (spec.body ?? null) : null,
      publishedAt: isPublished ? new Date(`${spec.date}T12:00:00Z`) : null,
      publishedById: isPublished ? submittedById : null,
      rejectionReason: spec.rejectionReason ?? null,
    },
    update: {},
  });
  await ctx.prisma.projectClub.upsert({
    where: { projectId_clubId: { projectId: project.id, clubId: spec.leadClubId } },
    create: { projectId: project.id, clubId: spec.leadClubId, role: 'lead' },
    update: {},
  });
  for (const clubId of spec.collaboratorClubIds ?? []) {
    await ctx.prisma.projectClub.upsert({
      where: { projectId_clubId: { projectId: project.id, clubId } },
      create: { projectId: project.id, clubId, role: 'collaborator' },
      update: {},
    });
  }
}

async function seedShowcaseDemoProjects(
  ctx: Ctx,
  submittedById: string,
  clubIds: string[],
): Promise<void> {
  const { lead, others } = await pickShowcaseClubs(ctx, clubIds);
  const [otherA, otherB, otherC, otherD, otherE] = others;

  const specs: DemoProjectSpec[] = [
    {
      slug: 'demo-career-guidance-workshop',
      title: 'Career guidance workshop',
      category: 'Basic Education',
      date: '2026-09-05',
      summary: 'A half-day career guidance session for final-year students.',
      status: 'draft',
      leadClubId: lead,
    },
    {
      slug: 'demo-old-age-home-visit',
      title: 'Old age home visit',
      category: 'Community Service',
      date: '2026-09-02',
      summary: 'A visit and cultural programme at a residential care home.',
      status: 'draft',
      leadClubId: otherA ?? lead,
    },
    {
      slug: 'demo-blood-donation-camp',
      title: 'Blood donation camp',
      category: 'Disease Prevention',
      date: '2026-08-24',
      summary: '180 units collected in partnership with Rotary Blood Bank.',
      body: 'A day-long blood donation camp organised with Rotary Blood Bank, open to students and staff.',
      beneficiaries: 180,
      status: 'submitted',
      leadClubId: lead,
    },
    {
      slug: 'demo-digital-literacy-lab-handover',
      title: 'Digital literacy lab handover',
      category: 'Basic Education',
      date: '2026-08-19',
      summary: 'Handover of a refurbished computer lab to a government school.',
      beneficiaries: 220,
      status: 'submitted',
      leadClubId: otherB ?? lead,
    },
    {
      slug: 'demo-yamuna-bank-clean-up',
      title: 'Yamuna bank clean-up',
      category: 'Environment',
      date: '2026-08-17',
      summary: 'A joint clean-up drive along the Yamuna floodplain.',
      body: 'Volunteers from three clubs cleared plastic waste along a stretch of the Yamuna floodplain and ran an awareness walk.',
      beneficiaries: 500,
      photos: [
        'https://picsum.photos/seed/demo-yamuna-1/1200/800',
        'https://picsum.photos/seed/demo-yamuna-2/1200/800',
      ],
      status: 'published',
      leadClubId: lead,
      collaboratorClubIds: [otherC, otherD].filter((id): id is string => !!id),
    },
    {
      slug: 'demo-ro-plant-government-school',
      title: 'RO plant at a government school',
      category: 'WASH',
      date: '2026-08-11',
      summary: 'Installed and commissioned a water purification plant for students.',
      beneficiaries: 600,
      status: 'published',
      leadClubId: otherE ?? lead,
    },
    {
      slug: 'demo-tree-plantation-drive',
      title: 'Tree plantation drive',
      category: 'Environment',
      date: '2026-07-28',
      summary: "150 native saplings planted along the club's adopted park.",
      beneficiaries: 150,
      status: 'published',
      leadClubId: lead,
    },
    {
      slug: 'demo-street-play-road-safety',
      title: 'Street play on road safety',
      category: 'Community Service',
      date: '2026-07-20',
      summary: 'A street play performed near a busy intersection to raise road-safety awareness.',
      status: 'rejected',
      leadClubId: otherA ?? lead,
      rejectionReason:
        'Please add at least two photos and a beneficiary estimate before resubmission.',
    },
  ];

  for (const spec of specs) await upsertDemoProject(ctx, submittedById, spec);
}

function buildPointsEngine(prisma: PrismaClient): PointsEngineService {
  const svc = prisma as unknown as PrismaService;
  const rules = new PointsRepository(svc);
  const entries = new PointsEntriesRepository(svc);
  const source = new PointsSourceRepository(svc);
  const reportField = new ReportFieldAdapter(source);
  const clubFact = new ClubFactAdapter(source);
  const deferred = new DeferredSourceAdapter();
  const adapters: Record<SourceTypeKey, PointSourceAdapter> = {
    report_field: reportField,
    club_fact: clubFact,
    event_attendance: deferred,
    project_collaboration: deferred,
    ride_hosting: deferred,
    club_events: deferred,
  };
  return new PointsEngineService(rules, entries, adapters, new EventEmitter2());
}

type ClubFactsSeed = Partial<{
  duesPaidOn: Date;
  riCitationCompleted: boolean;
  paulHarrisFellows: number;
  dualMembers: number;
  mdioCommitteeMembers: number;
  mdioEventsAttended: number;
  sisterClubSignedOn: Date;
  drrVisitOn: Date;
  vocationalCentreOn: Date;
  activeSocialHandles: number;
  clubMerchandise: boolean;
  clubWebsiteUrl: string;
  priorYearMemberCount: number;
}>;

async function upsertClubFacts(
  ctx: Ctx,
  clubId: string,
  ryYear: number,
  data: ClubFactsSeed,
): Promise<void> {
  await ctx.prisma.clubFacts.upsert({
    where: { clubId_ryYear: { clubId, ryYear } },
    create: { clubId, ryYear, ...data },
    update: data,
  });
}

type DemoReportSpec = {
  clubId: string;
  month: string;
  status: 'submitted' | 'queried';
  filedOnTime: boolean;
  values: Record<string, unknown>;
};

async function upsertDemoReport(
  ctx: Ctx,
  submittedById: string,
  spec: DemoReportSpec,
): Promise<string> {
  const month = new Date(`${spec.month}-01T00:00:00Z`);
  const row = await ctx.prisma.report.upsert({
    where: { clubId_month: { clubId: spec.clubId, month } },
    create: {
      clubId: spec.clubId,
      month,
      ryYear: 2026,
      schemaVersion: 2,
      status: spec.status,
      values: spec.values as Prisma.InputJsonValue,
      submittedById,
      submittedAt: new Date(`${spec.month}-28T12:00:00Z`),
      filedOnTime: spec.filedOnTime,
    },
    update: {
      status: spec.status,
      values: spec.values as Prisma.InputJsonValue,
      filedOnTime: spec.filedOnTime,
    },
  });
  return row.id;
}

// Purge before launch: delete club_point_entries/club_facts/reports for these real clubIds.
async function seedPointsDemoData(
  ctx: Ctx,
  adminId: string,
  dscId: string,
  fallbackClubIds: string[],
): Promise<void> {
  const { lead, others } = await pickShowcaseClubs(ctx, fallbackClubIds);
  const demoClubIds = [...new Set([lead, ...others])].slice(0, 5);
  const [clubA, clubB, clubC, clubD, clubE] = demoClubIds;

  await upsertClubFacts(ctx, clubA, 2026, {
    duesPaidOn: new Date('2026-08-20T00:00:00Z'),
    riCitationCompleted: true,
    paulHarrisFellows: 1,
    dualMembers: 3,
    mdioCommitteeMembers: 2,
    mdioEventsAttended: 1,
    sisterClubSignedOn: new Date('2026-01-15T00:00:00Z'),
    drrVisitOn: new Date('2026-08-10T00:00:00Z'),
    activeSocialHandles: 4,
    clubMerchandise: true,
    clubWebsiteUrl: 'https://example.org/demo/clubs/club-a',
    priorYearMemberCount: 40,
  });
  if (clubB)
    await upsertClubFacts(ctx, clubB, 2026, {
      duesPaidOn: new Date('2026-09-25T00:00:00Z'),
      paulHarrisFellows: 0,
      dualMembers: 1,
      mdioCommitteeMembers: 1,
      mdioEventsAttended: 0,
      activeSocialHandles: 2,
      priorYearMemberCount: 30,
    });
  if (clubC)
    await upsertClubFacts(ctx, clubC, 2026, {
      duesPaidOn: new Date('2026-10-05T00:00:00Z'),
      activeSocialHandles: 1,
      priorYearMemberCount: 25,
    });
  if (clubD) await upsertClubFacts(ctx, clubD, 2026, { activeSocialHandles: 0 });
  if (clubE)
    await upsertClubFacts(ctx, clubE, 2026, {
      paulHarrisFellows: 2,
      vocationalCentreOn: new Date('2025-11-01T00:00:00Z'),
      activeSocialHandles: 3,
    });

  await upsertDemoReport(ctx, adminId, {
    clubId: clubA,
    month: '2026-07',
    status: 'submitted',
    filedOnTime: true,
    values: {
      activities: [
        {
          activity_title: 'Installation ceremony',
          activity_date: '2026-07-05',
          avenue: 'club',
          area_of_focus: 'Community economic development',
          initiated_by: 'rotaract',
          members_participated: 22,
        },
      ],
      physical_meetings: 2,
      virtual_meetings: 0,
      new_members_inducted: 0,
      social_posts: 3,
    },
  });
  await upsertDemoReport(ctx, adminId, {
    clubId: clubA,
    month: '2026-08',
    status: 'submitted',
    filedOnTime: true,
    values: {
      activities: [
        {
          activity_title: 'Community health check-up camp',
          activity_date: '2026-08-08',
          avenue: 'community',
          area_of_focus: 'Disease prevention and treatment',
          initiated_by: 'rotaract',
          members_participated: 14,
          people_reached: 220,
          collaborating_clubs: clubB ? [clubB] : [],
          is_physical: true,
        },
        {
          activity_title: 'Resume-building vocational workshop',
          activity_date: '2026-08-15',
          avenue: 'vocational',
          area_of_focus: 'Basic education and literacy',
          initiated_by: 'rotaract',
          members_participated: 9,
        },
        {
          activity_title: 'International friendship meet',
          activity_date: '2026-08-25',
          avenue: 'international',
          area_of_focus: 'Peacebuilding and conflict prevention',
          initiated_by: 'rotary',
          members_participated: 8,
        },
      ],
      physical_meetings: 4,
      virtual_meetings: 1,
      new_members_inducted: 2,
      social_posts: 6,
    },
  });
  await upsertDemoReport(ctx, adminId, {
    clubId: clubA,
    month: '2026-09',
    status: 'submitted',
    filedOnTime: false,
    values: {
      activities: [
        {
          activity_title: 'Tree plantation drive',
          activity_date: '2026-09-14',
          avenue: 'community',
          area_of_focus: 'Environment',
          initiated_by: 'rotaract',
          members_participated: 11,
        },
      ],
      physical_meetings: 3,
      virtual_meetings: 1,
      new_members_inducted: 1,
      social_posts: 4,
    },
  });

  if (clubB) {
    const queriedReportId = await upsertDemoReport(ctx, adminId, {
      clubId: clubB,
      month: '2026-08',
      status: 'queried',
      filedOnTime: true,
      values: {
        activities: [
          {
            activity_title: 'Blood donation camp',
            activity_date: '2026-08-20',
            avenue: 'community',
            area_of_focus: 'Disease prevention and treatment',
            initiated_by: 'rotaract',
            members_participated: 12,
            people_reached: 90,
          },
        ],
        physical_meetings: 3,
        virtual_meetings: 0,
        new_members_inducted: 1,
        social_posts: 2,
      },
    });
    const existingQuery = await ctx.prisma.reportQuery.findFirst({
      where: { reportId: queriedReportId },
    });
    if (!existingQuery) {
      await ctx.prisma.reportQuery.create({
        data: {
          reportId: queriedReportId,
          askedById: dscId,
          question:
            'The people-reached figure for the blood donation camp looks high for 12 members - can you confirm the count?',
        },
      });
    }
  }

  if (clubC)
    await upsertDemoReport(ctx, adminId, {
      clubId: clubC,
      month: '2026-08',
      status: 'submitted',
      filedOnTime: true,
      values: {
        activities: [
          {
            activity_title: 'Weekly club meeting',
            activity_date: '2026-08-12',
            avenue: 'club',
            area_of_focus: 'Community economic development',
            initiated_by: 'rotaract',
            members_participated: 15,
          },
        ],
        physical_meetings: 2,
        virtual_meetings: 2,
        new_members_inducted: 0,
        social_posts: 5,
      },
    });

  for (const clubId of demoClubIds) {
    const engine = buildPointsEngine(ctx.prisma);
    await engine.recompute({ clubId, ryYear: 2026, trigger: 'seed-dev' });
  }

  const judgedCategory = await ctx.prisma.pointCategory.findUniqueOrThrow({
    where: { key: 'judged' },
  });
  const existingJudged = await ctx.prisma.clubPointEntry.findFirst({
    where: { clubId: clubA, periodKey: '2026-08', kind: 'judged', sourceType: null },
  });
  if (!existingJudged) {
    await ctx.prisma.clubPointEntry.create({
      data: {
        clubId: clubA,
        ryYear: 2026,
        periodKey: '2026-08',
        categoryId: judgedCategory.id,
        kind: 'judged',
        points: 15,
        reason:
          'Coordinated the joint blood donation drive with a Rotary club and personally handled the hospital liaison end to end.',
        createdById: adminId,
      },
    });
  }
  ctx.log(`points demo data seeded for ${demoClubIds.length} real club(s), lead=${clubA}`);
}

async function seedEventsAndAnnouncements(
  ctx: Ctx,
  clubIds: string[],
  adminId: string,
): Promise<void> {
  for (const [i, title] of ['District Installation', 'Leadership Assembly'].entries()) {
    const slug = slugify(title);
    const event = await ctx.prisma.event.upsert({
      where: { slug },
      create: {
        slug,
        title,
        startsAt: new Date(`2026-0${8 + i}-20T10:00:00Z`),
        isDistrictEvent: true,
        createdById: adminId,
      },
      update: {},
    });
    const members = await ctx.prisma.memberProfile.findMany({
      where: { clubId: clubIds[i] },
      take: 3,
    });
    for (const m of members) {
      await ctx.prisma.eventCheckin.upsert({
        where: { eventId_memberId: { eventId: event.id, memberId: m.id } },
        create: {
          eventId: event.id,
          memberId: m.id,
          clubId: m.clubId,
          method: 'manual',
          checkedInById: adminId,
        },
        update: {},
      });
    }
  }
  const count = await ctx.prisma.announcement.count();
  if (count === 0) {
    await ctx.prisma.announcement.createMany({
      data: [
        {
          title: 'Welcome to the new portal',
          body: 'Reports for July are due by the 5th.',
          audience: { roleKeys: ['member'] },
          createdById: adminId,
          sentAt: new Date(),
        },
        {
          title: 'Installation ceremony',
          body: 'Join us on 20 August.',
          audience: { roleKeys: ['member'] },
          createdById: adminId,
          sentAt: new Date(),
        },
      ],
    });
  }
}

// @example.com emails make these identifiable/purgeable later, same convention as seedMembersDemoData.
async function ensureDemoAttendee(
  ctx: Ctx,
  email: string,
  name: string,
  clubId: string,
): Promise<{ id: string; qrToken: string }> {
  const userId = await ensureUser(ctx, email, name, ctx.passwordHash);
  const profile = await ctx.prisma.memberProfile.upsert({
    where: { userId },
    create: {
      userId,
      fullName: name,
      email,
      clubId,
      status: 'approved',
      approvedAt: new Date(),
    },
    update: {},
    select: { id: true, qrToken: true },
  });
  await grant(ctx, userId, 'member', 'club', clubId);
  return profile;
}

async function upsertDemoEvent(
  ctx: Ctx,
  input: {
    slug: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    location?: string;
    description?: string;
    isDistrictEvent: boolean;
    clubId?: string;
    rsvpOpen?: boolean;
    capacity?: number;
    photos?: string[];
    createdById: string;
  },
): Promise<{ id: string; slug: string }> {
  return ctx.prisma.event.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      title: input.title,
      startsAt: new Date(input.startsAt),
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      location: input.location ?? null,
      description: input.description ?? null,
      isDistrictEvent: input.isDistrictEvent,
      clubId: input.clubId ?? null,
      rsvpOpen: input.rsvpOpen ?? true,
      capacity: input.capacity ?? null,
      photos: input.photos ?? [],
      createdById: input.createdById,
    },
    update: {},
    select: { id: true, slug: true },
  });
}

async function upsertDemoCheckin(
  ctx: Ctx,
  eventId: string,
  memberId: string,
  clubId: string,
  method: 'qr' | 'manual' | 'walk_in',
  checkedInById: string,
): Promise<void> {
  await ctx.prisma.eventCheckin.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    create: { eventId, memberId, clubId, method, checkedInById },
    update: {},
  });
}

async function upsertDemoRsvp(
  ctx: Ctx,
  eventId: string,
  memberId: string,
  status: 'going' | 'maybe' | 'not_going',
): Promise<void> {
  await ctx.prisma.eventRsvp.upsert({
    where: { eventId_memberId: { eventId, memberId } },
    create: { eventId, memberId, status },
    update: { status },
  });
}

// Full events/RSVP/check-in/feedback demo set (spec step 8), additive and idempotent via slug/email upserts.
// Mirrors the district's own mockups: design-export/v2/{Public Pages Part 2, Portal Admin Part 1, Portal Admin Part 2}.dc.html.
async function seedEventsFeedbackDemoData(
  ctx: Ctx,
  adminId: string,
  dscUserId: string,
  fallbackClubIds: string[],
): Promise<void> {
  const { lead: clubA, others } = await pickShowcaseClubs(ctx, fallbackClubIds);
  const clubB = others[0] ?? fallbackClubIds[1] ?? clubA;
  const clubC = others[1] ?? fallbackClubIds[2] ?? clubA;
  const clubD = others[2] ?? fallbackClubIds[3] ?? clubA;

  async function attendees(clubId: string, tag: string, count: number) {
    const rows = [];
    for (let i = 1; i <= count; i += 1) {
      rows.push(
        await ensureDemoAttendee(
          ctx,
          `demo.attendee${i}.${tag}@example.com`,
          `Demo Attendee ${i} (${tag})`,
          clubId,
        ),
      );
    }
    return rows;
  }

  // Past district event: check-ins across four clubs so event_attendance has real ratios to score.
  const cls = await upsertDemoEvent(ctx, {
    slug: 'club-leadership-seminar-2026',
    title: 'Club Leadership Seminar',
    startsAt: '2026-08-06T09:30:00Z',
    endsAt: '2026-08-06T17:00:00Z',
    location: 'India Habitat Centre, Lodhi Road',
    description: 'All presidents and secretaries.',
    isDistrictEvent: true,
    createdById: adminId,
  });
  const clsA = await attendees(clubA, 'cls-a', 8);
  const clsB = await attendees(clubB, 'cls-b', 8);
  const clsC = await attendees(clubC, 'cls-c', 9);
  const clsD = await attendees(clubD, 'cls-d', 10);
  for (const m of clsA.slice(0, 6)) await upsertDemoCheckin(ctx, cls.id, m.id, clubA, 'manual', dscUserId);
  for (const m of clsB.slice(0, 5)) await upsertDemoCheckin(ctx, cls.id, m.id, clubB, 'manual', dscUserId);
  if (clsC[0]) await upsertDemoCheckin(ctx, cls.id, clsC[0].id, clubC, 'qr', dscUserId);
  for (const m of clsC.slice(1, 8)) await upsertDemoCheckin(ctx, cls.id, m.id, clubC, 'manual', dscUserId);
  for (const m of clsD.slice(0, 2)) await upsertDemoCheckin(ctx, cls.id, m.id, clubD, 'manual', dscUserId);
  // Walk-ins have no memberId, so they can't go through the (eventId, memberId) upsert key above.
  const walkInExists = await ctx.prisma.eventCheckin.findFirst({
    where: { eventId: cls.id, walkInName: 'Guest of Rtr. Dhruv Jha' },
  });
  if (!walkInExists) {
    await ctx.prisma.eventCheckin.create({
      data: {
        eventId: cls.id,
        walkInName: 'Guest of Rtr. Dhruv Jha',
        clubId: clubA,
        method: 'walk_in',
        checkedInById: dscUserId,
      },
    });
  }

  // Upcoming district event, open RSVPs, no capacity limit.
  const seric = await upsertDemoEvent(ctx, {
    slug: 'seric-2026',
    title: 'SERIC — South East Rotaract Interaction Conference',
    startsAt: '2026-09-20T09:00:00Z',
    endsAt: '2026-09-21T18:00:00Z',
    location: 'Venue to be confirmed',
    description: 'Two days, open to all Rotaractors.',
    isDistrictEvent: true,
    createdById: adminId,
  });
  const sericAttendees = await attendees(clubA, 'seric-a', 3);
  const sericOther = await attendees(clubB, 'seric-b', 2);
  if (sericAttendees[0]) await upsertDemoRsvp(ctx, seric.id, sericAttendees[0].id, 'going');
  if (sericAttendees[1]) await upsertDemoRsvp(ctx, seric.id, sericAttendees[1].id, 'going');
  if (sericAttendees[2]) await upsertDemoRsvp(ctx, seric.id, sericAttendees[2].id, 'maybe');
  if (sericOther[0]) await upsertDemoRsvp(ctx, seric.id, sericOther[0].id, 'going');
  if (sericOther[1]) await upsertDemoRsvp(ctx, seric.id, sericOther[1].id, 'not_going');

  // Club-level event (isDistrictEvent=false): the club's own tracker, photos attached.
  const bloodCamp = await upsertDemoEvent(ctx, {
    slug: 'blood-donation-camp-rotary-blood-bank-2026',
    title: 'Blood donation camp with Rotary Blood Bank',
    startsAt: '2026-08-24T09:00:00Z',
    endsAt: '2026-08-24T14:00:00Z',
    location: 'Community centre, Chirag Delhi',
    description: '180 attended, 2 collaborating clubs.',
    isDistrictEvent: false,
    clubId: clubA,
    photos: ['https://picsum.photos/seed/demo-blood-camp-1/640/480', 'https://picsum.photos/seed/demo-blood-camp-2/640/480'],
    createdById: adminId,
  });
  for (const m of clsA.slice(0, 3)) await upsertDemoCheckin(ctx, bloodCamp.id, m.id, clubA, 'manual', dscUserId);

  // District event already at capacity: exactly `capacity` check-ins recorded.
  const rcl = await upsertDemoEvent(ctx, {
    slug: 'rcl-semifinals-2026',
    title: 'Rotaract Cricket League — semifinals',
    startsAt: '2026-10-04T10:00:00Z',
    location: 'Dwarka sports complex',
    isDistrictEvent: true,
    capacity: 6,
    createdById: adminId,
  });
  for (const m of clsB.slice(0, 3)) await upsertDemoCheckin(ctx, rcl.id, m.id, clubB, 'manual', dscUserId);
  for (const m of clsC.slice(0, 3)) await upsertDemoCheckin(ctx, rcl.id, m.id, clubC, 'manual', dscUserId);

  // Feedback: one open, one reviewed-with-reply, one closed; categories general/event/general(anonymous).
  const attendeeA1 = clsA[0];
  const attendeeB1 = clsB[0];
  if (attendeeA1) {
    const attendeeUser = await ctx.prisma.memberProfile.findUnique({
      where: { id: attendeeA1.id },
      select: { userId: true },
    });
    if (attendeeUser) {
      await ctx.prisma.feedback.upsert({
        where: { id: 'demo-feedback-open' },
        create: {
          id: 'demo-feedback-open',
          submittedById: attendeeUser.userId,
          category: 'general',
          message: 'Could the calendar go out earlier? Clubs plan installations two months ahead.',
          status: 'open',
        },
        update: {},
      });
    }
  }
  if (attendeeB1) {
    const attendeeUser = await ctx.prisma.memberProfile.findUnique({
      where: { id: attendeeB1.id },
      select: { userId: true, clubId: true },
    });
    if (attendeeUser) {
      await ctx.prisma.feedback.upsert({
        where: { id: 'demo-feedback-reviewed' },
        create: {
          id: 'demo-feedback-reviewed',
          submittedById: attendeeUser.userId,
          clubId: attendeeUser.clubId,
          category: 'event',
          eventId: cls.id,
          message: 'The venue had no accessible entrance for one of our members.',
          status: 'reviewed',
          reply: 'Noted — the 2027 venue shortlist now has accessibility as a filter. Thank you for raising it.',
          reviewedById: dscUserId,
          reviewedAt: new Date(),
        },
        update: {},
      });
    }
  }
  await ctx.prisma.feedback.upsert({
    where: { id: 'demo-feedback-closed' },
    create: {
      id: 'demo-feedback-closed',
      submittedById: null,
      category: 'general',
      message: 'Anonymous note: thank you to the secretariat for the quick report review turnaround.',
      status: 'closed',
      reply: 'Appreciated — passing this on to the review team.',
      reviewedById: dscUserId,
      reviewedAt: new Date(),
    },
    update: {},
  });
}

// Demo rows carry a `https://example.org/demo/*` / `https://example.invalid/*` url as the purge key across partners/publications/resources/asset_links.
async function seedPublicContentDemoData(ctx: Ctx, fallbackClubIds: string[]): Promise<void> {
  const racddl = await findRealClub(ctx.prisma, 'Dynamic Leaders');
  const leadClubId = racddl?.id ?? fallbackClubIds[0];

  async function upsertPartner(input: {
    name: string;
    tier: string;
    logoUrl: string | null;
    website: string | null;
    permissionStatus: 'pending' | 'granted';
    order: number;
  }): Promise<void> {
    const existing = await ctx.prisma.partner.findFirst({ where: { name: input.name } });
    if (existing) await ctx.prisma.partner.update({ where: { id: existing.id }, data: input });
    else await ctx.prisma.partner.create({ data: input });
  }
  await upsertPartner({
    name: 'Sambhav Seva Foundation',
    tier: 'year_partner',
    logoUrl: 'https://picsum.photos/seed/demo-partner-sambhav/300/120',
    website: 'https://example.org/demo/partners/sambhav-seva-foundation',
    permissionStatus: 'pending',
    order: 0,
  });
  await upsertPartner({
    name: 'CanSupport',
    tier: 'year_partner',
    logoUrl: 'https://picsum.photos/seed/demo-partner-cansupport/300/120',
    website: 'https://example.org/demo/partners/cansupport',
    permissionStatus: 'pending',
    order: 1,
  });

  async function upsertPublication(input: {
    title: string;
    type: 'directory' | 'newsletter';
    url: string;
    month: string;
    coverUrl: string | null;
  }): Promise<void> {
    const existing = await ctx.prisma.publication.findFirst({ where: { title: input.title } });
    const data = { ...input, month: new Date(`${input.month}-01T00:00:00Z`) };
    if (existing) await ctx.prisma.publication.update({ where: { id: existing.id }, data });
    else await ctx.prisma.publication.create({ data });
  }
  await upsertPublication({
    title: 'District Newsletter — August 2026',
    type: 'newsletter',
    url: 'https://example.org/demo/publications/newsletter-2026-08.pdf',
    month: '2026-08',
    coverUrl: 'https://picsum.photos/seed/demo-newsletter-08/600/800',
  });
  await upsertPublication({
    title: 'District Newsletter — July 2026',
    type: 'newsletter',
    url: 'https://example.org/demo/publications/newsletter-2026-07.pdf',
    month: '2026-07',
    coverUrl: 'https://picsum.photos/seed/demo-newsletter-07/600/800',
  });

  async function upsertResource(input: {
    category: string;
    title: string;
    description: string | null;
    url: string;
    isLocked: boolean;
    requiredPermission: string | null;
    comingSoonMonth: string | null;
    order: number;
  }): Promise<string> {
    const existing = await ctx.prisma.resource.findFirst({ where: { title: input.title } });
    if (existing) {
      await ctx.prisma.resource.update({ where: { id: existing.id }, data: input as never });
      return existing.id;
    }
    const created = await ctx.prisma.resource.create({ data: input as never });
    return created.id;
  }
  await upsertResource({
    category: 'documents',
    title: 'Point-system methodology',
    description: 'How monthly report points are assigned, and by whom.',
    url: 'https://example.org/demo/resources/point-system-methodology.pdf',
    isLocked: false,
    requiredPermission: null,
    comingSoonMonth: null,
    order: 0,
  });
  await upsertResource({
    category: 'documents',
    title: 'President database',
    description: 'Contact details for every club president, RY 2026-27.',
    url: 'https://example.org/demo/resources/president-database.xlsx',
    isLocked: true,
    requiredPermission: 'members:view',
    comingSoonMonth: null,
    order: 1,
  });
  await upsertResource({
    category: 'documents',
    title: 'District Directory 2026–27',
    description: 'Every club, officer and contact in one PDF. Being compiled now.',
    url: 'https://example.org/demo/resources/district-directory-2026-27.pdf',
    isLocked: false,
    requiredPermission: null,
    comingSoonMonth: 'November 2026',
    order: 2,
  });
  const brokenResourceId = await upsertResource({
    category: 'templates',
    title: 'RACDDL appointment letter template',
    description: 'Editable appointment-letter template for club boards.',
    url: 'https://example.invalid/demo-broken-appointment-letter-template.docx',
    isLocked: false,
    requiredPermission: null,
    comingSoonMonth: null,
    order: 3,
  });
  await ctx.prisma.assetLink.upsert({
    where: {
      resourceType_resourceId_url: {
        resourceType: 'resource',
        resourceId: brokenResourceId,
        url: 'https://example.invalid/demo-broken-appointment-letter-template.docx',
      },
    },
    create: {
      url: 'https://example.invalid/demo-broken-appointment-letter-template.docx',
      kind: 'documents',
      status: 'broken',
      lastCheckedAt: new Date(),
      lastError: 'status=broken',
      resourceType: 'resource',
      resourceId: brokenResourceId,
    },
    update: { status: 'broken', lastCheckedAt: new Date(), lastError: 'status=broken' },
  });

  await ctx.prisma.setting.upsert({
    where: { key: 'subdomain.mission3011.active' },
    create: { key: 'subdomain.mission3011.active', value: true },
    update: { value: true },
  });
  await ctx.prisma.setting.upsert({
    where: { key: 'subdomain.mission3011.leadClubId' },
    create: { key: 'subdomain.mission3011.leadClubId', value: leadClubId },
    update: { value: leadClubId },
  });
  // leadClubId stays at its seed-system default (null) - drishti demos the "open for bidding" state.
  await ctx.prisma.setting.upsert({
    where: { key: 'subdomain.drishti.active' },
    create: { key: 'subdomain.drishti.active', value: true },
    update: { value: true },
  });
}

// @example.com emails make these identifiable/purgeable later: DELETE FROM member_profiles WHERE email LIKE '%@example.com'.
type DemoMemberSpec = {
  email: string;
  fullName: string;
  phone?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  photoUrl?: string;
  membershipAnniversary?: string;
  directoryOptIn: boolean;
  status: 'pending' | 'approved' | 'suspended';
  rejectionReason?: string;
  createdDaysAgo?: number;
  role?: 'president' | 'secretary' | 'member';
};

async function upsertDemoMember(ctx: Ctx, clubId: string, spec: DemoMemberSpec): Promise<void> {
  const existingProfile = await ctx.prisma.memberProfile.findUnique({
    where: { email: spec.email },
  });
  const userId =
    existingProfile?.userId ?? (await ensureUser(ctx, spec.email, spec.fullName, ctx.passwordHash));
  const createdAt = spec.createdDaysAgo
    ? new Date(Date.now() - spec.createdDaysAgo * 24 * 60 * 60 * 1000)
    : undefined;
  const isApproved = spec.status === 'approved';

  await ctx.prisma.memberProfile.upsert({
    where: { userId },
    create: {
      userId,
      fullName: spec.fullName,
      email: spec.email,
      phone: spec.phone ?? null,
      clubId,
      bio: spec.bio ?? null,
      skills: spec.skills ?? [],
      interests: spec.interests ?? [],
      photoUrl: spec.photoUrl ?? null,
      membershipAnniversary: spec.membershipAnniversary
        ? new Date(spec.membershipAnniversary)
        : null,
      directoryOptIn: spec.directoryOptIn,
      status: spec.status,
      approvedAt: isApproved ? new Date() : null,
      rejectionReason: spec.rejectionReason ?? null,
      createdAt,
    },
    update: {
      bio: spec.bio ?? null,
      skills: spec.skills ?? [],
      interests: spec.interests ?? [],
      photoUrl: spec.photoUrl ?? null,
      directoryOptIn: spec.directoryOptIn,
      status: spec.status,
      rejectionReason: spec.rejectionReason ?? null,
    },
  });

  if (isApproved) {
    await grant(ctx, userId, 'member', 'club', clubId);
    if (spec.role && spec.role !== 'member') await grant(ctx, userId, spec.role, 'club', clubId);
  }
}

async function seedMembersDemoData(ctx: Ctx, fallbackClubIds: string[]): Promise<void> {
  const racddl = await findRealClub(ctx.prisma, 'Dynamic Leaders');
  const racddlId = racddl?.id ?? fallbackClubIds[0];
  const rajdhani = await findRealClub(ctx.prisma, 'Delhi Rajdhani', [racddlId]);
  const lsr = await findRealClub(ctx.prisma, 'Lady Shri Ram', [
    racddlId,
    ...(rajdhani ? [rajdhani.id] : []),
  ]);
  const secondClubId = rajdhani?.id ?? fallbackClubIds[1] ?? racddlId;
  const thirdClubId = lsr?.id ?? fallbackClubIds[2] ?? racddlId;

  // RACDDL roster: officers + approved members with skills/interests filled in (directory search fodder).
  await upsertDemoMember(ctx, racddlId, {
    email: 'dhruv.jha.demo@example.com',
    fullName: 'Rtr. Dhruv Kumar Jha',
    directoryOptIn: true,
    status: 'approved',
    role: 'president',
    skills: ['Design', 'Public speaking'],
    membershipAnniversary: '2022-07-01',
  });
  await upsertDemoMember(ctx, racddlId, {
    email: 'kartik.kumar.demo@example.com',
    fullName: 'Rtr. Kartik Kumar',
    directoryOptIn: true,
    status: 'approved',
    role: 'secretary',
    skills: ['Data', 'Photography'],
    membershipAnniversary: '2022-09-01',
  });
  await upsertDemoMember(ctx, racddlId, {
    email: 'meera.nair.demo@example.com',
    fullName: 'Rtr. Meera Nair',
    directoryOptIn: true,
    status: 'approved',
    bio: 'Event management, and the one who remembers the checklist.',
    skills: ['Event management', 'Photography', 'Public speaking'],
    interests: ['Community service', 'Environment'],
    membershipAnniversary: '2023-07-01',
  });
  await upsertDemoMember(ctx, racddlId, {
    email: 'aman.verma.demo@example.com',
    fullName: 'Rtr. Aman Verma',
    directoryOptIn: true,
    status: 'approved',
    photoUrl: 'https://picsum.photos/seed/demo-member-aman/200/200',
    skills: ['Video editing', 'Cricket', 'Event management'],
    interests: ['Environment'],
    membershipAnniversary: '2024-01-15',
  });
  // Opted out on purpose: exercises "directory search excludes opt-outs" without a special fixture.
  await upsertDemoMember(ctx, racddlId, {
    email: 'nikhil.arora.demo@example.com',
    fullName: 'Rtr. Nikhil Arora',
    directoryOptIn: false,
    status: 'approved',
    skills: ['Fundraising'],
    membershipAnniversary: '2023-11-01',
  });

  // Pending approvals (Members & approvals screen, RACDDL president's queue).
  await upsertDemoMember(ctx, racddlId, {
    email: 'ishita.rao.demo@example.com',
    fullName: 'Ishita Rao',
    directoryOptIn: false,
    status: 'pending',
    createdDaysAgo: 2,
  });
  await upsertDemoMember(ctx, racddlId, {
    email: 'sana.qureshi.pending.demo@example.com',
    fullName: 'Sana Qureshi',
    directoryOptIn: false,
    status: 'pending',
    createdDaysAgo: 0,
  });

  // Suspended: previously approved, then declined - exercises the "reinstate" action.
  await upsertDemoMember(ctx, racddlId, {
    email: 'not.ours.demo@example.com',
    fullName: 'Rahul Mehta',
    directoryOptIn: false,
    status: 'suspended',
    rejectionReason: 'Signed up under the wrong club',
  });

  // Cross-club directory breadth: same skill ("video editing") findable across clubs/zones.
  await upsertDemoMember(ctx, secondClubId, {
    email: 'tanay.bose.demo@example.com',
    fullName: 'Rtr. Tanay Bose',
    directoryOptIn: true,
    status: 'approved',
    skills: ['Video editing', 'Photography'],
    membershipAnniversary: '2023-08-01',
  });
  await upsertDemoMember(ctx, thirdClubId, {
    email: 'sana.qureshi.demo@example.com',
    fullName: 'Rtr. Sana Qureshi',
    directoryOptIn: true,
    status: 'approved',
    skills: ['Video editing', 'Scriptwriting', 'Anchoring'],
    membershipAnniversary: '2024-03-01',
  });
}

export async function seedDevData(
  prisma: PrismaClient,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  const ctx: Ctx = { prisma, log, passwordHash: await hash(DEV_PASSWORD, 12) };
  const adminId = await ensureUser(
    ctx,
    DEV_ADMIN.email,
    DEV_ADMIN.name,
    await hash(DEV_ADMIN.password, 12),
  );
  await grant(ctx, adminId, 'super_admin', 'none', null);
  const clubIds = await ensureClubs(ctx);
  for (const [i, clubId] of clubIds.entries()) {
    const tag = clubId.toLowerCase();
    await ensureMember(
      ctx,
      `president.${tag}@example.org`,
      `President ${i + 1}`,
      clubId,
      'president',
    );
    await ensureMember(
      ctx,
      `secretary.${tag}@example.org`,
      `Secretary ${i + 1}`,
      clubId,
      'secretary',
    );
    for (const n of [1, 2, 3])
      await ensureMember(
        ctx,
        `member${n}.${tag}@example.org`,
        `Member ${n} of ${i + 1}`,
        clubId,
        'member',
      );
  }
  const zones = await prisma.zone.findMany({ where: { name: { in: CANONICAL_ZONES } } });
  if (zones[0]) {
    const zrr = await ensureUser(ctx, 'zrr.prithvi@example.org', 'ZRR Prithvi', ctx.passwordHash);
    await grant(ctx, zrr, 'zrr', 'zone', zones[0].id);
  }
  const dsc = await ensureUser(ctx, 'dsc@example.org', 'District Secretary', ctx.passwordHash);
  await grant(ctx, dsc, 'dsc', 'none', null);
  const firstPresident = await prisma.memberProfile.findFirstOrThrow({
    where: { clubId: clubIds[0] },
  });
  await seedReportsAndProjects(ctx, clubIds, firstPresident.userId);
  await seedShowcaseDemoProjects(ctx, adminId, clubIds);
  await seedPointsDemoData(ctx, adminId, dsc, clubIds);
  await seedEventsAndAnnouncements(ctx, clubIds, adminId);
  await seedEventsFeedbackDemoData(ctx, adminId, dsc, clubIds);
  await seedPublicContentDemoData(ctx, clubIds);
  await seedMembersDemoData(ctx, clubIds);
  log(`dev seed complete: ${DEV_ADMIN.email} / ${DEV_ADMIN.password}`);
}
