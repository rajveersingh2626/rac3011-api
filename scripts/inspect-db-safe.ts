import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://rac3011:pVV0bKFfDruFvjB2pNTD1Qb2oUsTzNP@127.0.0.1:5434/rac3011'
    }
  }
});

async function inspectDb() {
  try {
    console.log('Connecting via Prisma Client...');
    await prisma.$connect();
    console.log('Connected successfully!');

    // Query tables safely via raw SQL to check row counts without mutating anything
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log(`\nFound ${tables.length} tables in database:`);
    for (const t of tables) {
      const name = t.table_name;
      // Skip internal migration table from detailed inspection
      try {
        const countRes = await prisma.$queryRawUnsafe(`SELECT count(*) FROM "${name}";`);
        const count = countRes[0]?.count ?? 0;
        console.log(`  • ${name}: ${count} rows`);
      } catch (err) {
        console.log(`  • ${name}: (error reading count)`);
      }
    }

    // Inspect clubs sample
    const clubCount = await prisma.club.count();
    console.log(`\nTotal clubs in prisma.club: ${clubCount}`);
    if (clubCount > 0) {
      const sampleClub = await prisma.club.findFirst();
      console.log('Sample club:', sampleClub?.name, '| zone:', sampleClub?.zone, '| zoneId:', sampleClub?.zoneId);
    }

    // Inspect district team sample
    const teamCount = await prisma.districtTeamMember.count();
    console.log(`Total members in district_team: ${teamCount}`);
    if (teamCount > 0) {
      const sampleTeam = await prisma.districtTeamMember.findMany({ take: 3 });
      console.log('Sample team members:', sampleTeam.map(m => `${m.name} (${m.designation})`));
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('Inspection error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

inspectDb();
