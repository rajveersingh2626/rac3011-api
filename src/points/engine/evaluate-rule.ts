import type { EvalRule, RuleInput, Trace } from './rule-eval.types';

function truthy(value: number | undefined): boolean {
  return typeof value === 'number' && value > 0;
}

function trace(
  rule: EvalRule,
  input: RuleInput,
  points: number,
  tierMatched?: { min: number; max: number | null },
): Trace {
  return {
    ruleId: rule.id,
    ruleKey: rule.key,
    label: rule.label,
    categoryKey: rule.categoryKey,
    inputs: input,
    tierMatched,
    points,
  };
}

function ratioOrValue(input: RuleInput): number | null {
  const isRatio = input.numerator !== undefined || input.denominator !== undefined;
  if (!isRatio) return input.value ?? null;
  const denominator = input.denominator ?? 0;
  if (denominator <= 0) return null;
  return ((input.numerator ?? 0) / denominator) * 100;
}

export function evaluateRule(
  rule: EvalRule,
  input: RuleInput,
  alreadyAwardedOnce: boolean,
): Trace | null {
  if (rule.period === 'once' && alreadyAwardedOnce) return null;

  switch (rule.ruleType) {
    case 'flat':
    case 'penalty': {
      if (!truthy(input.value)) return null;
      return trace(rule, input, rule.points ?? 0);
    }
    case 'per_unit': {
      let units = input.count ?? input.value ?? 0;
      if (rule.perUnitCap != null) units = Math.min(units, rule.perUnitCap);
      if (units <= 0) return null;
      return trace(rule, input, units * (rule.points ?? 0));
    }
    case 'tiered': {
      const x = ratioOrValue(input);
      if (x === null) return null;
      const tier = rule.tiers.find((t) => t.min <= x && (t.max === null || x < t.max));
      if (!tier) return null;
      return trace(rule, input, tier.points, { min: tier.min, max: tier.max });
    }
  }
}
