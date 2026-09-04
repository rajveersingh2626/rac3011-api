import { Module } from '@nestjs/common';
import { ShowcaseRepository } from './showcase.repository';
import { ShowcaseService } from './showcase.service';

@Module({
  providers: [ShowcaseRepository, ShowcaseService],
  exports: [ShowcaseService],
})
export class ShowcaseModule {}
