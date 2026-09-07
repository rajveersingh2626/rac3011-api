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
  email?: string;
  phone?: string;
  photoUrl?: string;
}[] = [
  {
    name: "Rtn. Rtr. Archit Bhatia",
    designation: "District Rotaract Representative",
    kind: "core",
    order: 1,
    email: "itsdrrarchit@gmail.com",
    phone: "9560126152",
    photoUrl: "/leadership/archit-bhatia.webp",
  },
  {
    name: "Rtn. Rtr. Sarthak Bansal",
    designation: "District Learning Facilitator",
    kind: "core",
    order: 2,
    email: "rtr.sarthak3003@gmail.com",
    phone: "8700096024",
    photoUrl: "/leadership/sarthak-bansal.webp",
  },
  {
    name: "Rtr. Divyanshu Katiyar",
    designation: "Deputy District Rotaract Representative",
    kind: "core",
    order: 3,
    email: "rtrdivyanshu3011@gmail.com",
    phone: "9794565358",
    photoUrl: "/leadership/divyanshu-katiyar.jpeg",
  },
  {
    name: "Rtr. Rajat Kapoor",
    designation: "District Chair - Operations",
    kind: "dsc",
    order: 4,
    email: "rajatkapoor44@gmail.com",
    phone: "7838923776",
    photoUrl: "/leadership/rajat-kapoor.jpg",
  },
  {
    name: "Rtr. Sarthak Manchanda",
    designation: "District Chair - Administration",
    kind: "dsc",
    order: 5,
    email: "sarthakmanchanda2@gmail.com",
    phone: "7206708029",
    photoUrl: "/leadership/sarthak-manchanda.jpg",
  },
  {
    name: "Rtr. Shefali Prakash",
    designation: "District Rotaract General Secretary",
    kind: "core",
    order: 6,
    email: "rtrshefali2004@gmail.com",
    phone: "8826376323",
    photoUrl: "/leadership/shefali-prakash.jpg",
  },
  {
    name: "Rtn. Rtr. Himanshu Gulati",
    designation: "District Rotaract Secretary - Reporting",
    kind: "core",
    order: 7,
    email: "himanshugulati.rotary@gmail.com",
    phone: "9643889803",
    photoUrl: "/leadership/himanshu-gulati.jpg",
  },
  {
    name: "Rtr. Harshita Malhotra",
    designation: "District Rotaract Secretary - Administration",
    kind: "core",
    order: 8,
    email: "harshitam2636@gmail.com",
    phone: "9315267609",
    photoUrl: "/leadership/harshita-malhotra.jpeg",
  },
  {
    name: "Rtr. Ayush Rai",
    designation: "Assistant District Rotaract Representative",
    kind: "core",
    order: 9,
    email: "aayushrai68@gmail.com",
    phone: "7065668589",
    photoUrl: "/leadership/ayush-rai.png",
  },
  {
    name: "PHF Rtr. Radhika Bansal",
    designation: "Assistant District Rotaract Representative",
    kind: "core",
    order: 10,
    email: "rtr.radhikabansal23@gmail.com",
    phone: "8826274877",
    photoUrl: "/leadership/radhika-bansal.png",
  },
  {
    name: "Rtn. Rtr. Harshit Mehta",
    designation: "District Treasurer",
    kind: "core",
    order: 11,
    email: "rtrharshit0403@gmail.com",
    phone: "9899424822",
    photoUrl: "/leadership/harshit-mehta.jpg",
  },
  {
    name: "Rtr. V Tushaar",
    designation: "District Sergeant at Arms",
    kind: "core",
    order: 12,
    email: "rtr.tushaar@gmail.com",
    phone: "9667836167",
    photoUrl: "/leadership/v-tushaar.jpeg",
  },
  {
    name: "Rtr. Drishti Buttan",
    designation: "District Sergeant at Arms",
    kind: "core",
    order: 13,
    email: "drishtibuttan12@gmail.com",
    phone: "9773728313",
    photoUrl: "/leadership/drishti-buttan.jpeg",
  },
  {
    name: "Rtr. Tanishaa Sonker",
    designation: "Zonal Rotaract Representative",
    kind: "core",
    order: 14,
    email: "tanishaasonker08@gmail.com",
    phone: "9305833297",
    photoUrl: "/leadership/tanishaa-sonker.jpeg",
  },
  {
    name: "Rtn. Rtr. Kanav Sachdeva",
    designation: "Zonal Rotaract Representative",
    kind: "core",
    order: 15,
    email: "sachdevakanav3@gmail.com",
    phone: "9821909169",
    photoUrl: "/leadership/kanav-sachdeva.jpg",
  },
  {
    name: "Rtr. Dhruv Kumar Jha",
    designation: "Zonal Rotaract Representative",
    kind: "core",
    order: 16,
    email: "rtrdhruvjha@gmail.com",
    phone: "9534987772",
    photoUrl: "/leadership/dhruv-kumar-jha.jpg",
  },
  {
    name: "Rtr. Palak Jain",
    designation: "Zonal Rotaract Representative",
    kind: "core",
    order: 17,
    email: "palak041003@gmail.com",
    phone: "8218365157",
    photoUrl: "/leadership/palak-jain.jpeg",
  },
  {
    name: "Rtr. Arjun Pratap Singh",
    designation: "Zonal Rotaract Secretary",
    kind: "dsc",
    order: 18,
    email: "stormk375@gmail.com",
    phone: "9318317554",
    photoUrl: "/leadership/arjun-pratap-singh.jpeg",
  },
  {
    name: "Rtr. Pratham Girdhar",
    designation: "Zonal Rotaract Secretary",
    kind: "dsc",
    order: 19,
    email: "prathamgirdhar08@gmail.com",
    phone: "7302495688",
    photoUrl: "/leadership/pratham-girdhar.jpeg",
  },
  {
    name: "Rtr. Kartik Kumar",
    designation: "Zonal Rotaract Secretary",
    kind: "dsc",
    order: 20,
    email: "kartiksingh15082005@gmail.com",
    phone: "9582323419",
    photoUrl: "/leadership/kartik-kumar.jpg",
  },
  {
    name: "Rtr. Hitaishi Chawla",
    designation: "Zonal Rotaract Secretary",
    kind: "dsc",
    order: 21,
    email: "rtrhitaishichawla@gmail.com",
    phone: "9810410704",
    photoUrl: "/leadership/hitaishi-chawla.png",
  },
  {
    name: "Rtr. Ritik Varshney",
    designation: "District Chair - Rotaract Inter-District Exchange (RIDE)",
    kind: "dsc",
    order: 22,
    email: "ritikvarshney483@gmail.com",
    phone: "8006911311",
    photoUrl: "/leadership/ritik-varshney.jpg",
  },
  {
    name: "Rtr. Yashika Malhotra",
    designation: "District Chair - Membership",
    kind: "dsc",
    order: 23,
    email: "yashika11malhotra@gmail.com",
    phone: "8287628612",
    photoUrl: "/leadership/yashika-malhotra.jpeg",
  },
  {
    name: "Rtr. Nishith Majumdar",
    designation: "District Chair - Community Services",
    kind: "dsc",
    order: 24,
    email: "nishithmajumdar8@gmail.com",
    phone: "7011079558",
    photoUrl: "/leadership/nishith-majumdar.jpeg",
  },
  {
    name: "Rtr. Efaa Jafri",
    designation: "District Chair - Community Services",
    kind: "dsc",
    order: 25,
    email: "rtrefaajafri20@gmail.com",
    phone: "9311632069",
    photoUrl: "/leadership/efaa-jafri.png",
  },
  {
    name: "Rtr. Harshita Agarwal",
    designation: "District Chair - Community Services",
    kind: "dsc",
    order: 26,
    email: "harshitaagarwal2704@gmail.com",
    phone: "8130120701",
    photoUrl: "/leadership/harshita-agarwal.jpg",
  },
  {
    name: "Rtr. Paridhi Rawat",
    designation: "District Chair - Club Services",
    kind: "dsc",
    order: 27,
    email: "rtrparidhirawat@gmail.com",
    phone: "8860409982",
    photoUrl: "/leadership/paridhi-rawat.jpeg",
  },
  {
    name: "Rtr. Aryan Sanjeev",
    designation: "District Chair - Club Services",
    kind: "dsc",
    order: 28,
    email: "rtrarynsnjv@gmail.com",
    phone: "8826880497",
    photoUrl: "/leadership/aryan-sanjeev.jpg",
  },
  {
    name: "Rtr. Rachit Kathuria",
    designation: "District Chair - Vocational Services",
    kind: "dsc",
    order: 29,
    email: "rtrrachitkathuria@gmail.com",
    phone: "8851974024",
    photoUrl: "/leadership/rachit-kathuria.png",
  },
  {
    name: "Rtr. Sejal Mishra",
    designation: "District Chair - Vocational Services",
    kind: "dsc",
    order: 30,
    email: "sejalmishra432@gmail.com",
    phone: "9625817125",
    photoUrl: "/leadership/sejal-mishra.png",
  },
  {
    name: "Rtr. Prashant Joshi",
    designation: "District Chair - International Services",
    kind: "dsc",
    order: 31,
    email: "prashantjoshi8088@gmail.com",
    phone: "7300685437",
    photoUrl: "/leadership/prashant-joshi.png",
  },
  {
    name: "Rtr. Saransh Srivastava",
    designation: "District Chair - International Services",
    kind: "dsc",
    order: 32,
    email: "rtrsaranshsrivastava@gmail.com",
    phone: "9599550719",
    photoUrl: "/leadership/saransh-srivastava.png",
  },
  {
    name: "Rtr. Shubham Singh",
    designation: "District Chair - International Services",
    kind: "dsc",
    order: 33,
    email: "singh.shubham1901@gmail.com",
    phone: "7900542995",
    photoUrl: "/leadership/shubham-singh.jpg",
  },
  {
    name: "Rtr. Bhavya Mehta",
    designation: "District Chair - Gender Development",
    kind: "dsc",
    order: 34,
    email: "rtrbhavyamehta@gmail.com",
    phone: "9899834027",
    photoUrl: "/leadership/bhavya-mehta.jpg",
  },
  {
    name: "Rtr. Yashica Chaudhary",
    designation: "District Chair - Rotaract - Interact Relations",
    kind: "dsc",
    order: 35,
    email: "yashicachaudhary2026@gmail.com",
    phone: "9717832715",
    photoUrl: "/leadership/yashica-chaudhary.png",
  },
  {
    name: "Rtr. Avni Bhatia",
    designation: "District Co- Chair - Rotaract - Interact Relations",
    kind: "dsc",
    order: 36,
    email: "avnibhatia0707@gmail.com",
    phone: "7982927168",
    photoUrl: "/leadership/avni-bhatia.jpeg",
  },
  {
    name: "Rtr. Jatin Mugrai",
    designation: "District Co- Chair - Rotaract - Interact Relations",
    kind: "dsc",
    order: 37,
    email: "jatin.mugrai25@gmail.com",
    phone: "9355456999",
    photoUrl: "/leadership/jatin-mugrai.jpg",
  },
  {
    name: "Rtr. Shreya Singh",
    designation: "District Chair - Corporate Relations",
    kind: "dsc",
    order: 38,
    email: "shreyaasinghh585@gmail.com",
    phone: "6307097958",
    photoUrl: "/leadership/shreya-singh.jpeg",
  },
  {
    name: "Rtr. Apurv Jain",
    designation: "District Chair - Corporate Relations",
    kind: "dsc",
    order: 39,
    email: "apurvjain2003@gmail.com",
    phone: "9992829846",
    photoUrl: "/leadership/apurv-jain.jpeg",
  },
  {
    name: "Rtr. Yaman Puri",
    designation: "District Chair - Sponsorship",
    kind: "dsc",
    order: 40,
    email: "yamanpuri@outlook.in",
    phone: "8750411555",
    photoUrl: "/leadership/yaman-puri.jpeg",
  },
  {
    name: "Rtr. Jayant Kumar Sharma",
    designation: "District Chair - Multimedia",
    kind: "dsc",
    order: 41,
    email: "jayantsharmacreates@gmail.com",
    phone: "8862827515",
    photoUrl: "/leadership/jayant-kumar-sharma.jpeg",
  },
  {
    name: "Rtr. Ashi Gupta",
    designation: "District Chair - Multimedia",
    kind: "dsc",
    order: 42,
    email: "ashi7142@gmail.com",
    phone: "8851645688",
    photoUrl: "/leadership/ashi-gupta.jpeg",
  },
  {
    name: "Rtr. Mayur Pandita",
    designation: "District Chair - Social Media",
    kind: "dsc",
    order: 43,
    email: "mayurpandita7@gmail.com",
    phone: "9906981963",
    photoUrl: "/leadership/mayur-pandita.jpeg",
  },
  {
    name: "Rtr. Mukta Kumari",
    designation: "District Editor",
    kind: "dsc",
    order: 44,
    email: "muktakumari1811@gmail.com",
    phone: "8368803505",
    photoUrl: "/leadership/mukta-kumari.png",
  },
  {
    name: "Rtr. Durgesh K Chaudhary",
    designation: "District Photographer",
    kind: "dsc",
    order: 45,
    email: "durgesh.ly22@gmail.com",
    phone: "7462893778",
    photoUrl: "/leadership/durgesh-k-chaudhary.jpg",
  },
  {
    name: "Rtr. Rajveer Singh Marwah",
    designation: "District Chair - Technology",
    kind: "dsc",
    order: 46,
    email: "jasraj2626@gmail.com",
    phone: "9315218284",
    photoUrl: "/leadership/rajveer-singh-marwah.jpg",
  },
  {
    name: "Rtr. Mehul Buttan",
    designation: "District Co-Chair - Technology",
    kind: "dsc",
    order: 47,
    email: "mehulbuttan85@gmail.com",
    phone: "8377842506",
    photoUrl: "/leadership/mehul-buttan.jpg",
  },
  {
    name: "Rtr. Vrinda Garg",
    designation: "District Web Administrator",
    kind: "dsc",
    order: 48,
    email: "vrinda.garg1998@gmail.com",
    phone: "9871577088",
    photoUrl: "/leadership/vrinda-garg.jpg",
  },
  {
    name: "Rtr. Parth Agarwal",
    designation: "District Web Administrator",
    kind: "dsc",
    order: 49,
    email: "thisisparthagarwal@gmail.com",
    phone: "7011638319",
    photoUrl: "/leadership/parth-agarwal.jpg",
  },
  {
    name: "Rtr. Dhruvika Chopra",
    designation: "District Chair - Artificial Intelligence",
    kind: "dsc",
    order: 50,
    email: "dhruvika038@gmail.com",
    phone: "7303530476",
    photoUrl: "/leadership/dhruvika-chopra.jpeg",
  }
];

