import { SetMetadata } from '@nestjs/common';
import type { CacheTag } from './cache.constants';

export const CACHE_TAGS_KEY = 'rac3011:cacheTags';

// Opt-in only: routes without this decorator get the safe `private, no-store` default (see CacheInterceptor).
export const CacheTags = (...tags: CacheTag[]) => SetMetadata(CACHE_TAGS_KEY, tags);
