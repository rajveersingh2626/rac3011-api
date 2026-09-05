export const CACHE_TAGS = [
  'clubs',
  'zones',
  'members',
  'projects',
  'events',
  'heritage',
  'district-team',
  'achievements',
  'partners',
  'publications',
  'resources',
  'content',
  'settings',
  'initiatives',
  'points',
  'reports',
  'mission3011',
  'drishti',
  'ride',
  'careerbridge',
  'rcl',
] as const;

export type CacheTag = (typeof CACHE_TAGS)[number];

export function isCacheTag(value: string): value is CacheTag {
  return (CACHE_TAGS as readonly string[]).includes(value);
}

export const CACHE_L2_TTL_SECONDS = 3600;
export const CACHE_KEY_PREFIX = 'rac3011:cache:';
export const CACHE_TAG_SET_PREFIX = 'rac3011:tag:';
export const CACHE_PURGE_QUEUE = 'cache.purge';

export const PUBLIC_CACHEABLE_CACHE_CONTROL =
  'public, max-age=60, s-maxage=600, stale-while-revalidate=86400';
export const PUBLIC_LIVE_CACHE_CONTROL = 'public, max-age=5, s-maxage=5';
export const NO_STORE_CACHE_CONTROL = 'no-store';
export const PRIVATE_NO_STORE_CACHE_CONTROL = 'private, no-store';

export const CLOUDFLARE_PURGE_BATCH_SIZE = 30;
