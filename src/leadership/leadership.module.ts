import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DistrictTeamController } from './leadership.controller';
import { LeadershipRepository } from './leadership.repository';
import { LeadershipService } from './leadership.service';

@Module({
  imports: [AuditModule],
  controllers: [DistrictTeamController],
  providers: [LeadershipRepository, LeadershipService],
  exports: [LeadershipService],
})
export class LeadershipModule {}
