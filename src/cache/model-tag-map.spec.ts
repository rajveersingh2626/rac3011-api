import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getModelTags, MODEL_TAG_MAP } from './model-tag-map';

// Every *.repository.ts backing a /public/* response - update this list when a new one is added.
const PUBLIC_REPOSITORY_FILES = [
  'src/public/public-clubs.repository.ts',
  'src/achievements/achievements.repository.ts',
  'src/partners/partners.repository.ts',
  'src/publications/publications.repository.ts',
  'src/resources/resources.repository.ts',
  'src/heritage/heritage.repository.ts',
  'src/leadership/leadership.repository.ts',
  'src/content/content.repository.ts',
  'src/events/events.repository.ts',
  'src/showcase/showcase.repository.ts',
  'src/subdomains/mission3011/mission3011-dashboard.repository.ts',
  'src/subdomains/drishti/drishti-dashboard.repository.ts',
  'src/subdomains/rcl/rcl-standings.repository.ts',
  'src/subdomains/rcl/rcl-fixtures.repository.ts',
];

// showcase.repository.ts selects the Project -> ProjectClub relation via `clubs: {...}`, not a
// direct `this.prisma.projectClub.*` call, so the regex scan below can't see it.
const EXTRA_MODELS_READ_BY_PUBLIC_RESPONSES = ['ProjectClub'];

function modelNamesReadBy(file: string): string[] {
  const source = readFileSync(join(process.cwd(), file), 'utf8');
  const names = new Set<string>();
  for (const match of source.matchAll(/this\.prisma\.(\w+)\./g)) {
    const [, delegate] = match;
    names.add(delegate.charAt(0).toUpperCase() + delegate.slice(1));
  }
  return [...names];
}

describe('MODEL_TAG_MAP exhaustiveness (§14.7.1)', () => {
  it('maps every Prisma model read by a public repository to at least one tag', () => {
    const models = new Set(EXTRA_MODELS_READ_BY_PUBLIC_RESPONSES);
    for (const file of PUBLIC_REPOSITORY_FILES)
      for (const m of modelNamesReadBy(file)) models.add(m);

    expect(models.size).toBeGreaterThan(0);
    for (const model of models) {
      expect(getModelTags(model), `MODEL_TAG_MAP is missing an entry for ${model}`).not.toEqual([]);
    }
  });

  it('has no empty tag arrays for models it does list', () => {
    for (const [model, tags] of Object.entries(MODEL_TAG_MAP)) {
      expect(tags.length, `${model} maps to an empty tag list`).toBeGreaterThan(0);
    }
  });
});
