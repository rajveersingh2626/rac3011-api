import { Injectable } from '@nestjs/common';
import { AchievementsRepository } from './achievements.repository';
import type { AchievementRow } from './achievements.types';

@Injectable()
export class AchievementsService {
  constructor(private readonly repo: AchievementsRepository) {}

  list(): Promise<AchievementRow[]> {
    return this.repo.findAll();
  }
}
