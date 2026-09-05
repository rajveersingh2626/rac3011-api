import { Injectable } from '@nestjs/common';
import type { NotificationOutbox, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATIONS_MAX_ATTEMPTS } from './notifications.constants';
import type { TemplateKey } from './notification.port';

export type OutboxStatus = 'queued' | 'sent' | 'failed';

export type OutboxRow = {
  id: string;
  toUserId: string | null;
  toAddress: string;
  template: string;
  subject: string | null;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  provider: string | null;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
};

export type QueuedOutboxInput = {
  toUserId?: string;
  toAddress: string;
  template: TemplateKey;
  subject: string;
  payload: Record<string, unknown>;
};

function toRow(raw: NotificationOutbox): OutboxRow {
  return {
    id: raw.id,
    toUserId: raw.toUserId,
    toAddress: raw.toAddress,
    template: raw.template,
    subject: raw.subject,
    payload: raw.payload as Record<string, unknown>,
    status: raw.status,
    provider: raw.provider,
    attempts: raw.attempts,
    lastError: raw.lastError,
    sentAt: raw.sentAt,
  };
}

@Injectable()
export class NotificationOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQueued(rows: QueuedOutboxInput[]): Promise<string[]> {
    if (rows.length === 0) return [];
    const created = await this.prisma.$transaction(
      rows.map((row) =>
        this.prisma.notificationOutbox.create({
          data: {
            // push is out of scope for this task; every row this repository creates is email.
            channel: 'email',
            toUserId: row.toUserId,
            toAddress: row.toAddress,
            template: row.template,
            subject: row.subject,
            payload: row.payload as Prisma.InputJsonValue,
            status: 'queued',
          },
          select: { id: true },
        }),
      ),
    );
    return created.map((r) => r.id);
  }

  async findById(id: string): Promise<OutboxRow | null> {
    const raw = await this.prisma.notificationOutbox.findUnique({ where: { id } });
    return raw ? toRow(raw) : null;
  }

  async markSent(id: string, provider: string): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date(), provider },
    });
  }

  async recordFailedAttempt(id: string, error: string, final: boolean): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
        lastError: error,
        status: final ? 'failed' : 'queued',
      },
    });
  }

  async findStaleQueued(olderThan: Date, limit: number): Promise<OutboxRow[]> {
    const rows = await this.prisma.notificationOutbox.findMany({
      where: {
        status: 'queued',
        createdAt: { lt: olderThan },
        attempts: { lt: NOTIFICATIONS_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(toRow);
  }

  async findUserEmails(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();
    const rows = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    return new Map(rows.map((r) => [r.id, r.email]));
  }
}
