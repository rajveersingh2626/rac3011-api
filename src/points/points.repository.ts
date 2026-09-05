import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  PointCategoryRow,
  PointRuleCreate,
  PointRuleRow,
  PointRuleUpdate,
} from './points.types';

const RULE_SELECT = {
  id: true,
  categoryId: true,
  category: { select: { key: true } },
  key: true,
  label: true,
  ruleType: true,
  period: true,
  sourceType: true,
  sourceKey: true,
  numeratorKey: true,
  denominatorKey: true,
  points: true,
  perUnitCap: true,
  isActive: true,
  ryYear: true,
  tiers: { select: { min: true, max: true, points: true }, orderBy: { min: 'asc' as const } },
} satisfies Prisma.PointRuleSelect;

type RuleSelectResult = Prisma.PointRuleGetPayload<{ select: typeof RULE_SELECT }>;

function toRuleRow(row: RuleSelectResult): PointRuleRow {
  return {
    id: row.id,
    categoryId: row.categoryId,
    categoryKey: row.category.key,
    key: row.key,
    label: row.label,
    ruleType: row.ruleType,
    period: row.period,
    sourceType: row.sourceType,
    sourceKey: row.sourceKey,
    numeratorKey: row.numeratorKey,
    denominatorKey: row.denominatorKey,
    points: row.points ? row.points.toNumber() : null,
    perUnitCap: row.perUnitCap,
    isActive: row.isActive,
    ryYear: row.ryYear,
    tiers: row.tiers.map((t) => ({
      min: t.min.toNumber(),
      max: t.max ? t.max.toNumber() : null,
      points: t.points.toNumber(),
    })),
  };
}

@Injectable()
export class PointsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCategories(): Promise<PointCategoryRow[]> {
    return this.prisma.pointCategory.findMany({
      select: { id: true, key: true, name: true, order: true },
      orderBy: { order: 'asc' },
    });
  }

  async findCategoryByKey(key: string): Promise<PointCategoryRow | null> {
    return this.prisma.pointCategory.findUnique({
      where: { key },
      select: { id: true, key: true, name: true, order: true },
    });
  }

  async listRules(ryYear: number, activeOnly = false): Promise<PointRuleRow[]> {
    const rows = await this.prisma.pointRule.findMany({
      where: { ryYear, isActive: activeOnly ? true : undefined },
      select: RULE_SELECT,
      orderBy: [{ category: { order: 'asc' } }, { key: 'asc' }],
    });
    return rows.map(toRuleRow);
  }

  async findRuleById(id: string): Promise<PointRuleRow | null> {
    const row = await this.prisma.pointRule.findUnique({ where: { id }, select: RULE_SELECT });
    return row ? toRuleRow(row) : null;
  }

  async findRuleByKey(key: string): Promise<PointRuleRow | null> {
    const row = await this.prisma.pointRule.findUnique({ where: { key }, select: RULE_SELECT });
    return row ? toRuleRow(row) : null;
  }

  async createRule(input: PointRuleCreate): Promise<PointRuleRow> {
    const created = await this.prisma.pointRule.create({
      data: {
        categoryId: input.categoryId,
        key: input.key,
        label: input.label,
        ruleType: input.ruleType,
        period: input.period,
        sourceType: input.sourceType,
        sourceKey: input.sourceKey,
        numeratorKey: input.numeratorKey ?? null,
        denominatorKey: input.denominatorKey ?? null,
        points: input.points ?? null,
        perUnitCap: input.perUnitCap ?? null,
        ryYear: input.ryYear,
        tiers: input.tiers?.length
          ? { create: input.tiers.map((t) => ({ min: t.min, max: t.max, points: t.points })) }
          : undefined,
      },
      select: RULE_SELECT,
    });
    return toRuleRow(created);
  }

  async updateRule(id: string, input: PointRuleUpdate): Promise<PointRuleRow> {
    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.tiers !== undefined) {
        await tx.pointRuleTier.deleteMany({ where: { ruleId: id } });
        if (input.tiers.length) {
          await tx.pointRuleTier.createMany({
            data: input.tiers.map((t) => ({
              ruleId: id,
              min: t.min,
              max: t.max,
              points: t.points,
            })),
          });
        }
      }
      return tx.pointRule.update({
        where: { id },
        data: {
          categoryId: input.categoryId,
          label: input.label,
          ruleType: input.ruleType,
          period: input.period,
          sourceType: input.sourceType,
          sourceKey: input.sourceKey,
          numeratorKey: input.numeratorKey,
          denominatorKey: input.denominatorKey,
          points: input.points,
          perUnitCap: input.perUnitCap,
          isActive: input.isActive,
        },
        select: RULE_SELECT,
      });
    });
    return toRuleRow(updated);
  }

  async exists(id: string): Promise<boolean> {
    return (await this.prisma.pointRule.count({ where: { id } })) > 0;
  }

  async listActiveClubIds(): Promise<string[]> {
    const rows = await this.prisma.club.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}
