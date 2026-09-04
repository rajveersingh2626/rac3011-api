import { Module } from '@nestjs/common';
import { LeadershipRepository } from './leadership.repository';
import { LeadershipService } from './leadership.service';

@Module({
  providers: [LeadershipRepository, LeadershipService],
  exports: [LeadershipService],
})
export class LeadershipModule {}
