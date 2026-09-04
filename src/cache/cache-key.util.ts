import { CACHE_KEY_PREFIX } from './cache.constants';

export function buildCacheKey(path: string, query: Record<string, unknown>): string {
  const sortedQuery = Object.keys(query)
    .sort()
    .map((key) => `${key}=${String(query[key])}`)
    .join('&');
  return `${CACHE_KEY_PREFIX}GET:${path}${sortedQuery ? `?${sortedQuery}` : ''}`;
}
