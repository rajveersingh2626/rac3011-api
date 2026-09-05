import { env } from '../config/env';
import { PROJECT_KEYS } from '../public/project-summary.registry';
import type { CacheTag } from './cache.constants';

const PROJECT_SUMMARY_URLS = PROJECT_KEYS.map((key) => `/public/projects-summary/${key}`);

// Parameter-free URLs only; detail routes are purged from L2 via tags but self-heal at the edge (docs/decisions.md).
export const TAG_URL_MAP: Partial<Record<CacheTag, string[]>> = {
  clubs: ['/public/clubs'],
  projects: ['/public/projects', '/public/home'],
  events: ['/public/events'],
  heritage: ['/public/past-drrs'],
  'district-team': ['/public/district-team'],
  achievements: ['/public/achievements'],
  partners: ['/public/partners'],
  publications: ['/public/publications'],
  resources: ['/public/resources'],
  content: ['/public/home'],
  settings: ['/public/home', '/public/initiatives', ...PROJECT_SUMMARY_URLS],
  initiatives: ['/public/initiatives', ...PROJECT_SUMMARY_URLS],
  mission3011: ['/public/mission3011/dashboard'],
  drishti: ['/public/drishti/dashboard'],
  careerbridge: ['/public/careerbridge/listings'],
  ride: ['/public/ride/incoming', '/public/ride/gallery', '/public/ride/dashboard'],
  rcl: ['/public/rcl/standings', '/public/rcl/fixtures'],
};

export function urlsForTags(tags: CacheTag[]): string[] {
  const out = new Set<string>();
  for (const tag of tags)
    for (const path of TAG_URL_MAP[tag] ?? []) out.add(`${env.AUTH_URL}${path}`);
  return [...out];
}

export const PUBLIC_PREFIX = `${env.AUTH_URL}/public/`;
