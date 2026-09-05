export type RuleInput = {
  value?: number;
  numerator?: number;
  denominator?: number;
  count?: number;
};

export type TierSpec = { min: number; max: number | null; points: number };

export type EvalRuleType = 'flat' | 'per_unit' | 'tiered' | 'penalty';
export type EvalRulePeriod = 'monthly' | 'yearly' | 'once';

export type EvalRule = {
  id: string;
  key: string;
  label: string;
  categoryKey: string;
  ruleType: EvalRuleType;
  period: EvalRulePeriod;
  points: number | null;
  perUnitCap: number | null;
  tiers: TierSpec[];
};

export type Trace = {
  ruleId: string;
  ruleKey: string;
  label: string;
  categoryKey: string;
  inputs: RuleInput;
  tierMatched?: { min: number; max: number | null };
  points: number;
};
