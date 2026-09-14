import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { ResourcesController } from './resources.controller';
import { ResourcesRepository } from './resources.repository';
import { ResourcesService } from './resources.service';

@Module({
  imports: [AuditModule, CacheModule],
  controllers: [ResourcesController],
  providers: [ResourcesRepository, ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
