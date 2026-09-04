import { describe, expect, it } from 'vitest';
import { buildCacheKey } from './cache-key.util';

describe('buildCacheKey', () => {
  it('sorts query params so key order never affects the cache key', () => {
    const a = buildCacheKey('/public/projects', { category: 'health', page: '2' });
    const b = buildCacheKey('/public/projects', { page: '2', category: 'health' });
    expect(a).toBe(b);
  });

  it('distinguishes different query values', () => {
    const a = buildCacheKey('/public/clubs', { zoneId: 'z1' });
    const b = buildCacheKey('/public/clubs', { zoneId: 'z2' });
    expect(a).not.toBe(b);
  });

  it('has no trailing "?" when there is no query', () => {
    expect(buildCacheKey('/public/home', {})).not.toContain('?');
  });
});
