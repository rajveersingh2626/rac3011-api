import { Inject, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CacheInvalidator } from '../cache/cache-invalidator.service';
import { buildCacheInvalidationExtension } from './cache-invalidation.extension';

type QueryLogOptions = { log: [{ emit: 'event'; level: 'query' }] };

@Injectable()
export class PrismaService extends PrismaClient<QueryLogOptions> {
  // $extends returns a new proxy, not `this`, and doesn't forward $on - so lifecycle hooks and
  // query-event subscription (used by test/*.e2e.ts query-count assertions) are reattached here.
  constructor(@Inject(CacheInvalidator) cacheInvalidator: CacheInvalidator) {
    super({ log: [{ emit: 'event', level: 'query' }] });
    const extended = this.$extends(buildCacheInvalidationExtension(cacheInvalidator));
    return Object.assign(extended, {
      onModuleInit: () => this.$connect(),
      onModuleDestroy: () => this.$disconnect(),
      onQuery: (cb: (event: Prisma.QueryEvent) => void) => this.$on('query', cb),
    }) as unknown as PrismaService;
  }

  // Real implementation is attached per-instance in the constructor above; this is the type surface only.
  declare onQuery: (cb: (event: Prisma.QueryEvent) => void) => void;
}
