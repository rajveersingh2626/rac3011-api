import { Module } from '@nestjs/common';
import { ResourcesRepository } from './resources.repository';
import { ResourcesService } from './resources.service';

@Module({
  providers: [ResourcesRepository, ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
