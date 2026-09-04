import { Module } from '@nestjs/common';
import { HeritageRepository } from './heritage.repository';
import { HeritageService } from './heritage.service';

@Module({
  providers: [HeritageRepository, HeritageService],
  exports: [HeritageService],
})
export class HeritageModule {}
