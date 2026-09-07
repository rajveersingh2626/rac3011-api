import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://rac3011:pVV0bKFfDruFvjB2pNTD1Qb2oUsTzNP@127.0.0.1:5434/rac3011'
    }
  }
});

async function inspectClubsAndZones() {
  try {
    const zones = await prisma.zone.findMany();
    console.log(`ZONES IN DB (${zones.length}):`, zones.map(z => ({ id: z.id, name: z.name })));

    const clubs = await prisma.club.findMany({
      select: {
        id: true,
        name: true,
        zone: true,
        zoneId: true,
        lat: true,
        lng: true,
        president: true,
        phone: true,
        email: true
      },
      take: 10
    });
    console.log(`\nFIRST 10 CLUBS:`, clubs);

    const team = await prisma.districtTeamMember.findMany({
      where: { ryYear: 2026 }
    });
    console.log(`\nDISTRICT TEAM MEMBERS (ryYear 2026): ${team.length}`);
    if (team.length > 0) {
      console.log('Existing 2026 team sample:', team.slice(0, 5).map(m => `${m.name} | ${m.designation}`));
    }

    const legacyProfiles = await prisma.legacyUserProfile.count();
    console.log(`\nLEGACY USER PROFILES COUNT: ${legacyProfiles}`);

    await prisma.$disconnect();
  } catch (err) {
    console.error('Error:', err);
    await prisma.$disconnect();
  }
}

inspectClubsAndZones();