// Real, client-confirmed district achievements for RY 2026-27. The earlier seed carried five
// milestone rows restating the impact-stats tiles; none were substantiated, so they are removed below.
export const ACHIEVEMENTS_SEED: {
  title: string;
  type: 'chartered_club' | 'milestone';
  description: string;
  date: string;
  order: number;
}[] = [
  {
    title: 'Clubs Chartered During the Year',
    type: 'chartered_club',
    description:
      'Three new community and campus Rotaract clubs chartered this Rotary year, expanding youth leadership and service reach across Delhi NCR.',
    // No single charter date exists for the set, so this is pinned to the start of the Rotary year.
    date: '2026-07-01',
    order: 0,
  },
  {
    title: '100% Attendance at DOLS',
    type: 'milestone',
    description:
      'Full attendance achieved at the District Officers Leadership Seminar (DOLS) by the district team.',
    date: '2026-08-02',
    order: 1,
  },
  {
    title: '500+ Participation at District Installation',
    type: 'milestone',
    description:
      'Attendees from clubs across all four zones came together at the District Installation Ceremony for RY 2026-27.',
    date: '2026-08-12',
    order: 2,
  },
  {
    title: 'CLLS and PLS/SLS Conducted',
    type: 'milestone',
    description:
      'Club Leaders Leadership Seminar (CLLS) and President/Secretary Leadership Seminars (PLS/SLS) conducted for club office bearers.',
    date: '2026-08-30',
    order: 3,
  },
];

