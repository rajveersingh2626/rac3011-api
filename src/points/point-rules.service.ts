import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { ResolvedAccess } from '../common/types/access';
import { PointsRecomputeTrigger } from './engine/points-recompute-trigger.service';
import { PointsRepository } from './points.repository';
import type { PointCategoryRow, PointRuleRow } from './points.types';
import type { CreatePointRuleInput, UpdatePointRuleInput } from './dto/point-rule.dto';

@Injectable()
export class PointRulesService {
  constructor(
    private readonly repo: PointsRepository,
    private readonly audit: AuditService,
    private readonly recomputeTrigger: PointsRecomputeTrigger,
  ) {}

  listCategories(): Promise<PointCategoryRow[]> {
    return this.repo.listCategories();
  }

  listRules(ryYear: number): Promise<PointRuleRow[]> {
    return this.repo.listRules(ryYear);
  }

  async createRule(access: ResolvedAccess, input: CreatePointRuleInput): Promise<PointRuleRow> {
    const existing = await this.repo.findRuleByKey(input.key);
    if (existing)
      throw new ConflictException({
        code: 'ALREADY_EXISTS',
        message: `A rule with key "${input.key}" already exists`,
      });

    const created = await this.repo.createRule(input);
    await this.audit.record({
      actorId: access.userId,
      action: 'point_rule.created',
      resourceType: 'point_rule',
      resourceId: created.id,
      after: created,
    });
    await this.recomputeTrigger.enqueueRecomputeAll(created.ryYear);
    return created;
  }

  async updateRule(
    access: ResolvedAccess,
    id: string,
    input: UpdatePointRuleInput,
  ): Promise<PointRuleRow> {
    const before = await this.repo.findRuleById(id);
    if (!before) throw new NotFoundException();

    const updated = await this.repo.updateRule(id, input);
    await this.audit.record({
      actorId: access.userId,
      action: 'point_rule.updated',
      resourceType: 'point_rule',
      resourceId: id,
      before,
      after: updated,
    });
    await this.recomputeTrigger.enqueueRecomputeAll(before.ryYear);
    return updated;
  }
}
