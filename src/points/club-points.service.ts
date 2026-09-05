import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { ScopeService } from '../common/scope/scope.service';
import type { ResolvedAccess } from '../common/types/access';
import { ryYearOf } from '../common/ry-year';
import { PointsEntriesRepository } from './points-entries.repository';
import { PointsRepository } from './points.repository';
import { clubPointsDto, type ClubPointsSummary } from './points.transformer';
import type { JudgedPointsInput } from './dto/judged-points.dto';

const READ_PERMISSIONS = ['clubs:view', 'reports:review'] as const;

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
}
