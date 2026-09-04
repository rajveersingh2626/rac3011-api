import { describe, expect, it } from 'vitest';
import { CACHE_TAGS, type CacheTag } from '../cache/cache.constants';
import { SITE_REBUILD_TAGS, tagsTriggerRebuild } from './site-rebuild-tags';

const EXCLUDED_TAGS: readonly CacheTag[] = ['reports', 'points', 'members', 'zones'];

describe('SITE_REBUILD_TAGS', () => {
  it('never lists a portal-only tag', () => {
    for (const tag of EXCLUDED_TAGS) expect(SITE_REBUILD_TAGS).not.toContain(tag);
  });

  it('accounts for every CACHE_TAGS entry as allow-listed or excluded', () => {
    const accounted = new Set<CacheTag>([...SITE_REBUILD_TAGS, ...EXCLUDED_TAGS]);
    for (const tag of CACHE_TAGS) expect(accounted.has(tag)).toBe(true);
  });
});

describe('tagsTriggerRebuild', () => {
  it('never triggers for an excluded tag alone', () => {
    for (const tag of EXCLUDED_TAGS) expect(tagsTriggerRebuild([tag])).toBe(false);
  });

  it('never triggers when only excluded tags are present, even combined', () => {
    expect(tagsTriggerRebuild([...EXCLUDED_TAGS])).toBe(false);
  });

  it('triggers for each allow-listed tag individually', () => {
    for (const tag of SITE_REBUILD_TAGS) expect(tagsTriggerRebuild([tag])).toBe(true);
  });

  it('triggers when an allow-listed tag is mixed in with excluded ones', () => {
    expect(tagsTriggerRebuild(['reports', 'points', 'clubs'])).toBe(true);
  });

  it('does not trigger for an empty tag list', () => {
    expect(tagsTriggerRebuild([])).toBe(false);
  });
});
