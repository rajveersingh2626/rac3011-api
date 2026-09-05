import type { EvalRulePeriod, EvalRuleType, TierSpec } from './engine/rule-eval.types';

export type SourceTypeKey =
  | 'report_field'
  | 'club_fact'
  | 'event_attendance'
  | 'project_collaboration'
  | 'ride_hosting'
  | 'club_events';

export type PointCategoryRow = { id: string; key: string; name: string; order: number };

export type PointRuleRow = {
  id: string;
  categoryId: string;
  categoryKey: string;
  key: string;
  label: string;
  ruleType: EvalRuleType;
  period: EvalRulePeriod;
  sourceType: SourceTypeKey;
  sourceKey: string;
  numeratorKey: string | null;
  denominatorKey: string | null;
  points: number | null;
  perUnitCap: number | null;
  isActive: boolean;
  ryYear: number;
  tiers: TierSpec[];
};

export type PointRuleCreate = {
  categoryId: string;
  key: string;
  label: string;
  ruleType: EvalRuleType;
  period: EvalRulePeriod;
  sourceType: SourceTypeKey;
  sourceKey: string;
  numeratorKey?: string | null;
  denominatorKey?: string | null;
  points?: number | null;
  perUnitCap?: number | null;
  ryYear: number;
  tiers?: TierSpec[];
};

export type PointRuleUpdate = Partial<Omit<PointRuleCreate, 'ryYear'>> & { isActive?: boolean };

export type EntryKind = 'computed' | 'judged';

export type ClubPointEntryRow = {
  id: string;
  clubId: string;
  ryYear: number;
  periodKey: string;
  ruleId: string | null;
  ruleKey: string | null;
  ruleLabel: string | null;
  ruleType: EvalRuleType | null;
  rulePeriod: EvalRulePeriod | null;
  categoryId: string;
  categoryKey: string;
  categoryName: string;
  kind: EntryKind;
  points: number;
  reason: string | null;
  trace: unknown;
  sourceType: string | null;
  sourceId: string | null;
  createdById: string | null;
  updatedAt: Date;
};

export type ClubFactsForAdapterRow = {
  duesPaidOn: Date | null;
  riCitationCompleted: boolean;
  paulHarrisFellows: number;
  dualMembers: number;
  mdioCommitteeMembers: number;
  mdioEventsAttended: number;
  sisterClubSignedOn: Date | null;
  drrVisitOn: Date | null;
  vocationalCentreOn: Date | null;
  activeSocialHandles: number;
  clubMerchandise: boolean;
  priorYearMemberCount: number | null;
} | null;

export type ReportForAdapterRow = {
  month: Date;
  values: unknown;
  filedOnTime: boolean | null;
};
