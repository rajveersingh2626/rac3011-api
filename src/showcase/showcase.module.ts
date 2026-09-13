import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { MeModule } from '../me/me.module';
import { PointsModule } from '../points/points.module';
import { StorageModule } from '../storage/storage.module';
import { ShowcaseAdminController } from './showcase-admin.controller';
import { ShowcaseAdminRepository } from './showcase-admin.repository';
import { ShowcaseAdminService } from './showcase-admin.service';
import { ShowcaseRepository } from './showcase.repository';
import { ShowcaseService } from './showcase.service';

@Module({
  imports: [CacheModule, MeModule, PointsModule, StorageModule],
  controllers: [ShowcaseAdminController],
  providers: [ShowcaseRepository, ShowcaseService, ShowcaseAdminRepository, ShowcaseAdminService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}
