import { Injectable } from '@nestjs/common';
import { PointsSourceRepository } from '../points-source.repository';
import { monthKey, monthsInScope } from '../engine/period-scope';
import type { RuleInput } from '../engine/rule-eval.types';
import type { ClubFactsForAdapterRow } from '../points.types';
import { duesBracket } from './dues-bracket';
import type { AdapterContext, AdapterInput, PointSourceAdapter } from './point-source.port';

const bool = (value: boolean): RuleInput => ({ value: value ? 1 : 0 });

@Injectable()
export class ClubFactAdapter implements PointSourceAdapter {
  constructor(private readonly source: PointsSourceRepository) {}

  async inputs(ctx: AdapterContext): Promise<AdapterInput[]> {
    const input = await this.resolveInput(ctx);
    if (!input) return [];

    if (ctx.rule.period === 'once') return [{ periodKey: 'once', input }];
    if (ctx.rule.period === 'yearly') return [{ periodKey: String(ctx.ryYear), input }];
    return monthsInScope(ctx.ryYear, ctx.month).map((month) => ({
      periodKey: monthKey(month),
      input,
    }));
  }

  private async resolveInput(ctx: AdapterContext): Promise<RuleInput | null> {
    const facts = await this.source.findClubFacts(ctx.clubId, ctx.ryYear);

    switch (ctx.rule.sourceKey) {
      case 'dues_paid_bracket': {
        const bracket = duesBracket(facts?.duesPaidOn ?? null, ctx.ryYear, new Date());
        return bracket === null ? null : { value: bracket };
      }
      case 'ri_citation_completed':
        return bool(facts?.riCitationCompleted ?? false);
      case 'paul_harris_fellows':
        return { value: facts?.paulHarrisFellows ?? 0, count: facts?.paulHarrisFellows ?? 0 };
      case 'dual_members':
        return { value: facts?.dualMembers ?? 0, count: facts?.dualMembers ?? 0 };
      case 'mdio_committee_members':
        return { value: facts?.mdioCommitteeMembers ?? 0, count: facts?.mdioCommitteeMembers ?? 0 };
      case 'mdio_events_attended':
        return { value: facts?.mdioEventsAttended ?? 0, count: facts?.mdioEventsAttended ?? 0 };
      case 'sister_club_signed':
        return bool(!!facts?.sisterClubSignedOn);
      case 'drr_visit_completed':
        return bool(!!facts?.drrVisitOn);
      case 'vocational_centre':
        return bool(!!facts?.vocationalCentreOn);
      case 'active_social_handles':
        return { value: facts?.activeSocialHandles ?? 0, count: facts?.activeSocialHandles ?? 0 };
      case 'club_merchandise':
        return bool(facts?.clubMerchandise ?? false);
      case 'retention_ratio':
        return this.retentionRatio(ctx.clubId, facts);
      case 'skills_adoption_ratio':
        return this.skillsAdoptionRatio(ctx.clubId);
      default:
        return null;
    }
  }

  private async retentionRatio(clubId: string, facts: ClubFactsForAdapterRow): Promise<RuleInput> {
    const numerator = await this.source.countApprovedMembers(clubId);
    return { numerator, denominator: facts?.priorYearMemberCount ?? 0 };
  }

  private async skillsAdoptionRatio(clubId: string): Promise<RuleInput> {
    const [numerator, denominator] = await Promise.all([
      this.source.countApprovedMembersWithSkill(clubId),
      this.source.countApprovedMembers(clubId),
    ]);
    return { numerator, denominator };
  }
}
