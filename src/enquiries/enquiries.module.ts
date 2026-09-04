import { Module } from '@nestjs/common';
import { ContentModule } from '../content/content.module';
import { EnquiriesRepository } from './enquiries.repository';
import { EnquiriesService } from './enquiries.service';

@Module({
  imports: [ContentModule],
  providers: [EnquiriesRepository, EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
