import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ContentModule } from '../content/content.module';
import { EnquiriesAdminController } from './enquiries.controller';
import { EnquiriesRepository } from './enquiries.repository';
import { EnquiriesService } from './enquiries.service';

@Module({
  imports: [ContentModule, AuditModule],
  controllers: [EnquiriesAdminController],
  providers: [EnquiriesRepository, EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
