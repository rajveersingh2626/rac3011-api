import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import { ryYearOf } from '../common/ry-year';
import { PointsEntriesRepository } from './points-entries.repository';
import { PointsRepository } from './points.repository';
import { clubPointsDto, type ClubPointsSummary } from './points.transformer';
import type { JudgedPointsInput } from './dto/judged-points.dto';
import type { CreatePointEntryInput, UpdatePointEntryInput } from './dto/point-entry.dto';

const READ_PERMISSIONS = [
  'clubs:view',
  'reports:review',
  'reports:submit',
  'reports:score',
  'reports:manage',
] as const;

@Injectable()
export class ClubPointsService {
  constructor(
    private readonly entries: PointsEntriesRepository,
    private readonly rules: PointsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async getPoints(
    access: ResolvedAccess,
    clubId: string,
    ryYear: number,
    month: string | undefined,
  ): Promise<ClubPointsSummary> {
    await this.scope.assertCanAccessClubAny(access, [...READ_PERMISSIONS], clubId);
    const entries = await this.entries.findForYear(clubId, ryYear);
    return clubPointsDto({ clubId, ryYear, month, entries });
  }

  async patchJudged(
    access: ResolvedAccess,
    clubId: string,
    month: string,
    input: JudgedPointsInput,
  ): Promise<ClubPointsSummary> {
    await this.scope.assertCanAccessClub(access, 'reports:score', clubId);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('month must be YYYY-MM');
    const ryYear = ryYearOf(new Date(`${month}-01T00:00:00Z`));

    const before = await this.entries.findJudgedEntry(clubId, month);
    if (input.judgedPoints === null) {
      await this.entries.deleteJudgedEntry(clubId, month);
      await this.audit.record({
        actorId: access.userId,
        action: 'points.judged_removed',
        resourceType: 'club_point_entry',
        resourceId: clubId,
        before,
      });
    } else {
      const judgedCategory = await this.rules.findCategoryByKey('judged');
      if (!judgedCategory) throw new NotFoundException('judged category is not seeded');
      const after = await this.entries.upsertJudgedEntry({
        clubId,
        ryYear,
        periodKey: month,
        categoryId: judgedCategory.id,
        points: input.judgedPoints,
        reason: input.reason ?? '',
        createdById: access.userId,
      });
      await this.audit.record({
        actorId: access.userId,
        action: before ? 'points.judged_updated' : 'points.judged_set',
        resourceType: 'club_point_entry',
        resourceId: after.id,
        before,
        after,
      });
    }

    const entries = await this.entries.findForYear(clubId, ryYear);
    return clubPointsDto({ clubId, ryYear, month, entries });
  }

  async updatePointEntry(
    access: ResolvedAccess,
    clubId: string,
    entryId: string,
    input: UpdatePointEntryInput,
  ): Promise<ClubPointsSummary> {
    await this.scope.assertCanAccessClub(access, 'reports:score', clubId);
    const before = await this.entries.findById(entryId);
    if (!before || before.clubId !== clubId) {
      throw new NotFoundException('point entry not found');
    }

    let updatedTrace = before.trace;
    if (before.kind === 'computed') {
      const traceObj = (before.trace as Record<string, unknown>) ?? {};
      updatedTrace = {
        ...traceObj,
        overridden: true,
        originalPoints: typeof traceObj.originalPoints === 'number' ? traceObj.originalPoints : before.points,
      };
    }

    const after = await this.entries.updateEntry(entryId, {
      points: input.points,
      reason: input.reason !== undefined ? input.reason : before.reason,
      trace: updatedTrace,
    });

    await this.audit.record({
      actorId: access.userId,
      action: 'points.entry_updated',
      resourceType: 'club_point_entry',
      resourceId: entryId,
      before,
      after,
    });

    const entries = await this.entries.findForYear(clubId, before.ryYear);
    return clubPointsDto({ clubId, ryYear: before.ryYear, month: before.periodKey, entries });
  }

  async createCustomEntry(
    access: ResolvedAccess,
    clubId: string,
    input: CreatePointEntryInput,
  ): Promise<ClubPointsSummary> {
    await this.scope.assertCanAccessClub(access, 'reports:score', clubId);
    const category = await this.rules.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundException('category not found');
    }

    const ryYear = ryYearOf(new Date(`${input.month}-01T00:00:00Z`));
    const fullReason = input.reason ? `${input.label} — ${input.reason}` : input.label;

    const after = await this.entries.createCustomEntry({
      clubId,
      ryYear,
      periodKey: input.month,
      categoryId: input.categoryId,
      points: input.points,
      reason: fullReason,
      createdById: access.userId,
    });

    await this.audit.record({
      actorId: access.userId,
      action: 'points.entry_created',
      resourceType: 'club_point_entry',
      resourceId: after.id,
      after,
    });

    const entries = await this.entries.findForYear(clubId, ryYear);
    return clubPointsDto({ clubId, ryYear, month: input.month, entries });
  }

  async deletePointEntry(
    access: ResolvedAccess,
    clubId: string,
    entryId: string,
  ): Promise<ClubPointsSummary> {
    await this.scope.assertCanAccessClub(access, 'reports:score', clubId);
    const before = await this.entries.findById(entryId);
    if (!before || before.clubId !== clubId) {
      throw new NotFoundException('point entry not found');
    }

    if (before.kind === 'computed') {
      const traceObj = (before.trace as Record<string, unknown>) ?? {};
      const originalPoints = typeof traceObj.originalPoints === 'number' ? (traceObj.originalPoints as number) : before.points;
      const resetTrace = { ...traceObj };
      delete resetTrace.overridden;
      delete resetTrace.originalPoints;

      await this.entries.updateEntry(entryId, {
        points: originalPoints,
        reason: null,
        trace: resetTrace,
      });

      await this.audit.record({
        actorId: access.userId,
        action: 'points.entry_reset',
        resourceType: 'club_point_entry',
        resourceId: entryId,
        before,
      });
    } else {
      await this.entries.deleteEntry(entryId);
      await this.audit.record({
        actorId: access.userId,
        action: 'points.entry_deleted',
        resourceType: 'club_point_entry',
        resourceId: entryId,
        before,
      });
    }

    const entries = await this.entries.findForYear(clubId, before.ryYear);
    return clubPointsDto({ clubId, ryYear: before.ryYear, month: before.periodKey, entries });
  }
}
