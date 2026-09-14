import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditRecordInput = {
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
};

export type AuditFilter = {
  resourceType?: string;
  resourceId?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
};

export type AuditRow = {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  at: Date;
};

const toJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v === undefined || v === null ? 'JsonNull' : v;

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insert(input: AuditRecordInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        before: input.before == null ? undefined : toJson(input.before),
        after: input.after == null ? undefined : toJson(input.after),
      },
    });
  }

  async list(
    filter: AuditFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: AuditRow[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {
      resourceType: filter.resourceType,
      resourceId: filter.resourceId,
      actorId: filter.actorId,
      at: filter.from || filter.to ? { gte: filter.from, lte: filter.to } : undefined,
    };
    const [rawItems, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorIds = Array.from(
      new Set(rawItems.map((i) => i.actorId).filter((id): id is string => Boolean(id))),
    );
    const users =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, name: true, email: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items: AuditRow[] = rawItems.map((item) => {
      const user = item.actorId ? userMap.get(item.actorId) : undefined;
      return {
        ...item,
        actorName: user?.name ?? null,
        actorEmail: user?.email ?? null,
      };
    });

    return { items, total };
  }
}
