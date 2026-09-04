import type { Response } from 'express';
import { NO_STORE_CACHE_CONTROL, PUBLIC_LIVE_CACHE_CONTROL } from '../cache/cache.constants';

export function setPublicCache(res: Response, seconds = 60): void {
  res.setHeader('Cache-Control', `public, max-age=${seconds}`);
}

export function setNoCache(res: Response): void {
  res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL);
}

export function setLiveCache(res: Response): void {
  res.setHeader('Cache-Control', PUBLIC_LIVE_CACHE_CONTROL);
}
