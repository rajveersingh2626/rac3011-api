import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AchievementsController } from './achievements.controller';
import { AchievementsRepository } from './achievements.repository';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [AuditModule],
  controllers: [AchievementsController],
  providers: [AchievementsRepository, AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
