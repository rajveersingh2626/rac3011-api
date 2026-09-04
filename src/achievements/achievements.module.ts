import { Module } from '@nestjs/common';
import { AchievementsRepository } from './achievements.repository';
import { AchievementsService } from './achievements.service';

@Module({
  providers: [AchievementsRepository, AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
