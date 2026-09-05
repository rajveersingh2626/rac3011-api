import { describe, expect, it } from 'vitest';
import { ReportFieldAdapter } from './report-field.adapter';
import type { PointsSourceRepository } from '../points-source.repository';
import type { AdapterContext } from './point-source.port';
import type { ReportForAdapterRow } from '../points.types';

function report(month: string, overrides: Record<string, unknown> = {}): ReportForAdapterRow {
  return {
    month: new Date(`${month}-01T00:00:00Z`),
    filedOnTime: true,
    values: { activities: [], physical_meetings: 2, ...overrides },
  };
}

function repo(byMonth: Record<string, ReportForAdapterRow>): PointsSourceRepository {
  const months = Object.keys(byMonth).sort();
  return {
    findReportForMonth: (_clubId: string, month: Date) =>
      Promise.resolve(byMonth[month.toISOString().slice(0, 7)] ?? null),
    findReportsInRange: () => Promise.resolve(months.map((m) => byMonth[m])),
    findLatestReport: () =>
      Promise.resolve(months.length ? byMonth[months[months.length - 1]] : null),
  } as unknown as PointsSourceRepository;
}

function ctx(
  sourceKey: string,
  period: 'monthly' | 'yearly' | 'once',
  overrides: Partial<AdapterContext> = {},
): AdapterContext {
  return {
    clubId: 'CLUB-A',
    ryYear: 2026,
    rule: {
      id: 'r1',
      key: 'test',
      label: 'Test',
      categoryKey: 'x',
      ruleType: 'per_unit',
      period,
      points: 10,
      perUnitCap: null,
      tiers: [],
      numeratorKey: null,
      denominatorKey: null,
      sourceKey,
    },
    ...overrides,
  };
}

describe('ReportFieldAdapter', () => {
  it('monthly rule reads the derived value from the club report for that exact month', async () => {
    const adapter = new ReportFieldAdapter(
      repo({ '2026-08': report('2026-08', { physical_meetings: 3 }) }),
    );
    const result = await adapter.inputs(
      ctx('physical_meetings', 'monthly', { month: new Date('2026-08-01') }),
    );
    expect(result).toEqual([{ periodKey: '2026-08', input: { value: 3, count: 3 } }]);
  });

  it('skips months with no submitted report entirely (no zero-point entry created)', async () => {
    const adapter = new ReportFieldAdapter(
      repo({ '2026-07': report('2026-07'), '2026-09': report('2026-09') }),
    );
    const result = await adapter.inputs(
      ctx('physical_meetings', 'monthly', { month: new Date('2026-08-01') }),
    );
    expect(result).toEqual([]);
  });

  it('with no month given, produces one entry per month that has a report in scope', async () => {
    const adapter = new ReportFieldAdapter(
      repo({
        '2026-07': report('2026-07', { physical_meetings: 1 }),
        '2026-08': report('2026-08', { physical_meetings: 4 }),
      }),
    );
    const result = await adapter.inputs(ctx('physical_meetings', 'monthly', { month: undefined }));
    expect(result.map((r) => r.periodKey)).toEqual(['2026-07', '2026-08']);
  });

  it('activity-derived sourceKeys (camps_organised) read from report.values.activities', async () => {
    const activities = [
      {
        activity_title: 'Blood donation camp',
        activity_date: '2026-08-05',
        avenue: 'community',
        area_of_focus: 'x',
        initiated_by: 'rotaract',
        members_participated: 5,
      },
    ];
    const adapter = new ReportFieldAdapter(
      repo({
        '2026-08': { month: new Date('2026-08-01'), filedOnTime: true, values: { activities } },
      }),
    );
    const result = await adapter.inputs(
      ctx('camps_organised', 'monthly', { month: new Date('2026-08-01') }),
    );
    expect(result).toEqual([{ periodKey: '2026-08', input: { value: 1, count: 1 } }]);
  });

  it('yearly rule sums the derived value across every submitted report in the RY', async () => {
    const adapter = new ReportFieldAdapter(
      repo({
        '2026-07': report('2026-07', { physical_meetings: 2 }),
        '2026-08': report('2026-08', { physical_meetings: 3 }),
      }),
    );
    const result = await adapter.inputs(ctx('physical_meetings', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { value: 5, count: 5 } }]);
  });

  it('yearly rule with no reports at all produces no entry', async () => {
    const adapter = new ReportFieldAdapter(repo({}));
    expect(await adapter.inputs(ctx('physical_meetings', 'yearly'))).toEqual([]);
  });

  it('once rule reads the latest submitted report', async () => {
    const adapter = new ReportFieldAdapter(
      repo({
        '2026-07': report('2026-07', { physical_meetings: 1 }),
        '2026-08': report('2026-08', { physical_meetings: 9 }),
      }),
    );
    const result = await adapter.inputs(ctx('physical_meetings', 'once'));
    expect(result).toEqual([{ periodKey: 'once', input: { value: 9, count: 9 } }]);
  });

  it('a rule with numeratorKey/denominatorKey reads those keys directly off report.values', async () => {
    const withRatioFields: ReportForAdapterRow = {
      month: new Date('2026-08-01T00:00:00Z'),
      filedOnTime: true,
      values: { activities: [], checked_in: 25, club_strength: 40 },
    };
    const adapter = new ReportFieldAdapter(repo({ '2026-08': withRatioFields }));
    const result = await adapter.inputs(
      ctx('unused', 'monthly', {
        month: new Date('2026-08-01'),
        rule: {
          ...ctx('unused', 'monthly').rule,
          numeratorKey: 'checked_in',
          denominatorKey: 'club_strength',
        },
      }),
    );
    expect(result).toEqual([{ periodKey: '2026-08', input: { numerator: 25, denominator: 40 } }]);
  });
});
