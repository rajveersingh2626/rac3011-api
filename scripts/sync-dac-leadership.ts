import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://rac3011:pVV0bKFfDruFvjB2pNTD1Qb2oUsTzNP@127.0.0.1:5434/rac3011';
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

export interface DacLeaderEntry {
  name: string;
  designation: string;
  email: string;
  phone: string;
  photoUrl: string;
  kind: 'core' | 'dsc';
  order: number;
}

export const DAC_LEADERSHIP_DATA: DacLeaderEntry[] = [
  {
    "name": "Rtn. Rtr. Archit Bhatia",
    "designation": "District Rotaract Representative",
    "email": "itsdrrarchit@gmail.com",
    "phone": "9560126152",
    "photoUrl": "/leadership/archit-bhatia.webp",
    "kind": "core",
    "order": 1
  },
  {
    "name": "Rtn. Rtr. Sarthak Bansal",
    "designation": "District Learning Facilitator",
    "email": "rtr.sarthak3003@gmail.com",
    "phone": "8700096024",
    "photoUrl": "/leadership/sarthak-bansal.webp",
    "kind": "core",
    "order": 2
  },
  {
    "name": "Rtr. Divyanshu Katiyar",
    "designation": "Deputy District Rotaract Representative",
    "email": "rtrdivyanshu3011@gmail.com",
    "phone": "9794565358",
    "photoUrl": "/leadership/divyanshu-katiyar.jpeg",
    "kind": "core",
    "order": 3
  },
  {
    "name": "Rtr. Rajat Kapoor",
    "designation": "District Chair - Operations",
    "email": "rajatkapoor44@gmail.com",
    "phone": "7838923776",
    "photoUrl": "/leadership/rajat-kapoor.jpg",
    "kind": "dsc",
    "order": 4
  },
  {
    "name": "Rtr. Sarthak Manchanda",
    "designation": "District Chair - Administration",
    "email": "sarthakmanchanda2@gmail.com",
    "phone": "7206708029",
    "photoUrl": "/leadership/sarthak-manchanda.jpg",
    "kind": "dsc",
    "order": 5
  },
  {
    "name": "Rtr. Shefali Prakash",
    "designation": "District Rotaract General Secretary",
    "email": "rtrshefali2004@gmail.com",
    "phone": "8826376323",
    "photoUrl": "/leadership/shefali-prakash.jpg",
    "kind": "core",
    "order": 6
  },
  {
    "name": "Rtn. Rtr. Himanshu Gulati",
    "designation": "District Rotaract Secretary - Reporting",
    "email": "himanshugulati.rotary@gmail.com",
    "phone": "9643889803",
    "photoUrl": "/leadership/himanshu-gulati.jpg",
    "kind": "core",
    "order": 7
  },
  {
    "name": "Rtr. Harshita Malhotra",
    "designation": "District Rotaract Secretary - Administration",
    "email": "harshitam2636@gmail.com",
    "phone": "9315267609",
    "photoUrl": "/leadership/harshita-malhotra.jpeg",
    "kind": "core",
    "order": 8
  },
  {
    "name": "Rtr. Ayush Rai",
    "designation": "Assistant District Rotaract Representative",
    "email": "aayushrai68@gmail.com",
    "phone": "7065668589",
    "photoUrl": "/leadership/ayush-rai.png",
    "kind": "core",
    "order": 9
  },
  {
    "name": "PHF Rtr. Radhika Bansal",
    "designation": "Assistant District Rotaract Representative",
    "email": "rtr.radhikabansal23@gmail.com",
    "phone": "8826274877",
    "photoUrl": "/leadership/radhika-bansal.png",
    "kind": "core",
    "order": 10
  },
  {
    "name": "Rtn. Rtr. Harshit Mehta",
    "designation": "District Treasurer",
    "email": "rtrharshit0403@gmail.com",
    "phone": "9899424822",
    "photoUrl": "/leadership/harshit-mehta.jpg",
    "kind": "core",
    "order": 11
  },
  {
    "name": "Rtr. V Tushaar",
    "designation": "District Sergeant at Arms",
    "email": "rtr.tushaar@gmail.com",
    "phone": "9667836167",
    "photoUrl": "/leadership/v-tushaar.jpeg",
    "kind": "core",
    "order": 12
  },
  {
    "name": "Rtr. Drishti Buttan",
    "designation": "District Sergeant at Arms",
    "email": "drishtibuttan12@gmail.com",
    "phone": "9773728313",
    "photoUrl": "/leadership/drishti-buttan.jpeg",
    "kind": "core",
    "order": 13
  },
  {
    "name": "Rtr. Tanishaa Sonker",
    "designation": "Zonal Rotaract Representative",
    "email": "tanishaasonker08@gmail.com",
    "phone": "9305833297",
    "photoUrl": "/leadership/tanishaa-sonker.jpeg",
    "kind": "core",
    "order": 14
  },
  {
    "name": "Rtn. Rtr. Kanav Sachdeva",
    "designation": "Zonal Rotaract Representative",
    "email": "sachdevakanav3@gmail.com",
    "phone": "9821909169",
    "photoUrl": "/leadership/kanav-sachdeva.jpg",
    "kind": "core",
    "order": 15
  },
  {
    "name": "Rtr. Dhruv Kumar Jha",
    "designation": "Zonal Rotaract Representative",
    "email": "rtrdhruvjha@gmail.com",
    "phone": "9534987772",
    "photoUrl": "/leadership/dhruv-kumar-jha.jpg",
    "kind": "core",
    "order": 16
  },
  {
    "name": "Rtr. Palak Jain",
    "designation": "Zonal Rotaract Representative",
    "email": "palak041003@gmail.com",
    "phone": "8218365157",
    "photoUrl": "/leadership/palak-jain.jpeg",
    "kind": "core",
    "order": 17
  },
  {
    "name": "Rtr. Arjun Pratap Singh",
    "designation": "Zonal Rotaract Secretary",
    "email": "stormk375@gmail.com",
    "phone": "9318317554",
    "photoUrl": "/leadership/arjun-pratap-singh.jpeg",
    "kind": "dsc",
    "order": 18
  },
  {
    "name": "Rtr. Pratham Girdhar",
    "designation": "Zonal Rotaract Secretary",
    "email": "prathamgirdhar08@gmail.com",
    "phone": "7302495688",
    "photoUrl": "/leadership/pratham-girdhar.jpeg",
    "kind": "dsc",
    "order": 19
  },
  {
    "name": "Rtr. Kartik Kumar",
    "designation": "Zonal Rotaract Secretary",
    "email": "kartiksingh15082005@gmail.com",
    "phone": "9582323419",
    "photoUrl": "/leadership/kartik-kumar.jpg",
    "kind": "dsc",
    "order": 20
  },
  {
    "name": "Rtr. Hitaishi Chawla",
    "designation": "Zonal Rotaract Secretary",
    "email": "rtrhitaishichawla@gmail.com",
    "phone": "9810410704",
    "photoUrl": "/leadership/hitaishi-chawla.png",
    "kind": "dsc",
    "order": 21
  },
  {
    "name": "Rtr. Ritik Varshney",
    "designation": "District Chair - Rotaract Inter-District Exchange (RIDE)",
    "email": "ritikvarshney483@gmail.com",
    "phone": "8006911311",
    "photoUrl": "/leadership/ritik-varshney.jpg",
    "kind": "dsc",
    "order": 22
  },
  {
    "name": "Rtr. Yashika Malhotra",
    "designation": "District Chair - Membership",
    "email": "yashika11malhotra@gmail.com",
    "phone": "8287628612",
    "photoUrl": "/leadership/yashika-malhotra.jpeg",
    "kind": "dsc",
    "order": 23
  },
  {
    "name": "Rtr. Nishith Majumdar",
    "designation": "District Chair - Community Services",
    "email": "nishithmajumdar8@gmail.com",
    "phone": "7011079558",
    "photoUrl": "/leadership/nishith-majumdar.jpeg",
    "kind": "dsc",
    "order": 24
  },
  {
    "name": "Rtr. Efaa Jafri",
    "designation": "District Chair - Community Services",
    "email": "rtrefaajafri20@gmail.com",
    "phone": "9311632069",
    "photoUrl": "/leadership/efaa-jafri.png",
    "kind": "dsc",
    "order": 25
  },
  {
    "name": "Rtr. Harshita Agarwal",
    "designation": "District Chair - Community Services",
    "email": "harshitaagarwal2704@gmail.com",
    "phone": "8130120701",
    "photoUrl": "/leadership/harshita-agarwal.jpg",
    "kind": "dsc",
    "order": 26
  },
  {
    "name": "Rtr. Paridhi Rawat",
    "designation": "District Chair - Club Services",
    "email": "rtrparidhirawat@gmail.com",
    "phone": "8860409982",
    "photoUrl": "/leadership/paridhi-rawat.jpeg",
    "kind": "dsc",
    "order": 27
  },
  {
    "name": "Rtr. Aryan Sanjeev",
    "designation": "District Chair - Club Services",
    "email": "rtrarynsnjv@gmail.com",
    "phone": "8826880497",
    "photoUrl": "/leadership/aryan-sanjeev.jpg",
    "kind": "dsc",
    "order": 28
  },
  {
    "name": "Rtr. Rachit Kathuria",
    "designation": "District Chair - Vocational Services",
    "email": "rtrrachitkathuria@gmail.com",
    "phone": "8851974024",
    "photoUrl": "/leadership/rachit-kathuria.png",
    "kind": "dsc",
    "order": 29
  },
  {
    "name": "Rtr. Sejal Mishra",
    "designation": "District Chair - Vocational Services",
    "email": "sejalmishra432@gmail.com",
    "phone": "9625817125",
    "photoUrl": "/leadership/sejal-mishra.png",
    "kind": "dsc",
    "order": 30
  },
  {
    "name": "Rtr. Prashant Joshi",
    "designation": "District Chair - International Services",
    "email": "prashantjoshi8088@gmail.com",
    "phone": "7300685437",
    "photoUrl": "/leadership/prashant-joshi.png",
    "kind": "dsc",
    "order": 31
  },
  {
    "name": "Rtr. Saransh Srivastava",
    "designation": "District Chair - International Services",
    "email": "rtrsaranshsrivastava@gmail.com",
    "phone": "9599550719",
    "photoUrl": "/leadership/saransh-srivastava.png",
    "kind": "dsc",
    "order": 32
  },
  {
    "name": "Rtr. Shubham Singh",
    "designation": "District Chair - International Services",
    "email": "singh.shubham1901@gmail.com",
    "phone": "7900542995",
    "photoUrl": "/leadership/shubham-singh.jpg",
    "kind": "dsc",
    "order": 33
  },
  {
    "name": "Rtr. Bhavya Mehta",
    "designation": "District Chair - Gender Development",
    "email": "rtrbhavyamehta@gmail.com",
    "phone": "9899834027",
    "photoUrl": "/leadership/bhavya-mehta.jpg",
    "kind": "dsc",
    "order": 34
  },
  {
    "name": "Rtr. Yashica Chaudhary",
    "designation": "District Chair - Rotaract - Interact Relations",
    "email": "yashicachaudhary2026@gmail.com",
    "phone": "9717832715",
    "photoUrl": "/leadership/yashica-chaudhary.png",
    "kind": "dsc",
    "order": 35
  },
  {
    "name": "Rtr. Avni Bhatia",
    "designation": "District Co- Chair - Rotaract - Interact Relations",
    "email": "avnibhatia0707@gmail.com",
    "phone": "7982927168",
    "photoUrl": "/leadership/avni-bhatia.jpeg",
    "kind": "dsc",
    "order": 36
  },
  {
    "name": "Rtr. Jatin Mugrai",
    "designation": "District Co- Chair - Rotaract - Interact Relations",
    "email": "jatin.mugrai25@gmail.com",
    "phone": "9355456999",
    "photoUrl": "/leadership/jatin-mugrai.jpg",
    "kind": "dsc",
    "order": 37
  },
  {
    "name": "Rtr. Shreya Singh",
    "designation": "District Chair - Corporate Relations",
    "email": "shreyaasinghh585@gmail.com",
    "phone": "6307097958",
    "photoUrl": "/leadership/shreya-singh.jpeg",
    "kind": "dsc",
    "order": 38
  },
  {
    "name": "Rtr. Apurv Jain",
    "designation": "District Chair - Corporate Relations",
    "email": "apurvjain2003@gmail.com",
    "phone": "9992829846",
    "photoUrl": "/leadership/apurv-jain.jpeg",
    "kind": "dsc",
    "order": 39
  },
  {
    "name": "Rtr. Yaman Puri",
    "designation": "District Chair - Sponsorship",
    "email": "yamanpuri@outlook.in",
    "phone": "8750411555",
    "photoUrl": "/leadership/yaman-puri.jpeg",
    "kind": "dsc",
    "order": 40
  },
  {
    "name": "Rtr. Jayant Kumar Sharma",
    "designation": "District Chair - Multimedia",
    "email": "jayantsharmacreates@gmail.com",
    "phone": "8862827515",
    "photoUrl": "/leadership/jayant-kumar-sharma.jpeg",
    "kind": "dsc",
    "order": 41
  },
  {
    "name": "Rtr. Ashi Gupta",
    "designation": "District Chair - Multimedia",
    "email": "ashi7142@gmail.com",
    "phone": "8851645688",
    "photoUrl": "/leadership/ashi-gupta.jpeg",
    "kind": "dsc",
    "order": 42
  },
  {
    "name": "Rtr. Mayur Pandita",
    "designation": "District Chair - Social Media",
    "email": "mayurpandita7@gmail.com",
    "phone": "9906981963",
    "photoUrl": "/leadership/mayur-pandita.jpeg",
    "kind": "dsc",
    "order": 43
  },
  {
    "name": "Rtr. Mukta Kumari",
    "designation": "District Editor",
    "email": "muktakumari1811@gmail.com",
    "phone": "8368803505",
    "photoUrl": "/leadership/mukta-kumari.png",
    "kind": "dsc",
    "order": 44
  },
  {
    "name": "Rtr. Durgesh K Chaudhary",
    "designation": "District Photographer",
    "email": "durgesh.ly22@gmail.com",
    "phone": "7462893778",
    "photoUrl": "/leadership/durgesh-k-chaudhary.jpg",
    "kind": "dsc",
    "order": 45
  },
  {
    "name": "Rtr. Rajveer Singh Marwah",
    "designation": "District Chair - Technology",
    "email": "jasraj2626@gmail.com",
    "phone": "9315218284",
    "photoUrl": "/leadership/rajveer-singh-marwah.jpg",
    "kind": "dsc",
    "order": 46
  },
  {
    "name": "Rtr. Mehul Buttan",
    "designation": "District Co-Chair - Technology",
    "email": "mehulbuttan85@gmail.com",
    "phone": "8377842506",
    "photoUrl": "/leadership/mehul-buttan.jpg",
    "kind": "dsc",
    "order": 47
  },
  {
    "name": "Rtr. Vrinda Garg",
    "designation": "District Web Administrator",
    "email": "vrinda.garg1998@gmail.com",
    "phone": "9871577088",
    "photoUrl": "/leadership/vrinda-garg.jpg",
    "kind": "dsc",
    "order": 48
  },
  {
    "name": "Rtr. Parth Agarwal",
    "designation": "District Web Administrator",
    "email": "thisisparthagarwal@gmail.com",
    "phone": "7011638319",
    "photoUrl": "/leadership/parth-agarwal.jpg",
    "kind": "dsc",
    "order": 49
  },
  {
    "name": "Rtr. Dhruvika Chopra",
    "designation": "District Chair - Artificial Intelligence",
    "email": "dhruvika038@gmail.com",
    "phone": "7303530476",
    "photoUrl": "/leadership/dhruvika-chopra.jpeg",
    "kind": "dsc",
    "order": 50
  }
];

