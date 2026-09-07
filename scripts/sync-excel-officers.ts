import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';

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

export async function parseXlsx(filePath: string): Promise<Record<string, string>[]> {
  if (!existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return [];
  }
  const buffer = readFileSync(filePath);
  const bytes = new Uint8Array(buffer);

  const getZipFile = async (targetName: string): Promise<string | null> => {
    let pos = 0;
    while (pos < bytes.length - 30) {
      if (bytes[pos] === 0x50 && bytes[pos + 1] === 0x4b && bytes[pos + 2] === 0x03 && bytes[pos + 3] === 0x04) {
        const compMethod = bytes[pos + 8] | (bytes[pos + 9] << 8);
        const compSize = bytes[pos + 18] | (bytes[pos + 19] << 8) | (bytes[pos + 20] << 16) | (bytes[pos + 21] << 24);
        const nameLen = bytes[pos + 26] | (bytes[pos + 27] << 8);
        const extraLen = bytes[pos + 28] | (bytes[pos + 29] << 8);
        const nameBytes = bytes.subarray(pos + 30, pos + 30 + nameLen);
        const fileName = new TextDecoder().decode(nameBytes);
        const dataStart = pos + 30 + nameLen + extraLen;

        if (fileName.toLowerCase() === targetName.toLowerCase()) {
          const compressedData = bytes.subarray(dataStart, dataStart + compSize);
          if (compMethod === 0) {
            return new TextDecoder().decode(compressedData);
          } else if (compMethod === 8) {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedData);
            writer.close();
            const response = new Response(ds.readable);
            const buf = await response.arrayBuffer();
            return new TextDecoder().decode(buf);
          }
        }
        pos = dataStart + compSize;
      } else {
        pos++;
      }
    }
    return null;
  };

  const sharedStringsXml = await getZipFile('xl/sharedStrings.xml');
  const sheetXml = await getZipFile('xl/worksheets/sheet1.xml');
  if (!sheetXml) return [];

  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const siMatches = sharedStringsXml.match(/<si>(.*?)<\/si>/gs) || [];
    for (const si of siMatches) {
      const textParts = [...si.matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((m) => m[1]);
      sharedStrings.push(textParts.join(''));
    }
    if (sharedStrings.length === 0) {
      const stringMatches = [...sharedStringsXml.matchAll(/<t[^>]*>(.*?)<\/t>/g)];
      for (const m of stringMatches) sharedStrings.push(m[1]);
    }
  }

  const rowMatches = [...sheetXml.matchAll(/<row[^>]*>(.*?)<\/row>/gs)];
  const rows: Record<string, string>[] = [];

  for (const rowMatch of rowMatches) {
    const rowContent = rowMatch[1];
    const cellMatches = [...rowContent.matchAll(/<c\s+([^>]*?)>(.*?)<\/c>/gs)];
    const rowData: Record<string, string> = {};

    for (const cMatch of cellMatches) {
      const attrs = cMatch[1];
      const inner = cMatch[2];

      const rMatch = attrs.match(/r="([A-Z]+)\d+"/);
      if (!rMatch) continue;
      const col = rMatch[1];

      const tMatch = attrs.match(/t="([^"]+)"/);
      const type = tMatch ? tMatch[1] : null;

      const vMatch = inner.match(/<v>(.*?)<\/v>/);
      const val = vMatch ? vMatch[1] : null;

      const tInnerMatch = inner.match(/<t[^>]*>(.*?)<\/t>/);
      const inlineText = tInnerMatch ? tInnerMatch[1] : null;

      if (type === 's' && val !== null) {
        const stringIndex = parseInt(val, 10);
        rowData[col] = sharedStrings[stringIndex] || '';
      } else if (inlineText !== null) {
        rowData[col] = inlineText;
      } else if (val !== null) {
        rowData[col] = val;
      }
    }

    if (Object.keys(rowData).length > 0) {
      rows.push(rowData);
    }
  }

  return rows;
}

