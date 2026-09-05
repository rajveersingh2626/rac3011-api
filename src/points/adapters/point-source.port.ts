import type { EvalRule, RuleInput } from '../engine/rule-eval.types';

export type AdapterContext = {
  clubId: string;
  ryYear: number;
  month?: Date;
  rule: EvalRule & {
    numeratorKey: string | null;
    denominatorKey: string | null;
    sourceKey: string;
  };
};

export type AdapterInput = { periodKey: string; input: RuleInput };

// One implementation per SourceType (§6.1), registered in POINT_SOURCE_ADAPTERS by sourceType key.
export interface PointSourceAdapter {
  inputs(ctx: AdapterContext): Promise<AdapterInput[]>;
}

export const POINT_SOURCE_ADAPTERS = Symbol('POINT_SOURCE_ADAPTERS');
