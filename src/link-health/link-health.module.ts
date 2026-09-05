import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { CompositeLinkChecker } from './composite-link-checker.service';
import { DriveGatewayPort } from './drive-gateway.port';
import { LinkCheckerPort } from './link-checker.port';
import { LinkHealthProcessor } from './link-health.processor';
import { LinkHealthRepository } from './link-health.repository';
import { LinkHealthScheduler } from './link-health.scheduler';
import { LinkHealthService } from './link-health.service';
import { LiveDriveGateway } from './live-drive-gateway.service';

// No controllers here: this module is also loaded by the WORKER=1 process, which mounts no routes.
@Module({
  imports: [
    BullModule.forRoot({
      connection: new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }),
    }),
    BullModule.registerQueue({ name: 'link-health' }),
  ],
  providers: [
    LinkHealthRepository,
    { provide: DriveGatewayPort, useClass: LiveDriveGateway },
    { provide: LinkCheckerPort, useClass: CompositeLinkChecker },
    LinkHealthService,
    LinkHealthProcessor,
    LinkHealthScheduler,
  ],
  exports: [LinkHealthService],
})
export class LinkHealthModule {}
