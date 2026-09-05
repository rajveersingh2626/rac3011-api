import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PublicationsController } from './publications.controller';
import { PublicationsRepository } from './publications.repository';
import { PublicationsService } from './publications.service';

@Module({
  imports: [AuditModule],
  controllers: [PublicationsController],
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
