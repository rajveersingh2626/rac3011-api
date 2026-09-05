import { Injectable } from '@nestjs/common';
import { PointsSourceRepository } from '../points-source.repository';
import { monthKey, monthsInScope } from '../engine/period-scope';
import type { RuleInput } from '../engine/rule-eval.types';
import type { AdapterContext, AdapterInput, PointSourceAdapter } from './point-source.port';

const bool = (value: boolean): RuleInput => ({ value: value ? 1 : 0 });

// RideDelegationHost rows (days hosted / members sent) for the club's Rotary year (spec §6.1,
// §12 acceptance test 14). Replaces the DeferredSourceAdapter placeholder now RIDE is built.
@Injectable()
export class RideHostingAdapter implements PointSourceAdapter {
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
    const totals = await this.source.findRideHostingTotals(ctx.clubId, ctx.ryYear);

    switch (ctx.rule.sourceKey) {
      case 'days_hosted':
        return { count: totals.daysHosted };
      case 'members_sent':
        return { count: totals.membersSent };
      case 'hosted_and_sent':
        return bool(totals.daysHosted > 0 && totals.membersSent > 0);
      default:
        return null;
    }
  }
}
