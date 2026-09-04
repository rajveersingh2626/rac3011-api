import type { Response } from 'express';

export function setPublicCache(res: Response, seconds = 60): void {
  res.setHeader('Cache-Control', `public, max-age=${seconds}`);
}

export function setNoCache(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}
