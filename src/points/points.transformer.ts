import type { ClubPointEntryRow, PointCategoryRow, PointRuleRow } from './points.types';

const MONTH_KEY = /^\d{4}-\d{2}$/;

export function categoryDto(row: PointCategoryRow) {
  return { id: row.id, key: row.key, name: row.name, order: row.order };
}

export function ruleDto(row: PointRuleRow) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryKey: row.categoryKey,
    key: row.key,
    label: row.label,
    ruleType: row.ruleType,
    period: row.period,
    sourceType: row.sourceType,
    sourceKey: row.sourceKey,
    numeratorKey: row.numeratorKey,
    denominatorKey: row.denominatorKey,
    points: row.points,
    perUnitCap: row.perUnitCap,
    isActive: row.isActive,
    ryYear: row.ryYear,
    tiers: row.tiers,
  };
}

function entryDto(row: ClubPointEntryRow) {
  return {
    id: row.id,
    ruleId: row.ruleId,
    ruleKey: row.ruleKey,
    ruleLabel: row.ruleLabel,
    ruleType: row.ruleType,
    rulePeriod: row.rulePeriod,
    categoryId: row.categoryId,
    categoryKey: row.categoryKey,
    categoryName: row.categoryName,
    periodKey: row.periodKey,
    points: row.points,
    trace: row.trace,
  };
}

function judgedDto(row: ClubPointEntryRow | null) {
  if (!row) return null;
  return {
    points: row.points,
    reason: row.reason,
    createdById: row.createdById,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type ClubPointsSummary = ReturnType<typeof clubPointsDto>;

export function clubPointsDto(input: {
  clubId: string;
  ryYear: number;
  month: string | undefined;
  entries: ClubPointEntryRow[];
}) {
  const total = input.entries.reduce((sum, e) => sum + e.points, 0);

  const byCategoryMap = new Map<
    string,
    { categoryId: string; categoryKey: string; categoryName: string; points: number }
  >();
  for (const e of input.entries) {
    const existing = byCategoryMap.get(e.categoryId);
    if (existing) existing.points += e.points;
    else
      byCategoryMap.set(e.categoryId, {
        categoryId: e.categoryId,
        categoryKey: e.categoryKey,
        categoryName: e.categoryName,
        points: e.points,
      });
  }

  const byMonthMap = new Map<string, number>();
  for (const e of input.entries) {
    if (!MONTH_KEY.test(e.periodKey)) continue;
    byMonthMap.set(e.periodKey, (byMonthMap.get(e.periodKey) ?? 0) + e.points);
  }

  const monthEntries = input.month
    ? input.entries.filter((e) => e.kind === 'computed' && e.periodKey === input.month)
    : [];
  const judged = input.month
    ? (input.entries.find((e) => e.kind === 'judged' && e.periodKey === input.month) ?? null)
    : null;

  return {
    clubId: input.clubId,
    ryYear: input.ryYear,
    total,
    byCategory: [...byCategoryMap.values()].sort((a, b) =>
      a.categoryKey.localeCompare(b.categoryKey),
    ),
    byMonth: [...byMonthMap.entries()]
      .map(([periodKey, points]) => ({ periodKey, points }))
      .sort((a, b) => a.periodKey.localeCompare(b.periodKey)),
    month: input.month ?? null,
    entries: monthEntries.map(entryDto),
    judged: judgedDto(judged),
  };
}