const CURRENT_RY_YEAR = 2026;

export async function syncDacLeadership(): Promise<void> {
  console.log(`Starting sync for ${DAC_LEADERSHIP_DATA.length} DAC 2026-27 leaders into database...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const leader of DAC_LEADERSHIP_DATA) {
    const existing = await prisma.districtTeamMember.findFirst({
      where: {
        name: leader.name,
        designation: leader.designation,
        ryYear: CURRENT_RY_YEAR,
      },
    });

    const data = {
      name: leader.name,
      designation: leader.designation,
      email: leader.email || null,
      phone: leader.phone || null,
      photoUrl: leader.photoUrl || null,
      kind: leader.kind,
      order: leader.order,
      ryYear: CURRENT_RY_YEAR,
    };

    if (existing) {
      await prisma.districtTeamMember.update({
        where: { id: existing.id },
        data,
      });
      updatedCount++;
    } else {
      await prisma.districtTeamMember.create({
        data,
      });
      createdCount++;
    }
  }

  console.log(`Sync complete: ${createdCount} created, ${updatedCount} updated.`);
}

if (process.argv[1]?.endsWith('sync-dac-leadership.ts') || process.argv[1]?.endsWith('sync-dac-leadership.js')) {
  syncDacLeadership()
    .catch((err) => {
      console.error('DAC sync failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
