import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import type {
  ReportListFilter,
  ReportQueryRow,
  ReportRow,
  ReportWithRelations,
} from './reports.types';

export type ReportIncludes = { queries?: boolean; club?: boolean };

const REPORT_SELECT = {
  id: true,
  clubId: true,
  ryYear: true,
  month: true,
  schemaVersion: true,
  status: true,
  values: true,
  notes: true,
  submittedById: true,
  submittedAt: true,
  filedOnTime: true,
  scoredAt: true,
  legacyId: true,
} satisfies Prisma.ReportSelect;

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // scope must already be narrowed by the caller's requested clubId filter (ScopeService.narrowClubs)
  // so this can never widen access past what the requester's grants allow.
  private whereFor(filter: ReportListFilter, scope: ClubScopeFilter): Prisma.ReportWhereInput {
    return {
      clubId: 'all' in scope ? undefined : { in: scope.clubIds },
      ryYear: filter.ryYear,
      month: filter.month ? new Date(`${filter.month}-01T00:00:00Z`) : undefined,
      status: filter.status,
    };
  }

  async findMany(
    filter: ReportListFilter,
    scope: ClubScopeFilter,
    include: ReportIncludes,
    page: number,
    pageSize: number,
  ): Promise<{ items: ReportWithRelations[]; total: number }> {
    const where = this.whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        select: {
          ...REPORT_SELECT,
          queries: include.queries ? { orderBy: { createdAt: 'asc' } } : undefined,
          club: include.club
            ? { select: { id: true, name: true, shortName: true, zoneId: true } }
            : undefined,
        },
        orderBy: [{ month: 'desc' }, { clubId: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items: items, total };
  }

  async findById(id: string, include: ReportIncludes = {}): Promise<ReportWithRelations | null> {
    const row = await this.prisma.report.findUnique({
      where: { id },
      select: {
        ...REPORT_SELECT,
        queries: include.queries ? { orderBy: { createdAt: 'asc' } } : undefined,
        club: include.club
          ? { select: { id: true, name: true, shortName: true, zoneId: true } }
          : undefined,
      },
    });
    return row;
  }

  async findByClubMonth(clubId: string, month: Date): Promise<ReportRow | null> {
    return this.prisma.report.findUnique({
      where: { clubId_month: { clubId, month } },
      select: REPORT_SELECT,
    });
  }

  async create(data: {
    clubId: string;
    ryYear: number;
    month: Date;
    schemaVersion: number;
    values: unknown;
  }): Promise<ReportRow> {
    return this.prisma.report.create({
      data: {
        clubId: data.clubId,
        ryYear: data.ryYear,
        month: data.month,
        schemaVersion: data.schemaVersion,
        values: data.values as Prisma.InputJsonValue,
      },
      select: REPORT_SELECT,
    });
  }

  async update(
    id: string,
    data: Partial<{
      values: unknown;
      notes: string | null;
      status: ReportRow['status'];
      submittedById: string | null;
      submittedAt: Date | null;
      filedOnTime: boolean | null;
      scoredAt: Date | null;
    }>,
  ): Promise<ReportRow> {
    return this.prisma.report.update({
      where: { id },
      data: { ...data, values: data.values as Prisma.InputJsonValue | undefined },
      select: REPORT_SELECT,
    });
  }

  async findExistingClubIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async getReportDeadlineDay(): Promise<number> {
    const row = await this.prisma.setting.findUnique({ where: { key: 'report.deadlineDay' } });
    const value = row?.value;
    return typeof value === 'number' ? value : 5;
  }

  async addQuery(reportId: string, askedById: string, question: string): Promise<ReportQueryRow> {
    return this.prisma.reportQuery.create({ data: { reportId, askedById, question } });
  }

  async findQueryById(queryId: string): Promise<ReportQueryRow | null> {
    return this.prisma.reportQuery.findUnique({ where: { id: queryId } });
  }

  async replyQuery(queryId: string, reply: string, repliedById: string): Promise<ReportQueryRow> {
    return this.prisma.reportQuery.update({
      where: { id: queryId },
      data: { reply, repliedById, repliedAt: new Date() },
    });
  }
}
