import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PastDrrsController } from './heritage.controller';
import { HeritageRepository } from './heritage.repository';
import { HeritageService } from './heritage.service';

@Module({
  imports: [AuditModule],
  controllers: [PastDrrsController],
  providers: [HeritageRepository, HeritageService],
  exports: [HeritageService],
})
export class HeritageModule {}
