import { Injectable } from '@nestjs/common';
import { PointsSourceRepository } from '../points-source.repository';
import { monthKey, monthsInScope, ryEndMonth, ryStartMonth } from '../engine/period-scope';
import type { RuleInput } from '../engine/rule-eval.types';
import type { ReportForAdapterRow } from '../points.types';
import { deriveReportPointSources, type ReportValuesForDerivation } from './report-field.derive';
import type { AdapterContext, AdapterInput, PointSourceAdapter } from './point-source.port';

function numericCoerce(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function inputFor(report: ReportForAdapterRow, ctx: AdapterContext): RuleInput {
  const { rule } = ctx;
  if (rule.numeratorKey && rule.denominatorKey) {
    const values = report.values as Record<string, unknown>;
    return {
      numerator: numericCoerce(values[rule.numeratorKey]),
      denominator: numericCoerce(values[rule.denominatorKey]),
    };
  }
  const derived = deriveReportPointSources(
    report.values as ReportValuesForDerivation,
    report.filedOnTime,
  );
  const value =
    (derived as unknown as Record<string, number>)[`report_field:${rule.sourceKey}`] ?? 0;
  return { value, count: value };
}

@Injectable()
export class ReportFieldAdapter implements PointSourceAdapter {
  constructor(private readonly source: PointsSourceRepository) {}

  async inputs(ctx: AdapterContext): Promise<AdapterInput[]> {
    if (ctx.rule.period === 'monthly') return this.monthlyInputs(ctx);
    if (ctx.rule.period === 'yearly') return this.yearlyInput(ctx);
    return this.onceInput(ctx);
  }

  private async monthlyInputs(ctx: AdapterContext): Promise<AdapterInput[]> {
    const results: AdapterInput[] = [];
    for (const month of monthsInScope(ctx.ryYear, ctx.month)) {
      const report = await this.source.findReportForMonth(ctx.clubId, month);
      if (!report) continue;
      results.push({ periodKey: monthKey(month), input: inputFor(report, ctx) });
    }
    return results;
  }

  private async yearlyInput(ctx: AdapterContext): Promise<AdapterInput[]> {
    const reports = await this.source.findReportsInRange(
      ctx.clubId,
      ryStartMonth(ctx.ryYear),
      ryEndMonth(ctx.ryYear),
    );
    if (reports.length === 0) return [];
    const sum = reports.reduce((total, report) => total + (inputFor(report, ctx).value ?? 0), 0);
    return [{ periodKey: String(ctx.ryYear), input: { value: sum, count: sum } }];
  }

  private async onceInput(ctx: AdapterContext): Promise<AdapterInput[]> {
    const report = await this.source.findLatestReport(ctx.clubId);
    if (!report) return [];
    return [{ periodKey: 'once', input: inputFor(report, ctx) }];
  }
}
