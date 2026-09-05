import { Injectable } from '@nestjs/common';
import { PointsSourceRepository } from '../points-source.repository';
import { monthKey, monthsInScope } from '../engine/period-scope';
import type { RuleInput } from '../engine/rule-eval.types';
import type { AdapterContext, AdapterInput, PointSourceAdapter } from './point-source.port';

function nextMonth(month: Date): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

// Monthly input is the average per-event ratio expressed as a 0-100 percentage (seeded tiers use 25/50/75/100).
@Injectable()
export class EventAttendanceAdapter implements PointSourceAdapter {
  constructor(private readonly source: PointsSourceRepository) {}

  async inputs(ctx: AdapterContext): Promise<AdapterInput[]> {
    if (ctx.rule.sourceKey !== 'ratio') return [];

    const out: AdapterInput[] = [];
    for (const month of monthsInScope(ctx.ryYear, ctx.month)) {
      const input = await this.monthlyRatio(ctx.clubId, month);
      if (input) out.push({ periodKey: monthKey(month), input });
    }
    return out;
  }

  private async monthlyRatio(clubId: string, month: Date): Promise<RuleInput | null> {
    const eventIds = await this.source.findDistrictEventIdsInMonth(month, nextMonth(month));
    if (eventIds.length === 0) return null;

    const approvedMemberCount = await this.source.countApprovedMembers(clubId);
    if (approvedMemberCount === 0) return null;

    const checkinsByEvent = await this.source.countCheckinsForClubAtEvents(clubId, eventIds);
    const ratios = eventIds.map((id) => (checkinsByEvent.get(id) ?? 0) / approvedMemberCount);
    const average = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    return { value: average * 100 };
  }
}
