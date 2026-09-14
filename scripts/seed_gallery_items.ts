import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GALLERY_SEED_ITEMS = [
  {
    title: 'District Leadership Training Seminar 2026',
    eventName: 'Aagaaz - DLTS 2026',
    category: 'District Events',
    imageUrl: 'https://rotaract3011.org/slideshow-team-hall.webp',
    caption: 'Incoming club leaders and district officials gathering for leadership orientation and strategic planning.',
    date: new Date('2026-07-12'),
    order: 1,
  },
  {
    title: 'Rotaract District Assembly Installation',
    eventName: 'District Installation Ceremony',
    category: 'Installations',
    imageUrl: 'https://rotaract3011.org/slideshow-yugarambh-sitting.webp',
    caption: 'Official collar transfer and charter presentation celebrating the commencement of Rotary Year 2026-27.',
    date: new Date('2026-07-26'),
    order: 2,
  },
  {
    title: 'Mahadan 11.0 Mega Blood Donation Drive',
    eventName: 'Mahadan 11.0',
    category: 'Club Projects',
    imageUrl: 'https://rotaract3011.org/showcase_images/amrit-40-chabeel-seva-c20-1.webp',
    caption: 'Joint community blood donation camp uniting clubs across Delhi and NCR.',
    date: new Date('2026-08-15'),
    order: 3,
  },
  {
    title: 'District Fellowship Night & Cultural Evening',
    eventName: 'Jalsa Fellowship',
    category: 'Socials',
    imageUrl: 'https://rotaract3011.org/slideshow-drr-speech.webp',
    caption: 'Rotaractors across zones bonding over music, talent showcases, and cultural performances.',
    date: new Date('2026-08-28'),
    order: 4,
  },
  {
    title: 'Youth Leadership & Career Conclave',
    eventName: 'Career Conclave 2026',
    category: 'Conferences',
    imageUrl: 'https://rotaract3011.org/slideshow-dg-speech.webp',
    caption: 'Panel discussions on corporate readiness, tech careers, and entrepreneurship by distinguished Rotarians.',
    date: new Date('2026-09-05'),
    order: 5,
  },
  {
    title: 'Rotary Day of Service - Environmental Drive',
    eventName: 'Green Delhi Initiative',
    category: 'Club Projects',
    imageUrl: 'https://rotaract3011.org/showcase_images/apnapan-a-rakhi-initiative-c72-1.webp',
    caption: 'Tree plantation drive and ecological awareness campaign conducted across NCR universities.',
    date: new Date('2026-09-10'),
    order: 6,
  },
  {
    title: 'District Rotaract Cricket League',
    eventName: 'RCL Season 2026',
    category: 'District Events',
    imageUrl: 'https://rotaract3011.org/rcl-cricket.webp',
    caption: 'Inter-club sporting fellowship and cricket tournament across Delhi NCR.',
    date: new Date('2026-09-01'),
    order: 7,
  },
  {
    title: 'District Council Oath Taking',
    eventName: 'DAC Induction 2026-27',
    category: 'Installations',
    imageUrl: 'https://rotaract3011.org/hero-dac-oath.webp',
    caption: 'District Action Committee taking the pledge to serve Rotary International District 3011.',
    date: new Date('2026-07-20'),
    order: 8,
  },
  {
    title: 'Yugarambh - District Rotaract Assembly',
    eventName: 'Yugarambh 2026',
    category: 'Installations',
    imageUrl: 'https://rotaract3011.org/slideshow-yugarambh-standing.webp',
    caption: 'Celebrating the vibrant spirit of youth fellowship at Yugarambh 2026.',
    date: new Date('2026-07-27'),
    order: 9,
  },
];

async function main() {
  console.log('Seeding official gallery items into database...');
  for (const item of GALLERY_SEED_ITEMS) {
    const existing = await prisma.galleryItem.findFirst({
      where: {
        title: item.title,
      },
    });

    if (existing) {
      await prisma.galleryItem.update({
        where: { id: existing.id },
        data: item,
      });
      console.log(`Updated gallery item: ${item.title}`);
    } else {
      await prisma.galleryItem.create({
        data: item,
      });
      console.log(`Created gallery item: ${item.title}`);
    }
  }

  const count = await prisma.galleryItem.count();
  console.log(`Total gallery items in database: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding gallery items:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