function cleanClubName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/rotaract|club|of|\s+/g, '')
    .trim();
}

async function findClub(name: string) {
  const clean = cleanClubName(name);
  const clubs = await prisma.club.findMany();
  for (const c of clubs) {
    const cClean = cleanClubName(c.name);
    const sClean = c.shortName ? cleanClubName(c.shortName) : '';
    if (cClean === clean || (sClean && sClean === clean) || cClean.includes(clean) || clean.includes(cClean)) {
      return c;
    }
  }
  return null;
}

export async function syncExcelOfficers() {
  console.log('🔄 Starting District 3011 Excel synchronization...');
  const dataDir = join(__dirname, '..', 'data');
  const presPath = join(dataDir, 'President Database 2026-27.xlsx');
  const secPath = join(dataDir, 'Secretary Database 2026-27.xlsx');

  const presRows = await parseXlsx(presPath);
  console.log(`Parsed ${presRows.length} rows from President Database.`);

  const secRows = await parseXlsx(secPath);
  console.log(`Parsed ${secRows.length} rows from Secretary Database.`);

  let updatedPresidents = 0;
  let updatedSecretaries = 0;

  // Sync Presidents
  if (presRows.length > 1) {
    const header = presRows[0];
    let clubCol = 'A';
    let presCol = 'B';
    let phoneCol = 'C';
    let emailCol = 'D';

    for (const [col, val] of Object.entries(header)) {
      const v = (val || '').toLowerCase();
      if (v.includes('club')) clubCol = col;
      if (v.includes('president') || v.includes('name')) presCol = col;
      if (v.includes('phone') || v.includes('contact') || v.includes('mobile')) phoneCol = col;
      if (v.includes('email') || v.includes('mail')) emailCol = col;
    }

    for (let i = 1; i < presRows.length; i++) {
      const row = presRows[i];
      const clubName = row[clubCol];
      const presName = row[presCol];
      const phone = row[phoneCol];
      const email = row[emailCol];

      if (!clubName || !presName) continue;
      const club = await findClub(clubName);
      if (club) {
        await prisma.club.update({
          where: { id: club.id },
          data: {
            president: presName.trim(),
            phone: phone ? phone.trim() : club.phone,
            email: email ? email.trim().toLowerCase() : club.email,
          },
        });
        updatedPresidents++;
      }
    }
  }

  // Sync Secretaries
  if (secRows.length > 1) {
    const header = secRows[0];
    let clubCol = 'A';
    let secCol = 'B';
    let phoneCol = 'C';
    let emailCol = 'D';

    for (const [col, val] of Object.entries(header)) {
      const v = (val || '').toLowerCase();
      if (v.includes('club')) clubCol = col;
      if (v.includes('secretary') || v.includes('name')) secCol = col;
      if (v.includes('phone') || v.includes('contact') || v.includes('mobile')) phoneCol = col;
      if (v.includes('email') || v.includes('mail')) emailCol = col;
    }

    for (let i = 1; i < secRows.length; i++) {
      const row = secRows[i];
      const clubName = row[clubCol];
      const secName = row[secCol];
      const phone = row[phoneCol];
      const email = row[emailCol];

      if (!clubName || !secName) continue;
      const club = await findClub(clubName);
      if (club) {
        await prisma.club.update({
          where: { id: club.id },
          data: {
            secretary: secName.trim(),
            secretaryPhone: phone ? phone.trim() : club.secretaryPhone,
            secretaryEmail: email ? email.trim().toLowerCase() : club.secretaryEmail,
          },
        });
        updatedSecretaries++;
      }
    }
  }

  console.log(`✅ Synchronization completed!`);
  console.log(`- Updated ${updatedPresidents} club presidents.`);
  console.log(`- Updated ${updatedSecretaries} club secretaries.`);
}

if (require.main === module) {
  syncExcelOfficers()
    .catch((err) => {
      console.error('Error syncing excel officers:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
