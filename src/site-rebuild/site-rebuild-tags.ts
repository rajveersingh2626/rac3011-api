import type { CacheTag } from '../cache/cache.constants';

// Only tags that affect prerendered public HTML (spec §14.9). Portal-only tags (reports, points,
// members) are deliberately excluded - see site-rebuild-tags.spec.ts.
export const SITE_REBUILD_TAGS: readonly CacheTag[] = [
  'content',
  'settings',
  'clubs',
  'projects',
  'heritage',
  'district-team',
  'achievements',
  'partners',
  'publications',
  'resources',
  'events',
  'initiatives',
  'mission3011',
  'drishti',
  'careerbridge',
  'ride',
  'rcl',
] as const;

export function tagsTriggerRebuild(tags: readonly CacheTag[]): boolean {
  return tags.some((tag) => SITE_REBUILD_TAGS.includes(tag));
}
