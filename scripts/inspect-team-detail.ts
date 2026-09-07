import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://rac3011:pVV0bKFfDruFvjB2pNTD1Qb2oUsTzNP@127.0.0.1:5434/rac3011'
    }
  }
});

async function inspectTeam() {
  const members = await prisma.districtTeamMember.findMany();
  console.log(`TOTAL MEMBERS IN district_team: ${members.length}`);
  members.forEach(m => {
    console.log(`- [${m.id}] ${m.name} (${m.designation}) | ryYear: ${m.ryYear} | photoUrl: ${m.photoUrl}`);
  });
  await prisma.$disconnect();
}

inspectTeam();
