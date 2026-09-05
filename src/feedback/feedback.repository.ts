import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  FeedbackCreateInput,
  FeedbackListFilter,
  FeedbackRow,
  FeedbackStatus,
} from './feedback.types';

@Injectable()
export class FeedbackRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: FeedbackCreateInput): Promise<FeedbackRow> {
    return this.prisma.feedback.create({ data: input });
  }

  async findById(id: string): Promise<FeedbackRow | null> {
    return this.prisma.feedback.findUnique({ where: { id } });
  }

  async findMine(
    submittedById: string,
    page: number,
    pageSize: number,
  ): Promise<{ items: FeedbackRow[]; total: number }> {
    const where: Prisma.FeedbackWhereInput = { submittedById };
    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return { items: items, total };
  }

  async findMany(
    filter: FeedbackListFilter,
    scope: ClubScopeFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: FeedbackRow[]; total: number }> {
    const where: Prisma.FeedbackWhereInput = {
      ...('all' in scope ? {} : { clubId: { in: scope.clubIds } }),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
      ...(filter.clubId ? { clubId: filter.clubId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.feedback.count({ where }),
    ]);
    return { items: items, total };
  }

  async update(
    id: string,
    input: { status?: FeedbackStatus; reply?: string; reviewedById?: string; reviewedAt?: Date },
  ): Promise<FeedbackRow> {
    return this.prisma.feedback.update({ where: { id }, data: input });
  }

  async eventExists(eventId: string): Promise<boolean> {
    const row = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    return !!row;
  }

  async findUserEmail(userId: string): Promise<string | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return row?.email ?? null;
  }
}
