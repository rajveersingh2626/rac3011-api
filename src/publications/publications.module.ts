import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PublicationsController } from './publications.controller';
import { PublicationsRepository } from './publications.repository';
import { PublicationsService } from './publications.service';

import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [PublicationsController],
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
