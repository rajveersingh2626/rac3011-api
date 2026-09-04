import { Module } from '@nestjs/common';
import { ContentRepository } from './content.repository';
import { ContentService } from './content.service';

@Module({
  providers: [ContentRepository, ContentService],
  exports: [ContentService],
})
export class ContentModule {}