// Fabricated milestones shipped by an earlier seed and still live in production. Deleting by title on
// every run would keep matching forever, so a legitimate future admin milestone of the same name would
// silently vanish on the next deploy; the delete is one-shot behind a Setting row instead.
export const RETIRED_ACHIEVEMENTS_FLAG_KEY = 'seed.repair.achievements.retired-titles.done';
const RETIRED_DISTRICT_TEAM_FLAG_KEY = 'seed.repair.district-team.retired-names.done';
// Placeholder leadership carried over from the legacy site. The real DG is
// Rtn. CA Ajeet Jalan and the real DRR is Rtn. Rtr. Archit Bhatia, both already
// present, so these two rendered as duplicate and incorrect office holders.
export const RETIRED_DISTRICT_TEAM_NAMES = ['Rtn. Sanjeev Rai Mehra', 'Rtr. Ananya Sharma'];

export const RETIRED_ACHIEVEMENT_TITLES = [
  '55,000+ lives impacted',
  '75 active clubs',
  '₹1.5 Cr mobilised',
  '500+ projects executed',
  '15,000+ blood units donated',
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

export async function seedDistrictTeam(
  prisma: PrismaClient,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  if (!(await prisma.setting.findUnique({ where: { key: RETIRED_DISTRICT_TEAM_FLAG_KEY } }))) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.districtTeamMember.deleteMany({
        where: { name: { in: RETIRED_DISTRICT_TEAM_NAMES } },
      });
      await tx.setting.upsert({
        where: { key: RETIRED_DISTRICT_TEAM_FLAG_KEY },
        create: {
          key: RETIRED_DISTRICT_TEAM_FLAG_KEY,
          value: { completedAt: new Date().toISOString() },
        },
        update: {},
      });
      if (count > 0) log(`deleted ${count} placeholder district team member(s)`);
    });
  }
  for (const member of DISTRICT_TEAM_SEED) {
    const existing = await prisma.districtTeamMember.findFirst({
      where: { name: member.name, designation: member.designation, ryYear: CURRENT_RY_YEAR },
    });
    const data = {
      name: member.name,
      designation: member.designation,
      kind: member.kind,
      order: member.order,
      email: member.email,
      phone: member.phone,
      photoUrl: member.photoUrl,
      ryYear: CURRENT_RY_YEAR,
    };
    if (existing) await prisma.districtTeamMember.update({ where: { id: existing.id }, data });
    else await prisma.districtTeamMember.create({ data });
  }
}

