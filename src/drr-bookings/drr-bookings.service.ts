import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CodedConflictException } from '../common/errors/conflict.error';
import { ScopeService } from '../common/scope/scope.service';
import type { RequestContext } from '../common/types/access';
import { NotificationPort } from '../notifications/notification.port';
import { buildBookingReference } from './booking-reference.util';
import type { CreateDrrBookingInput } from './dto/create-drr-booking.dto';
import type { DecideDrrBookingInput } from './dto/decide-drr-booking.dto';
import { DrrBookingsRepository } from './drr-bookings.repository';
import { CacheInvalidator } from '../cache/cache-invalidator.service';
import {
  DuplicateBookingReferenceError,
  type DrrBookingListFilter,
  type DrrBookingRow,
} from './drr-bookings.types';

const OFFICER_PERMISSION = 'drr_calendar:manage';
const REFERENCE_ATTEMPTS = 5;

@Injectable()
export class DrrBookingsService {
  private readonly logger = new Logger('DrrBookings');

  constructor(
    private readonly repo: DrrBookingsRepository,
    private readonly notifications: NotificationPort,
    private readonly audit: AuditService,
    private readonly scope: ScopeService,
    private readonly cache: CacheInvalidator,
  ) {}

  async submit(
    input: CreateDrrBookingInput,
  ): Promise<{ reference: string; status: string } | { honeypot: true }> {
    if (input.website) return { honeypot: true };

    if (input.clubId && !(await this.repo.clubExists(input.clubId)))
      throw new BadRequestException('Unknown club');

    const row = await this.createWithReference(input);
    // The booking is persisted; the visitor must still get their reference if the queue is down.
    try {
      await this.notifyOfficers(row);
    } catch (err) {
      this.logger.error(
        `booking ${row.reference} saved but officer notification failed: ${(err as Error).message}`,
      );
    }
    return { reference: row.reference, status: row.status };
  }

  async byReference(reference: string): Promise<DrrBookingRow> {
    const row = await this.repo.findByReference(reference);
    if (!row) throw new NotFoundException();
    return row;
  }

  async get(ctx: RequestContext, id: string): Promise<DrrBookingRow> {
    this.assertOfficer(ctx);
    return this.findOrThrow(id);
  }

  list(
    ctx: RequestContext,
    filter: DrrBookingListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DrrBookingRow[]; total: number }> {
    this.assertOfficer(ctx);
    return this.repo.findMany(filter, page, pageSize);
  }

  async decide(
    ctx: RequestContext,
    id: string,
    input: DecideDrrBookingInput,
  ): Promise<DrrBookingRow> {
    this.assertOfficer(ctx);
    const before = await this.findOrThrow(id);

    const row = await this.repo.decide(id, {
      status: input.status,
      decisionReason: input.decisionReason ?? null,
      decidedById: ctx.user.id,
    });
    if (!row) {
      throw new CodedConflictException(
        'INVALID_TRANSITION',
        `A booking that is already ${before.status} cannot be ${input.status}`,
      );
    }

    await this.audit.record({
      actorId: ctx.user.id,
      action: `drr_booking.${input.status}`,
      resourceType: 'drr_booking',
      resourceId: id,
      before,
      after: row,
    });

    if (input.status === 'confirmed') {
      try {
        await this.repo.syncToCalendarEvent(row, ctx.user.id);
      } catch (err) {
        this.logger.error(`failed to sync booking ${row.reference} to events calendar: ${(err as Error).message}`);
      }
    } else if (input.status === 'declined') {
      try {
        await this.repo.removeCalendarEvent(row.reference);
      } catch (err) {
        this.logger.error(`failed to remove booking ${row.reference} from events calendar: ${(err as Error).message}`);
      }
    }

    // The decision is already committed and audited; a queue outage must not 500 the officer.
    try {
      await this.notifications.notify({
        template: input.status === 'confirmed' ? 'booking-confirmed' : 'booking-declined',
        to: [{ email: row.requesterEmail }],
        data: {
          reference: row.reference,
          startsAt: row.startsAt.toISOString(),
          purpose: row.purpose,
          decisionReason: row.decisionReason ?? '',
        },
      });
    } catch (err) {
      this.logger.error(
        `booking ${row.reference} decided but requester notification failed: ${(err as Error).message}`,
      );
    }

    try {
      await this.cache.purge(['drr-calendar', 'events']);
    } catch (err) {
      this.logger.warn(`failed to purge cache after booking decision: ${(err as Error).message}`);
    }

    return row;
  }

  // The DRR calendar is district-wide, so a club/zone-scoped grant is refused outright
  // rather than silently widened by the permission guard.
  private assertOfficer(ctx: RequestContext): void {
    this.scope.assertDistrictScope(ctx.access, OFFICER_PERMISSION);
  }

  private async findOrThrow(id: string): Promise<DrrBookingRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  private async createWithReference(input: CreateDrrBookingInput): Promise<DrrBookingRow> {
    for (let attempt = 1; attempt <= REFERENCE_ATTEMPTS; attempt += 1) {
      try {
        return await this.repo.create({
          reference: buildBookingReference(new Date()),
          purpose: input.purpose,
          clubId: input.clubId ?? null,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          requesterPhone: input.requesterPhone,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          notes: input.notes ?? null,
        });
      } catch (err) {
        if (!(err instanceof DuplicateBookingReferenceError)) throw err;
        if (attempt === REFERENCE_ATTEMPTS) {
          this.logger.error(
            `gave up allocating a booking reference after ${REFERENCE_ATTEMPTS} collisions`,
          );
          throw new InternalServerErrorException('Could not allocate a booking reference');
        }
      }
    }
    throw new InternalServerErrorException('Could not allocate a booking reference');
  }

