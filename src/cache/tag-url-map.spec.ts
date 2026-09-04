import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isCacheTag } from './cache.constants';
import { TAG_URL_MAP } from './tag-url-map';

function findControllerFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findControllerFiles(full));
    else if (entry.name.endsWith('.controller.ts')) out.push(full);
  }
  return out;
}

function tagsUsedIn(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const tags: string[] = [];
  for (const match of source.matchAll(/@CacheTags\(([^)]*)\)/g)) {
    for (const literal of match[1].matchAll(/'([^']+)'/g)) tags.push(literal[1]);
  }
  return tags;
}

describe('TAG_URL_MAP exhaustiveness (§14.7.1)', () => {
  it('covers every tag used by a @CacheTags route with at least one URL', () => {
    const srcDir = join(process.cwd(), 'src');
    const usedTags = new Set<string>();
    for (const file of findControllerFiles(srcDir))
      for (const t of tagsUsedIn(file)) usedTags.add(t);

    expect(usedTags.size).toBeGreaterThan(0);
    for (const tag of usedTags) {
      if (!isCacheTag(tag)) throw new Error(`${tag} is not a known CacheTag`);
      const urls = TAG_URL_MAP[tag];
      expect(urls?.length ?? 0, `TAG_URL_MAP is missing an entry for tag "${tag}"`).toBeGreaterThan(
        0,
      );
    }
  });
});
