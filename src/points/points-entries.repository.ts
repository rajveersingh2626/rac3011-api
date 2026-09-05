import { Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubPointEntryRow, EntryKind } from './points.types';

type Tx = Prisma.TransactionClient | PrismaClient;

const ENTRY_SELECT = {
  id: true,
  clubId: true,
  ryYear: true,
  periodKey: true,
  ruleId: true,
  rule: { select: { key: true, label: true, ruleType: true, period: true } },
  categoryId: true,
  category: { select: { key: true, name: true } },
  kind: true,
  points: true,
  reason: true,
  trace: true,
  sourceType: true,
  sourceId: true,
  createdById: true,
  updatedAt: true,
} satisfies Prisma.ClubPointEntrySelect;

type EntrySelectResult = Prisma.ClubPointEntryGetPayload<{ select: typeof ENTRY_SELECT }>;

function toRow(row: EntrySelectResult): ClubPointEntryRow {
  return {
    id: row.id,
    clubId: row.clubId,
    ryYear: row.ryYear,
    periodKey: row.periodKey,
    ruleId: row.ruleId,
    ruleKey: row.rule?.key ?? null,
    ruleLabel: row.rule?.label ?? null,
    ruleType: row.rule?.ruleType ?? null,
    rulePeriod: row.rule?.period ?? null,
    categoryId: row.categoryId,
    categoryKey: row.category.key,
    categoryName: row.category.name,
    kind: row.kind,
    points: row.points.toNumber(),
    reason: row.reason,
    trace: row.trace,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    createdById: row.createdById,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class PointsEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForYear(clubId: string, ryYear: number): Promise<ClubPointEntryRow[]> {
    const rows = await this.prisma.clubPointEntry.findMany({
      where: { clubId, ryYear },
      select: ENTRY_SELECT,
      orderBy: [{ periodKey: 'asc' }, { categoryId: 'asc' }],
    });
    return rows.map(toRow);
  }

  async findOnceAwardedRuleIds(
    clubId: string,
    ruleIds: string[],
    tx: Tx = this.prisma,
  ): Promise<Set<string>> {
    if (ruleIds.length === 0) return new Set();
    const rows = await tx.clubPointEntry.findMany({
      where: { clubId, ruleId: { in: ruleIds }, periodKey: 'once', kind: 'computed' },
      select: { ruleId: true },
    });
    return new Set(rows.map((r) => r.ruleId).filter((id): id is string => id !== null));
  }

  async findComputedEntryId(
    clubId: string,
    ruleId: string,
    periodKey: string,
    tx: Tx = this.prisma,
  ): Promise<string | null> {
    const row = await tx.clubPointEntry.findFirst({
      where: { clubId, ruleId, periodKey, kind: 'computed' },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  async upsertComputedEntry(
    tx: Tx,
    input: {
      clubId: string;
      ryYear: number;
      ruleId: string;
      categoryId: string;
      periodKey: string;
      points: number;
      trace: unknown;
    },
  ): Promise<void> {
    const existingId = await this.findComputedEntryId(
      input.clubId,
      input.ruleId,
      input.periodKey,
      tx,
    );
    const data = {
      clubId: input.clubId,
      ryYear: input.ryYear,
      ruleId: input.ruleId,
      categoryId: input.categoryId,
      periodKey: input.periodKey,
      kind: 'computed' as EntryKind,
      points: input.points,
      trace: input.trace as Prisma.InputJsonValue,
    };
    if (existingId) await tx.clubPointEntry.update({ where: { id: existingId }, data });
    else await tx.clubPointEntry.create({ data });
  }

  async deleteComputedEntry(
    tx: Tx,
    clubId: string,
    ruleId: string,
    periodKey: string,
  ): Promise<void> {
    await tx.clubPointEntry.deleteMany({ where: { clubId, ruleId, periodKey, kind: 'computed' } });
  }

  async deleteStaleComputed(
    tx: Tx,
    clubId: string,
    ryYear: number,
    activeRuleIds: string[],
  ): Promise<void> {
    await tx.clubPointEntry.deleteMany({
      where: {
        clubId,
        ryYear,
        kind: 'computed',
        ruleId: activeRuleIds.length ? { notIn: activeRuleIds } : { not: null },
      },
    });
  }

  async findJudgedEntry(clubId: string, periodKey: string): Promise<ClubPointEntryRow | null> {
    const row = await this.prisma.clubPointEntry.findFirst({
      where: { clubId, periodKey, kind: 'judged', sourceType: null },
      select: ENTRY_SELECT,
    });
    return row ? toRow(row) : null;
  }

  async upsertJudgedEntry(input: {
    clubId: string;
    ryYear: number;
    periodKey: string;
    categoryId: string;
    points: number;
    reason: string;
    createdById: string;
  }): Promise<ClubPointEntryRow> {
    const existing = await this.prisma.clubPointEntry.findFirst({
      where: { clubId: input.clubId, periodKey: input.periodKey, kind: 'judged', sourceType: null },
      select: { id: true },
    });
    const data = {
      clubId: input.clubId,
      ryYear: input.ryYear,
      periodKey: input.periodKey,
      categoryId: input.categoryId,
      kind: 'judged' as EntryKind,
      points: input.points,
      reason: input.reason,
      createdById: input.createdById,
    };
    const row = existing
      ? await this.prisma.clubPointEntry.update({
          where: { id: existing.id },
          data,
          select: ENTRY_SELECT,
        })
      : await this.prisma.clubPointEntry.create({ data, select: ENTRY_SELECT });
    return toRow(row);
  }

  async deleteJudgedEntry(clubId: string, periodKey: string): Promise<void> {
    await this.prisma.clubPointEntry.deleteMany({
      where: { clubId, periodKey, kind: 'judged', sourceType: null },
    });
  }

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
