import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { StorageModule } from '../storage/storage.module';
import { PartnersController } from './partners.controller';
import { PartnersRepository } from './partners.repository';
import { PartnersService } from './partners.service';

@Module({
  imports: [AuditModule, StorageModule, CacheModule],
  controllers: [PartnersController],
  providers: [PartnersRepository, PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
