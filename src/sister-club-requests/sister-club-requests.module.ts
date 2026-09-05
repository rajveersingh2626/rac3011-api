import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { SisterClubRequestsController } from './sister-club-requests.controller';
import { SisterClubRequestsRepository } from './sister-club-requests.repository';
import { SisterClubRequestsService } from './sister-club-requests.service';

@Module({
  imports: [AuditModule],
  controllers: [SisterClubRequestsController],
  providers: [SisterClubRequestsRepository, SisterClubRequestsService],
  exports: [SisterClubRequestsService],
})
export class SisterClubRequestsModule {}
