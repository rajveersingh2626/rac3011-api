import type { PrismaClient } from '@prisma/client';
import { slugify } from './zones';

// Grouped by person from districtData.js PAST_DRRS; photos deferred (source images not reachable from this repo).
export const PAST_DRRS_SEED: { name: string; terms: string[]; homeClub: string | null }[] = [
  { name: 'Rtr. Archit Bhatia', terms: ['2026-27'], homeClub: 'Rotaract Club of Delhi Heights' },
  { name: 'Rtr. Rishika Khanna', terms: ['2025-26'], homeClub: null },
  { name: 'Rtr. Geetika', terms: ['2024-25'], homeClub: null },
  { name: 'Rtr. Kriti Malhotra', terms: ['2023-24'], homeClub: null },
  { name: 'Rtr. Ankit Arvind Singh', terms: ['2022-23'], homeClub: null },
  { name: 'Rtr. Rahul Sanjeev Sharma', terms: ['2022-23'], homeClub: null },
  { name: 'Rtr. Niranjan Dev Singh', terms: ['2021-22'], homeClub: null },
  { name: 'Rtr. Sarthak Bansal', terms: ['2020-21'], homeClub: null },
  { name: 'Rtr. Yaamini Thareja', terms: ['2020-21'], homeClub: null },
  { name: 'Rtr. Arpit Mehra', terms: ['2019-20'], homeClub: null },
  { name: 'Rtr. Ashima Agarwal Gupta', terms: ['2018-19'], homeClub: null },
  { name: 'Rtr. Anmol Chawla', terms: ['2017-18'], homeClub: null },
  { name: 'Rtr. Manuj Mittal', terms: ['2016-17'], homeClub: null },
  { name: 'Rtr. Harsh Sirohi', terms: ['2015-16'], homeClub: null },
  { name: 'Rtr. Nikoonz Agarwal', terms: ['2014-15'], homeClub: null },
  { name: 'Rtr. Himanshu Gupta', terms: ['2013-14'], homeClub: null },
  { name: 'Rtr. Siddharth Gupta', terms: ['2012-13'], homeClub: null },
  { name: 'Rtr. Vir Philip', terms: ['2011-12'], homeClub: null },
  { name: 'Rtr. Manik Gupta', terms: ['2010-11'], homeClub: null },
  { name: 'Rtr. Niharika Ahluwalia', terms: ['2009-10'], homeClub: null },
  { name: 'Rtr. Neha Khurana', terms: ['2008-09'], homeClub: null },
  { name: 'Rtr. Sushant Gupta', terms: ['2007-08'], homeClub: null },
  { name: 'Rtr. Rhiya Gupta', terms: ['2006-07'], homeClub: null },
  { name: 'Rtr. S. Sorabh Jain', terms: ['2005-06'], homeClub: null },
  { name: 'Rtr. Dhruv Suri', terms: ['2004-05'], homeClub: null },
  { name: 'Rtr. Darshanjit Singh', terms: ['2003-04'], homeClub: null },
  { name: 'Rtr. Neeraj Sheth', terms: ['2002-03'], homeClub: null },
  { name: 'Rtr. Lokesh Aneja', terms: ['2001-02'], homeClub: null },
  { name: 'Rtr. Nitin Luthra', terms: ['2000-01'], homeClub: null },
  { name: 'Rtr. Lalit Bansal', terms: ['1999-00'], homeClub: null },
  { name: 'Rtr. Radhika Backliwal Narain', terms: ['1998-99'], homeClub: null },
  { name: 'Rtr. Anil Taneja', terms: ['1997-98'], homeClub: null },
  { name: 'Rtr. Naresh Devgun', terms: ['1996-97'], homeClub: null },
  { name: 'Rtr. Ajay Kumar', terms: ['1995-96'], homeClub: null },
  { name: 'Rtr. Rajesh Lal', terms: ['1994-95'], homeClub: null },
  { name: 'Rtr. Manoj Singhal', terms: ['1993-94'], homeClub: null },
  { name: 'Rtr. Raman Magan', terms: ['1992-93'], homeClub: null },
  { name: 'Rtr. Sudhir Ralan', terms: ['1991-92'], homeClub: null },
  { name: 'Rtr. Tejwant Chhatwal', terms: ['1989-90', '1990-91'], homeClub: null },
  { name: 'Rtr. Divender Singh Sirohi', terms: ['1988-89'], homeClub: null },
  { name: 'Rtr. Bawa Preetranjan Singh', terms: ['1987-88'], homeClub: null },
  { name: 'Rtr. Rajeev Saxena', terms: ['1986-87'], homeClub: null },
  { name: 'Rtr. Sanjiv Bali', terms: ['1985-86'], homeClub: null },
  { name: 'Rtr. Rajeev Raheja', terms: ['1984-85'], homeClub: null },
];

// From districtData.js DISTRICT_INFO + DISTRICT_ZONES; DISTRICT_LEADERSHIP in the same source is generic placeholder copy, not real names.
const CURRENT_RY_YEAR = 2026;

