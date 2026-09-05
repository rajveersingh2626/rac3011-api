import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AchievementsRepository } from './achievements.repository';
import type { AchievementRow } from './achievements.types';
import type { CreateAchievementInput, UpdateAchievementInput } from './dto/achievement.dto';

@Injectable()
export class AchievementsService {
  constructor(
    private readonly repo: AchievementsRepository,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<AchievementRow[]> {
    return this.repo.findAll();
  }

  async get(id: string): Promise<AchievementRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(actorId: string, input: CreateAchievementInput): Promise<AchievementRow> {
    const row = await this.repo.create(input);
    await this.audit.record({
      actorId,
      action: 'achievement.created',
      resourceType: 'achievement',
      resourceId: row.id,
      after: row,
    });
    return row;
  }

  async update(
    actorId: string,
    id: string,
    input: UpdateAchievementInput,
  ): Promise<AchievementRow> {
    const before = await this.get(id);
    const row = await this.repo.update(id, input);
    await this.audit.record({
      actorId,
      action: 'achievement.updated',
      resourceType: 'achievement',
      resourceId: id,
      before,
      after: row,
    });
    return row;
  }

  async remove(actorId: string, id: string): Promise<void> {
    const before = await this.get(id);
    await this.repo.delete(id);
    await this.audit.record({
      actorId,
      action: 'achievement.deleted',
      resourceType: 'achievement',
      resourceId: id,
      before,
    });
  }

  async reorder(actorId: string, ids: string[]): Promise<AchievementRow[]> {
    await this.repo.reorder(ids);
    const items = await this.list();
    await this.audit.record({
      actorId,
      action: 'achievement.reordered',
      resourceType: 'achievement',
      after: { ids },
    });
    return items;
  }
}
