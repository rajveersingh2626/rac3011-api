import { describe, expect, it } from 'vitest';
import { EventAttendanceAdapter } from './event-attendance.adapter';
import type { PointsSourceRepository } from '../points-source.repository';
import type { AdapterContext } from './point-source.port';

function repo(opts: {
  eventIds?: string[];
  approvedMemberCount?: number;
  checkinsByEvent?: Record<string, number>;
}): PointsSourceRepository {
  const eventIds = opts.eventIds ?? [];
  const checkins = new Map(Object.entries(opts.checkinsByEvent ?? {}));
  return {
    findDistrictEventIdsInMonth: () => Promise.resolve(eventIds),
    countApprovedMembers: () => Promise.resolve(opts.approvedMemberCount ?? 0),
    countCheckinsForClubAtEvents: () => Promise.resolve(checkins),
  } as unknown as PointsSourceRepository;
}

function ctx(month: Date, overrides: Partial<AdapterContext> = {}): AdapterContext {
  return {
    clubId: 'CLUB-A',
    ryYear: 2026,
    month,
    rule: {
      id: 'r1',
      key: 'cd_attendance',
      label: 'District event attendance',
      categoryKey: 'club_district',
      ruleType: 'tiered',
      period: 'monthly',
      points: null,
      perUnitCap: null,
      tiers: [
        { min: 25, max: 50, points: 10 },
        { min: 50, max: 75, points: 20 },
        { min: 75, max: 100, points: 30 },
        { min: 100, max: null, points: 50 },
      ],
      numeratorKey: null,
      denominatorKey: null,
      sourceKey: 'ratio',
    } satisfies AdapterContext['rule'],
    ...overrides,
  };
}

const MONTH = new Date('2026-09-01T00:00:00Z');

describe('EventAttendanceAdapter', () => {
  it('returns no entry when there are zero district events that month', async () => {
    const adapter = new EventAttendanceAdapter(repo({ eventIds: [], approvedMemberCount: 40 }));
    const result = await adapter.inputs(ctx(MONTH));
    expect(result).toEqual([]);
  });

  it('returns no entry when the club has zero approved members, even with events present', async () => {
    const adapter = new EventAttendanceAdapter(
      repo({ eventIds: ['EV-1'], approvedMemberCount: 0, checkinsByEvent: { 'EV-1': 5 } }),
    );
    const result = await adapter.inputs(ctx(MONTH));
    expect(result).toEqual([]);
  });

  it('single event: ratio is checkins / approved members, as a 0-100 percentage', async () => {
    const adapter = new EventAttendanceAdapter(
      repo({ eventIds: ['EV-1'], approvedMemberCount: 40, checkinsByEvent: { 'EV-1': 30 } }),
    );
    const result = await adapter.inputs(ctx(MONTH));
    expect(result).toEqual([{ periodKey: '2026-09', input: { value: 75 } }]);
  });

  it("multiple events: input is the average ratio across the month's events", async () => {
    const adapter = new EventAttendanceAdapter(
      repo({
        eventIds: ['EV-1', 'EV-2'],
        approvedMemberCount: 40,
        checkinsByEvent: { 'EV-1': 40, 'EV-2': 0 },
      }),
    );
    const result = await adapter.inputs(ctx(MONTH));
    // (100% + 0%) / 2 = 50%
    expect(result).toEqual([{ periodKey: '2026-09', input: { value: 50 } }]);
  });

  it('an event with zero checkins for the club counts as 0% in the average, not skipped', async () => {
    const adapter = new EventAttendanceAdapter(
      repo({ eventIds: ['EV-1'], approvedMemberCount: 40, checkinsByEvent: {} }),
    );
    const result = await adapter.inputs(ctx(MONTH));
    expect(result).toEqual([{ periodKey: '2026-09', input: { value: 0 } }]);
  });

  it('a club that checked in more members than currently approved can exceed 100%', async () => {
    const adapter = new EventAttendanceAdapter(
      repo({ eventIds: ['EV-1'], approvedMemberCount: 10, checkinsByEvent: { 'EV-1': 12 } }),
    );
    const result = await adapter.inputs(ctx(MONTH));
    expect(result).toEqual([{ periodKey: '2026-09', input: { value: 120 } }]);
  });

  it('ignores a rule with an unrecognised sourceKey', async () => {
    const adapter = new EventAttendanceAdapter(
      repo({ eventIds: ['EV-1'], approvedMemberCount: 40 }),
    );
    const result = await adapter.inputs(
      ctx(MONTH, { rule: { ...ctx(MONTH).rule, sourceKey: 'not_ratio' } }),
    );
    expect(result).toEqual([]);
  });
});
