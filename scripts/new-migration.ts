import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error('usage: npm run prisma:new -- <snake_case_name>');
  process.exit(1);
}
const shadow = process.env.SHADOW_DATABASE_URL;
if (!shadow) {
  console.error('SHADOW_DATABASE_URL is required');
  process.exit(1);
}
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const dir = join('prisma', 'migrations', `${stamp}_${name}`);
const sql = execFileSync(
  'npx',
  [
    'prisma',
    'migrate',
    'diff',
    '--from-migrations',
    'prisma/migrations',
    '--to-schema-datamodel',
    'prisma/schema',
    '--shadow-database-url',
    shadow,
    '--script',
  ],
  { encoding: 'utf8' },
);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'migration.sql'), sql);
console.log(`wrote ${dir}/migration.sql`);
