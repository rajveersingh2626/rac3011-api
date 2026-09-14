import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../cache/cache.module';
import { AchievementsController } from './achievements.controller';
import { AchievementsRepository } from './achievements.repository';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [AuditModule, CacheModule],
  controllers: [AchievementsController],
  providers: [AchievementsRepository, AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
