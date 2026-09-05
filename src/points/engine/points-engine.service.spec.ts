import { describe, expect, it, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PointsEngineService } from './points-engine.service';
import type { PointsRepository } from '../points.repository';
import type { PointsEntriesRepository } from '../points-entries.repository';
import type { PointRuleRow, SourceTypeKey } from '../points.types';
import type { PointSourceAdapter } from '../adapters/point-source.port';
import { POINTS_RECOMPUTED_EVENT } from '../points.events';

function rule(overrides: Partial<PointRuleRow>): PointRuleRow {
  return {
    id: 'rule-1',
    categoryId: 'cat-1',
    categoryKey: 'community_services',
    key: 'test_rule',
    label: 'Test rule',
    ruleType: 'flat',
    period: 'monthly',
    sourceType: 'report_field',
    sourceKey: 'projects_initiated',
    numeratorKey: null,
    denominatorKey: null,
    points: 20,
    perUnitCap: null,
    isActive: true,
    ryYear: 2026,
    tiers: [],
    ...overrides,
  };
}

function harness(
  rules: PointRuleRow[],
  adapterInputs: Record<string, { periodKey: string; input: { value?: number } }[]>,
) {
  const upserts: unknown[] = [];
  const deletes: unknown[] = [];
  const staleDeletes: unknown[] = [];
  const onceAwarded = new Set<string>();

  const repo = { listRules: vi.fn().mockResolvedValue(rules) } as unknown as PointsRepository;

  const entries = {
    findOnceAwardedRuleIds: vi.fn().mockResolvedValue(onceAwarded),
    upsertComputedEntry: vi.fn((_tx: unknown, input: unknown) => {
      upserts.push(input);
      return Promise.resolve();
    }),
    deleteComputedEntry: vi.fn(
      (_tx: unknown, clubId: string, ruleId: string, periodKey: string) => {
        deletes.push({ clubId, ruleId, periodKey });
        return Promise.resolve();
      },
    ),
    deleteStaleComputed: vi.fn(
      (_tx: unknown, clubId: string, ryYear: number, activeRuleIds: string[]) => {
        staleDeletes.push({ clubId, ryYear, activeRuleIds });
        return Promise.resolve();
      },
    ),
    transaction: vi.fn((fn: (tx: unknown) => Promise<void>) => fn({})),
  } as unknown as PointsEntriesRepository;

  const adapter: PointSourceAdapter = {
    inputs: vi.fn((ctx: { rule: { key: string } }) =>
      Promise.resolve(adapterInputs[ctx.rule.key] ?? []),
    ),
  };
  const adapters: Record<SourceTypeKey, PointSourceAdapter> = {
    report_field: adapter,
    club_fact: adapter,
    event_attendance: adapter,
    project_collaboration: adapter,
    ride_hosting: adapter,
    club_events: adapter,
  };

  const events = new EventEmitter2();
  const service = new PointsEngineService(repo, entries, adapters, events);
  return { service, entries, events, upserts, deletes, staleDeletes, onceAwarded };
}

describe('PointsEngineService.recompute', () => {
  it('upserts a computed entry per (rule, periodKey) when the rule evaluates truthy', async () => {
    const r = rule({});
    const { service, upserts } = harness([r], {
      test_rule: [{ periodKey: '2026-08', input: { value: 1 } }],
    });
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(upserts).toEqual([
      expect.objectContaining({
        clubId: 'CLUB-A',
        ryYear: 2026,
        ruleId: 'rule-1',
        categoryId: 'cat-1',
        periodKey: '2026-08',
        points: 20,
      }),
    ]);
  });

  it('deletes the computed entry for a periodKey when the rule evaluates to null', async () => {
    const r = rule({});
    const { service, deletes, upserts } = harness([r], {
      test_rule: [{ periodKey: '2026-08', input: { value: 0 } }],
    });
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(upserts).toEqual([]);
    expect(deletes).toEqual([{ clubId: 'CLUB-A', ruleId: 'rule-1', periodKey: '2026-08' }]);
  });

  it('deletes stale computed entries for rules no longer active/present', async () => {
    const r = rule({});
    const { service, staleDeletes } = harness([r], { test_rule: [] });
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(staleDeletes).toEqual([{ clubId: 'CLUB-A', ryYear: 2026, activeRuleIds: ['rule-1'] }]);
  });

  it('skips a once-period rule entirely once already awarded - never re-evaluates or deletes it', async () => {
    const r = rule({ period: 'once' });
    const { service, upserts, deletes, onceAwarded } = harness([r], {
      test_rule: [{ periodKey: 'once', input: { value: 0 } }],
    });
    onceAwarded.add('rule-1');
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(upserts).toEqual([]);
    expect(deletes).toEqual([]);
  });

  it('awards a once-period rule the first time its input is truthy', async () => {
    const r = rule({ period: 'once' });
    const { service, upserts } = harness([r], {
      test_rule: [{ periodKey: 'once', input: { value: 1 } }],
    });
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(upserts).toEqual([expect.objectContaining({ periodKey: 'once', points: 20 })]);
  });

  it('emits points.recomputed after a successful recompute', async () => {
    const r = rule({});
    const { service, events } = harness([r], { test_rule: [] });
    const listener = vi.fn();
    events.on(POINTS_RECOMPUTED_EVENT, listener);
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(listener).toHaveBeenCalledWith({ clubId: 'CLUB-A', ryYear: 2026 });
  });

  it('processes multiple rules independently in the same recompute', async () => {
    const r1 = rule({ id: 'rule-1', key: 'r1', categoryId: 'cat-1' });
    const r2 = rule({ id: 'rule-2', key: 'r2', categoryId: 'cat-2', points: 5 });
    const { service, upserts } = harness([r1, r2], {
      r1: [{ periodKey: '2026-08', input: { value: 1 } }],
      r2: [{ periodKey: '2026-08', input: { value: 1 } }],
    });
    await service.recompute({ clubId: 'CLUB-A', ryYear: 2026, trigger: 'test' });
    expect(upserts).toHaveLength(2);
  });
});
