import { Module } from '@nestjs/common';
import { PublicationsRepository } from './publications.repository';
import { PublicationsService } from './publications.service';

@Module({
  providers: [PublicationsRepository, PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
