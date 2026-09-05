import { describe, expect, it } from 'vitest';
import { ClubFactAdapter } from './club-fact.adapter';
import type { PointsSourceRepository } from '../points-source.repository';
import type { AdapterContext } from './point-source.port';
import type { ClubFactsForAdapterRow } from '../points.types';
import type { EvalRule } from '../engine/rule-eval.types';

function repo(facts: ClubFactsForAdapterRow, approved = 0, withSkill = 0): PointsSourceRepository {
  return {
    findClubFacts: () => Promise.resolve(facts),
    countApprovedMembers: () => Promise.resolve(approved),
    countApprovedMembersWithSkill: () => Promise.resolve(withSkill),
  } as unknown as PointsSourceRepository;
}

function ctx(
  sourceKey: string,
  period: EvalRule['period'],
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
      ruleType: 'flat',
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

const emptyFacts: ClubFactsForAdapterRow = {
  duesPaidOn: null,
  riCitationCompleted: false,
  paulHarrisFellows: 0,
  dualMembers: 0,
  mdioCommitteeMembers: 0,
  mdioEventsAttended: 0,
  sisterClubSignedOn: null,
  drrVisitOn: null,
  vocationalCentreOn: null,
  activeSocialHandles: 0,
  clubMerchandise: false,
  priorYearMemberCount: null,
};

describe('ClubFactAdapter', () => {
  it('once-period boolean facts produce a single periodKey "once" entry', async () => {
    const adapter = new ClubFactAdapter(
      repo({ ...emptyFacts, drrVisitOn: new Date('2026-08-01') }),
    );
    const result = await adapter.inputs(ctx('drr_visit_completed', 'once'));
    expect(result).toEqual([{ periodKey: 'once', input: { value: 1 } }]);
  });

  it('once-period boolean fact false produces value 0 (not skipped)', async () => {
    const adapter = new ClubFactAdapter(repo(emptyFacts));
    const result = await adapter.inputs(ctx('sister_club_signed', 'once'));
    expect(result).toEqual([{ periodKey: 'once', input: { value: 0 } }]);
  });

  it('yearly per_unit facts produce a single periodKey=ryYear entry', async () => {
    const adapter = new ClubFactAdapter(repo({ ...emptyFacts, paulHarrisFellows: 3 }));
    const result = await adapter.inputs(ctx('paul_harris_fellows', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { value: 3, count: 3 } }]);
  });

  it('monthly facts (active_social_handles) replicate the same input across every month in scope', async () => {
    const adapter = new ClubFactAdapter(repo({ ...emptyFacts, activeSocialHandles: 5 }));
    const result = await adapter.inputs(
      ctx('active_social_handles', 'monthly', { month: new Date('2026-08-01') }),
    );
    expect(result).toEqual([{ periodKey: '2026-08', input: { value: 5, count: 5 } }]);
  });

  it('dues_paid_bracket returns null (no entry) when unpaid and before the cutoff', async () => {
    const adapter = new ClubFactAdapter(repo(emptyFacts));
    const result = await adapter.inputs(ctx('dues_paid_bracket', 'yearly'));
    expect(result).toEqual([]);
  });

  it('dues_paid_bracket resolves a bracket once the fact or the clock makes it determinable', async () => {
    const adapter = new ClubFactAdapter(
      repo({ ...emptyFacts, duesPaidOn: new Date('2026-08-15') }),
    );
    const result = await adapter.inputs(ctx('dues_paid_bracket', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { value: 0 } }]);
  });

  it('retention_ratio reads numerator from approved members, denominator from priorYearMemberCount', async () => {
    const adapter = new ClubFactAdapter(repo({ ...emptyFacts, priorYearMemberCount: 40 }, 38));
    const result = await adapter.inputs(ctx('retention_ratio', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { numerator: 38, denominator: 40 } }]);
  });

  it('retention_ratio denominator is 0 when there is no prior-year baseline', async () => {
    const adapter = new ClubFactAdapter(repo(emptyFacts, 38));
    const result = await adapter.inputs(ctx('retention_ratio', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { numerator: 38, denominator: 0 } }]);
  });

  it('skills_adoption_ratio reads both counts from member profiles', async () => {
    const adapter = new ClubFactAdapter(repo(emptyFacts, 40, 22));
    const result = await adapter.inputs(ctx('skills_adoption_ratio', 'yearly'));
    expect(result).toEqual([{ periodKey: '2026', input: { numerator: 22, denominator: 40 } }]);
  });

  it('an unrecognised sourceKey resolves to no input at all', async () => {
    const adapter = new ClubFactAdapter(repo(emptyFacts));
    const result = await adapter.inputs(ctx('not_a_real_key', 'yearly'));
    expect(result).toEqual([]);
  });
});
