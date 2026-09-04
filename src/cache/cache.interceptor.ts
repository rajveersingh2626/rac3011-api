import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { buildCacheKey } from './cache-key.util';
import { CACHE_TAGS_KEY } from './cache-tags.decorator';
import {
  CACHE_L2_TTL_SECONDS,
  PRIVATE_NO_STORE_CACHE_CONTROL,
  PUBLIC_CACHEABLE_CACHE_CONTROL,
  type CacheTag,
} from './cache.constants';
import { CacheService } from './cache.service';

type CachedResponse = { body: unknown };

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: CacheService,
  ) {}

  async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (ctx.getType() !== 'http') return next.handle();

    const res = ctx.switchToHttp().getResponse<Response>();
    const tags = this.reflector.getAllAndOverride<CacheTag[] | undefined>(CACHE_TAGS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!tags || tags.length === 0) {
      return next.handle().pipe(
        tap(() => {
          if (!res.getHeader('Cache-Control'))
            res.setHeader('Cache-Control', PRIVATE_NO_STORE_CACHE_CONTROL);
        }),
      );
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.method !== 'GET') return next.handle();

    const key = buildCacheKey(req.path, req.query);
    const cached = await this.cache.get<CachedResponse>(key);
    if (cached) {
      this.setCacheHeaders(res, tags, 'HIT');
      return of(cached.body);
    }

    return next.handle().pipe(
      tap((body: unknown) => {
        this.setCacheHeaders(res, tags, 'MISS');
        void this.cache.set(key, { body }, tags, CACHE_L2_TTL_SECONDS);
      }),
    );
  }

  private setCacheHeaders(res: Response, tags: CacheTag[], status: 'HIT' | 'MISS'): void {
    res.setHeader('Cache-Control', PUBLIC_CACHEABLE_CACHE_CONTROL);
    res.setHeader('Cache-Tag', tags.join(','));
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('X-Cache', status);
  }
}
