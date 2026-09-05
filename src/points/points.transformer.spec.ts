import { describe, expect, it } from 'vitest';
import { clubPointsDto } from './points.transformer';
import type { ClubPointEntryRow } from './points.types';

function entry(overrides: Partial<ClubPointEntryRow>): ClubPointEntryRow {
  return {
    id: 'e1',
    clubId: 'CLUB-A',
    ryYear: 2026,
    periodKey: '2026-08',
    ruleId: 'r1',
    ruleKey: 'club_physical_meetings',
    ruleLabel: 'Physical club meetings',
    ruleType: 'per_unit',
    rulePeriod: 'monthly',
    categoryId: 'cat-club-services',
    categoryKey: 'club_services',
    categoryName: 'Club Services',
    kind: 'computed',
    points: 24,
    reason: null,
    trace: { ruleId: 'r1', points: 24 },
    sourceType: null,
    sourceId: null,
    createdById: null,
    updatedAt: new Date('2026-08-15T00:00:00Z'),
    ...overrides,
  };
}

describe('clubPointsDto', () => {
  it('sums total across all entries for the year, computed and judged alike', () => {
    const dto = clubPointsDto({
      clubId: 'CLUB-A',
      ryYear: 2026,
      month: undefined,
      entries: [
        entry({ points: 24 }),
        entry({ id: 'e2', kind: 'judged', ruleId: null, periodKey: '2026-08', points: 6 }),
      ],
    });
    expect(dto.total).toBe(30);
  });

  it('groups byCategory across all periods, and byMonth only for YYYY-MM periodKeys', () => {
    const dto = clubPointsDto({
      clubId: 'CLUB-A',
      ryYear: 2026,
      month: undefined,
      entries: [
        entry({ periodKey: '2026-07', points: 10 }),
        entry({ periodKey: '2026-08', points: 24 }),
        entry({ periodKey: 'once', ruleId: 'r2', categoryId: 'cat-club-services', points: 100 }),
      ],
    });
    expect(dto.byCategory).toEqual([
      {
        categoryId: 'cat-club-services',
        categoryKey: 'club_services',
        categoryName: 'Club Services',
        points: 134,
      },
    ]);
    expect(dto.byMonth).toEqual([
      { periodKey: '2026-07', points: 10 },
      { periodKey: '2026-08', points: 24 },
    ]);
  });

  it('returns computed entries and the judged entry only for the requested month, never mixed', () => {
    const dto = clubPointsDto({
      clubId: 'CLUB-A',
      ryYear: 2026,
      month: '2026-08',
      entries: [
        entry({ periodKey: '2026-07', points: 10 }),
        entry({ id: 'e2', periodKey: '2026-08', points: 24 }),
        entry({
          id: 'e3',
          kind: 'judged',
          ruleId: null,
          periodKey: '2026-08',
          points: 6,
          reason: 'joint camp',
        }),
      ],
    });
    expect(dto.entries).toHaveLength(1);
    expect(dto.entries[0].id).toBe('e2');
    expect(dto.judged).toEqual({
      points: 6,
      reason: 'joint camp',
      createdById: null,
      updatedAt: '2026-08-15T00:00:00.000Z',
    });
  });

  it('judged is null when no judged entry exists for the month', () => {
    const dto = clubPointsDto({
      clubId: 'CLUB-A',
      ryYear: 2026,
      month: '2026-08',
      entries: [entry({})],
    });
    expect(dto.judged).toBeNull();
  });

  it('entries and judged are empty/null when no month is requested', () => {
    const dto = clubPointsDto({
      clubId: 'CLUB-A',
      ryYear: 2026,
      month: undefined,
      entries: [entry({})],
    });
    expect(dto.entries).toEqual([]);
    expect(dto.judged).toBeNull();
  });
});
