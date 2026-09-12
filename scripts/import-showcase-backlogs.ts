import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseXlsx } from './sync-excel-officers';

async function main() {
  const baseDir = join(process.cwd(), 'backlogs_data');
  console.log('Files in backlogs_data:', readdirSync(baseDir));

  const excelPath = join(baseDir, 'Club Project Submissions - July & August 2026 (Responses).xlsx');
  console.log('Parsing Excel:', excelPath);

  const rows = await parseXlsx(excelPath);
  console.log(`Total rows parsed: ${rows.length}`);
  if (rows.length > 0) {
    console.log('Sample Row 1 Keys:', Object.keys(rows[0]));
    console.log('Sample Row 1:', JSON.stringify(rows[0], null, 2));
    if (rows.length > 1) {
      console.log('Sample Row 2:', JSON.stringify(rows[1], null, 2));
    }
  }
}

main().catch(console.error);