export async function seedAchievements(
  prisma: PrismaClient,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  if (!(await prisma.setting.findUnique({ where: { key: RETIRED_ACHIEVEMENTS_FLAG_KEY } }))) {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.achievement.deleteMany({
        where: { title: { in: RETIRED_ACHIEVEMENT_TITLES } },
      });
      await tx.setting.upsert({
        where: { key: RETIRED_ACHIEVEMENTS_FLAG_KEY },
        create: {
          key: RETIRED_ACHIEVEMENTS_FLAG_KEY,
          value: { completedAt: new Date().toISOString() },
        },
        update: {},
      });
      if (count > 0) log(`deleted ${count} fabricated achievement(s)`);
    });
  }
  for (const a of ACHIEVEMENTS_SEED) {
    // Achievement has no unique key and a live admin CRUD writes to the same table, so the match is
    // narrowed by type and ordered so a duplicate title always resolves to the same, oldest row.
    const existing = await prisma.achievement.findFirst({
      where: { title: a.title, type: a.type },
      orderBy: { createdAt: 'asc' },
    });
    const data = {
      type: a.type,
      title: a.title,
      description: a.description,
      date: new Date(`${a.date}T00:00:00Z`),
      order: a.order,
    };
    if (existing) await prisma.achievement.update({ where: { id: existing.id }, data });
    else await prisma.achievement.create({ data });
  }
}

export async function seedPublicContent(
  prisma: PrismaClient,
  log: (msg: string) => void = () => undefined,
): Promise<void> {
  await seedPastDrrs(prisma);
  await seedDistrictTeam(prisma, log);
  await seedAchievements(prisma, log);
}
