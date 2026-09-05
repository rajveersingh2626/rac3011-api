import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LinkHealthModule } from '../link-health/link-health.module';
import { ContentBlocksController } from './content.controller';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';

@Module({
  imports: [AuditModule, LinkHealthModule],
  controllers: [ContentBlocksController],
  providers: [ContentRepository, ContentService],
  exports: [ContentService],
})
export class ContentModule {}
