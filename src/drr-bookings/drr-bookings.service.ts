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
