import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { env } from '../config/env';
import { SiteRebuildModule } from '../site-rebuild/site-rebuild.module';
import { CacheInvalidator } from './cache-invalidator.service';
import { CachePurgeProcessor } from './cache-purge.processor';
import { CacheInterceptor } from './cache.interceptor';
import { CACHE_PURGE_QUEUE } from './cache.constants';
import { CacheService } from './cache.service';
import { LiveCloudflarePurgeClient } from './cloudflare-purge.client';
import { CloudflarePurgeClient } from './cloudflare-purge.port';
import { NoopCloudflarePurgeClient } from './noop-cloudflare-purge.client';
import { bullRootOptions, CACHE_REDIS, createCacheRedis } from './redis.provider';

const cloudflareConfigured =
  !!env.CLOUDFLARE_API_EMAIL && !!env.CLOUDFLARE_API_KEY && !!env.CLOUDFLARE_ZONE_ID;

@Global()
@Module({
  imports: [
    BullModule.forRoot(bullRootOptions()),
    BullModule.registerQueue({ name: CACHE_PURGE_QUEUE }),
    SiteRebuildModule,
  ],
  providers: [
    { provide: CACHE_REDIS, useFactory: createCacheRedis },
    CacheService,
    CacheInvalidator,
    CachePurgeProcessor,
    {
      provide: CloudflarePurgeClient,
      useClass: cloudflareConfigured ? LiveCloudflarePurgeClient : NoopCloudflarePurgeClient,
    },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
  exports: [CacheService, CacheInvalidator, CloudflarePurgeClient],
})
export class CacheModule {}