  async listBlocks(from?: Date, to?: Date) {
    const rows = await this.repo.listBlocks(from, to);
    return rows.map((b) => ({
      id: b.id,
      date: b.startsAt.toISOString().split('T')[0],
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      reason: b.reason ?? null,
      createdById: b.createdById,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  }

  async createBlock(
    actorId: string,
    input: { date?: string; startsAt?: string; endsAt?: string; reason?: string },
  ) {
    let startsAt: Date;
    let endsAt: Date;

    if (input.date) {
      const dateStr = input.date.trim();
      startsAt = new Date(`${dateStr}T00:00:00.000Z`);
      endsAt = new Date(`${dateStr}T23:59:59.999Z`);
    } else if (input.startsAt && input.endsAt) {
      startsAt = new Date(input.startsAt);
      endsAt = new Date(input.endsAt);
    } else {
      throw new BadRequestException('Either date or startsAt/endsAt is required');
    }

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const block = await this.repo.createBlock({
      startsAt,
      endsAt,
      reason: input.reason,
      createdById: actorId,
    });

    await this.audit.record({
      actorId,
      action: 'drr_calendar.block_created',
      resourceType: 'drr_block',
      resourceId: block.id,
      after: block,
    });

    try {
      await this.cache.purge(['drr-calendar']);
    } catch (err) {
      this.logger.warn(`failed to purge cache after block creation: ${(err as Error).message}`);
    }

    return {
      id: block.id,
      date: block.startsAt.toISOString().split('T')[0],
      startsAt: block.startsAt.toISOString(),
      endsAt: block.endsAt.toISOString(),
      reason: block.reason ?? null,
      createdById: block.createdById,
      createdAt: block.createdAt.toISOString(),
      updatedAt: block.updatedAt.toISOString(),
    };
  }

  async deleteBlock(actorId: string, id: string) {
    await this.repo.deleteBlock(id);
    await this.audit.record({
      actorId,
      action: 'drr_calendar.block_deleted',
      resourceType: 'drr_block',
      resourceId: id,
    });
    try {
      await this.cache.purge(['drr-calendar']);
    } catch (err) {
      this.logger.warn(`failed to purge cache after block deletion: ${(err as Error).message}`);
    }
  }

  async getPublicCalendar(from?: Date, to?: Date) {
    const defaultFrom = from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const defaultTo = to ?? new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

    const [confirmed, blocks] = await Promise.all([
      this.repo.findConfirmedBookings(defaultFrom, defaultTo),
      this.repo.listBlocks(defaultFrom, defaultTo),
    ]);

    const capacityPerDay = 2;
    const confirmedCountByDate: Record<string, number> = {};
    for (const c of confirmed) {
      const dateKey = c.startsAt.toISOString().split('T')[0];
      confirmedCountByDate[dateKey] = (confirmedCountByDate[dateKey] ?? 0) + 1;
    }

    const blockedDatesMap: Record<string, string | undefined> = {};
    const blockedDatesList: { date: string; reason?: string | null }[] = [];
    for (const b of blocks) {
      const dateKey = b.startsAt.toISOString().split('T')[0];
      blockedDatesMap[dateKey] = b.reason ?? undefined;
      blockedDatesList.push({ date: dateKey, reason: b.reason ?? null });
    }

    const confirmedDatesList = Object.entries(confirmedCountByDate).map(([date, count]) => ({
      date,
      count,
    }));

    // Build dayStatus map across all relevant dates
    const dayStatus: Record<
      string,
      { blocked: boolean; reason?: string; bookedCount: number; slotsRemaining: number }
    > = {};

    const allDateKeys = new Set([
      ...Object.keys(confirmedCountByDate),
      ...Object.keys(blockedDatesMap),
    ]);

    for (const dateKey of allDateKeys) {
      const isBlocked = blockedDatesMap[dateKey] !== undefined;
      const bookedCount = confirmedCountByDate[dateKey] ?? 0;
      const slotsRemaining = isBlocked ? 0 : Math.max(0, capacityPerDay - bookedCount);

      dayStatus[dateKey] = {
        blocked: isBlocked,
        reason: blockedDatesMap[dateKey],
        bookedCount,
        slotsRemaining,
      };
    }

    return {
      capacityPerDay,
      dailyCapacity: capacityPerDay,
      from: defaultFrom.toISOString(),
      to: defaultTo.toISOString(),
      blockedDates: blockedDatesList,
      confirmedDates: confirmedDatesList,
      dayStatus,
      confirmed: confirmed.map((c) => ({
        id: c.id,
        reference: c.reference,
        purpose: c.purpose,
        clubName: c.club?.shortName || c.club?.name || 'Rotaract Club',
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt.toISOString(),
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        date: b.startsAt.toISOString().split('T')[0],
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        reason: b.reason || 'Blocked',
      })),
    };
  }

  private async notifyOfficers(row: DrrBookingRow): Promise<void> {
    const officers = await this.repo.findOfficers(OFFICER_PERMISSION);
    if (officers.length === 0) {
      this.logger.warn(`booking ${row.reference} has no ${OFFICER_PERMISSION} holder to notify`);
      return;
    }
    await this.notifications.notify({
      template: 'booking-requested',
      to: officers.map((o) => ({ userId: o.userId, email: o.email ?? undefined })),
      data: {
        reference: row.reference,
        requesterName: row.requesterName,
        purpose: row.purpose,
        startsAt: row.startsAt.toISOString(),
      },
    });
  }
}
