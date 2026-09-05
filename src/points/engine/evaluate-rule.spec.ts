import { describe, expect, it } from 'vitest';
import { evaluateRule } from './evaluate-rule';
import type { EvalRule } from './rule-eval.types';

function rule(overrides: Partial<EvalRule>): EvalRule {
  return {
    id: 'rule-1',
    key: 'test_rule',
    label: 'Test rule',
    categoryKey: 'community_services',
    ruleType: 'flat',
    period: 'monthly',
    points: 20,
    perUnitCap: null,
    tiers: [],
    ...overrides,
  };
}

describe('evaluateRule: flat', () => {
  it('awards rule.points when input.value is truthy', () => {
    const r = rule({ ruleType: 'flat', points: 20 });
    const result = evaluateRule(r, { value: 1 }, false);
    expect(result?.points).toBe(20);
    expect(result?.ruleId).toBe('rule-1');
    expect(result?.categoryKey).toBe('community_services');
  });

  it('returns null when input.value is 0', () => {
    const r = rule({ ruleType: 'flat' });
    expect(evaluateRule(r, { value: 0 }, false)).toBeNull();
  });

  it('returns null when input.value is undefined', () => {
    const r = rule({ ruleType: 'flat' });
    expect(evaluateRule(r, {}, false)).toBeNull();
  });

  it('treats any positive number as truthy, not just 1', () => {
    const r = rule({ ruleType: 'flat', points: 15 });
    expect(evaluateRule(r, { value: 3 }, false)?.points).toBe(15);
  });

  it('returns null for a negative value', () => {
    const r = rule({ ruleType: 'flat' });
    expect(evaluateRule(r, { value: -1 }, false)).toBeNull();
  });
});

describe('evaluateRule: penalty', () => {
  it('behaves like flat but with negative rule.points', () => {
    const r = rule({ ruleType: 'penalty', points: -500 });
    const result = evaluateRule(r, { value: 1 }, false);
    expect(result?.points).toBe(-500);
  });

  it('returns null when input.value is falsy', () => {
    const r = rule({ ruleType: 'penalty', points: -500 });
    expect(evaluateRule(r, { value: 0 }, false)).toBeNull();
  });
});

describe('evaluateRule: per_unit', () => {
  it('multiplies units by rule.points using input.count', () => {
    const r = rule({ ruleType: 'per_unit', points: 8 });
    expect(evaluateRule(r, { count: 3 }, false)?.points).toBe(24);
  });

  it('falls back to input.value when count is absent', () => {
    const r = rule({ ruleType: 'per_unit', points: 10 });
    expect(evaluateRule(r, { value: 4 }, false)?.points).toBe(40);
  });

  it('caps units at perUnitCap', () => {
    const r = rule({ ruleType: 'per_unit', points: 20, perUnitCap: 4 });
    expect(evaluateRule(r, { count: 10 }, false)?.points).toBe(80);
  });

  it('does not cap when perUnitCap is not set', () => {
    const r = rule({ ruleType: 'per_unit', points: 5, perUnitCap: null });
    expect(evaluateRule(r, { count: 100 }, false)?.points).toBe(500);
  });

  it('returns null when units resolve to 0', () => {
    const r = rule({ ruleType: 'per_unit', points: 10 });
    expect(evaluateRule(r, {}, false)).toBeNull();
    expect(evaluateRule(r, { count: 0 }, false)).toBeNull();
  });
});

describe('evaluateRule: tiered (direct value)', () => {
  const tiers = [
    { min: 1, max: 5, points: 30 },
    { min: 5, max: null, points: 60 },
  ];

  it('matches the first tier whose bounds are inclusive-min / exclusive-max', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { value: 1 }, false)).toMatchObject({
      points: 30,
      tierMatched: { min: 1, max: 5 },
    });
    expect(evaluateRule(r, { value: 4.9 }, false)?.points).toBe(30);
  });

  it('an open-ended tier (max: null) matches any value >= its min', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { value: 5 }, false)).toMatchObject({
      points: 60,
      tierMatched: { min: 5, max: null },
    });
    expect(evaluateRule(r, { value: 1000 }, false)?.points).toBe(60);
  });

  it('returns null below the lowest tier', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { value: 0.5 }, false)).toBeNull();
    expect(evaluateRule(r, { value: 0 }, false)).toBeNull();
  });

  it('returns null when input.value is undefined', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, {}, false)).toBeNull();
  });
});

describe('evaluateRule: tiered (ratio)', () => {
  const tiers = [
    { min: 50, max: 75, points: 20 },
    { min: 75, max: 100, points: 30 },
    { min: 100, max: null, points: 70 },
  ];

  it('computes numerator/denominator*100 and matches the tier', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    const result = evaluateRule(r, { numerator: 38, denominator: 40 }, false);
    expect(result?.tierMatched).toEqual({ min: 75, max: 100 });
    expect(result?.points).toBe(30);
  });

  it('a 100% ratio matches the top open-ended tier', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { numerator: 40, denominator: 40 }, false)?.points).toBe(70);
  });

  it('returns null for a zero denominator', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { numerator: 5, denominator: 0 }, false)).toBeNull();
  });

  it('returns null for a negative/absent denominator', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { numerator: 5, denominator: -1 }, false)).toBeNull();
    expect(evaluateRule(r, { numerator: 5 }, false)).toBeNull();
  });

  it('treats presence of numerator alone as ratio mode, not raw value', () => {
    const r = rule({ ruleType: 'tiered', tiers: [{ min: 0, max: 1, points: 99 }] });
    // numerator present but no denominator -> ratio mode -> denominator 0 -> null, even though
    // numerator itself (5) would otherwise match a [0,1) direct-value tier.
    expect(evaluateRule(r, { numerator: 5 }, false)).toBeNull();
  });

  it('below the lowest tier boundary returns null', () => {
    const r = rule({ ruleType: 'tiered', tiers });
    expect(evaluateRule(r, { numerator: 10, denominator: 40 }, false)).toBeNull();
  });
});

describe('evaluateRule: once-period idempotency', () => {
  it('returns null when alreadyAwardedOnce is true, regardless of rule type or input', () => {
    const flatRule = rule({ ruleType: 'flat', period: 'once', points: 100 });
    expect(evaluateRule(flatRule, { value: 1 }, true)).toBeNull();

    const tieredRule = rule({
      ruleType: 'tiered',
      period: 'once',
      tiers: [{ min: 0, max: null, points: 50 }],
    });
    expect(evaluateRule(tieredRule, { value: 5 }, true)).toBeNull();
  });

  it('evaluates normally when alreadyAwardedOnce is false', () => {
    const r = rule({ ruleType: 'flat', period: 'once', points: 100 });
    expect(evaluateRule(r, { value: 1 }, false)?.points).toBe(100);
  });

  it('monthly and yearly periods ignore alreadyAwardedOnce entirely', () => {
    const monthly = rule({ ruleType: 'flat', period: 'monthly', points: 20 });
    expect(evaluateRule(monthly, { value: 1 }, true)?.points).toBe(20);

    const yearly = rule({ ruleType: 'flat', period: 'yearly', points: 20 });
    expect(evaluateRule(yearly, { value: 1 }, true)?.points).toBe(20);
  });
});