export const DISTRICT_TEAM_SEED: {
  name: string;
  designation: string;
  kind: 'core' | 'dsc';
  order: number;
}[] = [
  {
    name: 'Rtn. Sanjeev Rai Mehra',
    designation: 'District Governor, RID 3011',
    kind: 'core',
    order: 0,
  },
  {
    name: 'Rtr. Ananya Sharma',
    designation: 'District Rotaract Representative (DRR)',
    kind: 'core',
    order: 1,
  },
  { name: 'Rtr. Ayush Rai', designation: 'Assistant DRR — Zone Prithvi', kind: 'dsc', order: 10 },
  {
    name: 'Rtn. Rtr. Kanav Sachdeva',
    designation: 'Zonal Rotaract Representative — Zone Prithvi',
    kind: 'dsc',
    order: 11,
  },
  {
    name: 'Rtr. Hitaishi Chawla',
    designation: 'Zonal Rotaract Secretary — Zone Prithvi',
    kind: 'dsc',
    order: 12,
  },
  { name: 'Rtr. Ayush Rai', designation: 'Assistant DRR — Zone Agni', kind: 'dsc', order: 13 },
  {
    name: 'Rtr. Dhruv Kumar Jha',
    designation: 'Zonal Rotaract Representative — Zone Agni',
    kind: 'dsc',
    order: 14,
  },
  {
    name: 'Rtr. Kartik Kumar',
    designation: 'Zonal Rotaract Secretary — Zone Agni',
    kind: 'dsc',
    order: 15,
  },
  { name: 'Rtr. Radhika Bansal', designation: 'Assistant DRR — Zone Vayu', kind: 'dsc', order: 16 },
  {
    name: 'Rtr. Tanishaa Sonker',
    designation: 'Zonal Rotaract Representative — Zone Vayu',
    kind: 'dsc',
    order: 17,
  },
  {
    name: 'Rtr. Pratham Girdhar',
    designation: 'Zonal Rotaract Secretary — Zone Vayu',
    kind: 'dsc',
    order: 18,
  },
  {
    name: 'Rtr. Radhika Bansal',
    designation: 'Assistant DRR — Zone Akash',
    kind: 'dsc',
    order: 19,
  },
  {
    name: 'Rtr. Palak Jain',
    designation: 'Zonal Rotaract Representative — Zone Akash',
    kind: 'dsc',
    order: 20,
  },
  {
    name: 'Rtr. Arjun Pratap Singh',
    designation: 'Zonal Rotaract Secretary — Zone Akash',
    kind: 'dsc',
    order: 21,
  },
];

// districtData.js IMPACT_METRICS, seeded as milestone achievements ahead of the step-3 admin CRUD screen.
export const ACHIEVEMENTS_SEED: {
  title: string;
  description: string;
  date: string;
  order: number;
}[] = [
  {
    title: '55,000+ lives impacted',
    description:
      'Cumulative reach of District 3011 service projects, RY 2026-27 (+22% year over year).',
    date: '2026-07-01',
    order: 0,
  },
  {
    title: '75 active clubs',
    description: 'Rotaract clubs chartered and active across the district roster, RY 2026-27.',
    date: '2026-07-01',
    order: 1,
  },
  {
    title: '₹1.5 Cr mobilised',
    description: 'Funds mobilised for district and club projects, reported with full transparency.',
    date: '2026-07-01',
    order: 2,
  },
  {
    title: '500+ projects executed',
    description:
      'High-impact community, vocational and international service projects run this Rotary year.',
    date: '2026-07-01',
    order: 3,
  },
  {
    title: '15,000+ blood units donated',
    description:
      'Units collected across district blood donation drives, saving an estimated 45,000 lives.',
    date: '2026-07-01',
    order: 4,
  },
];

async function resolveClubId(prisma: PrismaClient, name: string | null): Promise<string | null> {
  if (!name) return null;
  const club = await prisma.club.findFirst({ where: { OR: [{ name }, { shortName: name }] } });
  return club?.id ?? null;
}

export async function seedPastDrrs(prisma: PrismaClient): Promise<void> {
  for (const [i, drr] of PAST_DRRS_SEED.entries()) {
    const slug = slugify(`${drr.name}-${drr.terms[0]}`);
    const homeClubId = await resolveClubId(prisma, drr.homeClub);
    await prisma.pastDrr.upsert({
      where: { slug },
      create: { slug, name: drr.name, terms: drr.terms, homeClubId, order: i },
      update: { name: drr.name, terms: drr.terms, homeClubId, order: i },
    });
  }
}

export async function seedDistrictTeam(prisma: PrismaClient): Promise<void> {
  for (const member of DISTRICT_TEAM_SEED) {
    const existing = await prisma.districtTeamMember.findFirst({
      where: { name: member.name, designation: member.designation, ryYear: CURRENT_RY_YEAR },
    });
    const data = {
      name: member.name,
      designation: member.designation,
      kind: member.kind,
      order: member.order,
      ryYear: CURRENT_RY_YEAR,
    };
    if (existing) await prisma.districtTeamMember.update({ where: { id: existing.id }, data });
    else await prisma.districtTeamMember.create({ data });
  }
}

export async function seedAchievements(prisma: PrismaClient): Promise<void> {
  for (const a of ACHIEVEMENTS_SEED) {
    const existing = await prisma.achievement.findFirst({
      where: { title: a.title, type: 'milestone' },
    });
    const data = {
      type: 'milestone' as const,
      title: a.title,
      description: a.description,
      date: new Date(`${a.date}T00:00:00Z`),
      order: a.order,
    };
    if (existing) await prisma.achievement.update({ where: { id: existing.id }, data });
    else await prisma.achievement.create({ data });
  }
}

export async function seedPublicContent(prisma: PrismaClient): Promise<void> {
  await seedPastDrrs(prisma);
  await seedDistrictTeam(prisma);
  await seedAchievements(prisma);
}
