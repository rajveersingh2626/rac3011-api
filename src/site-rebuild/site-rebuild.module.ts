import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { createCacheRedis } from '../cache/redis.provider';
import { GithubDispatchClient } from './github-dispatch.client';
import { SITE_REBUILD_QUEUE } from './site-rebuild.constants';
import { SiteRebuildProcessor } from './site-rebuild.processor';
import { SiteRebuildTrigger } from './site-rebuild-trigger.service';

@Module({
  imports: [
    BullModule.forRoot({ connection: createCacheRedis() }),
    BullModule.registerQueue({ name: SITE_REBUILD_QUEUE }),
  ],
  providers: [SiteRebuildTrigger, SiteRebuildProcessor, GithubDispatchClient],
  exports: [SiteRebuildTrigger],
})
export class SiteRebuildModule {}
