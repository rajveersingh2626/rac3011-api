import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CodedConflictException } from '../common/errors/conflict.error';
import { ScopeService } from '../common/scope/scope.service';
import type { RequestContext, ResolvedAccess } from '../common/types/access';
import type { PermissionKey } from '../common/types/permission-keys';
import { MeService } from '../me/me.service';
import { slugify } from '../showcase/slug.util';
import { AttendanceRecomputeTrigger } from './attendance-recompute.trigger';
import type { CreateEventInput } from './dto/create-event.dto';
import type { UpdateEventInput } from './dto/update-event.dto';
import type { CheckinInput } from './dto/checkin.dto';
import { EventsAdminRepository } from './events-admin.repository';
import type {
  CheckinMethod,
  CheckinRow,
  ClubAttendanceCount,
  EventListFilter,
  EventRow,
  RsvpStatus,
} from './events-admin.types';

const MANAGE = 'events:manage' as const;
const CLUB_LOG = 'club_events:log' as const;
const CHECKIN = 'events:checkin' as const;

function hasGrant(access: ResolvedAccess, permission: PermissionKey): boolean {
  return access.isSuperAdmin || (access.grants[permission] ?? []).length > 0;
}

export type EventDecorated = EventRow & {
  myRsvp?: RsvpStatus | null;
  goingCount?: number;
  checkinCount?: number;
};

@Injectable()
export class EventsAdminService {
  constructor(
    private readonly repo: EventsAdminRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly attendance: AttendanceRecomputeTrigger,
  ) {}

  async list(
    ctx: RequestContext,
    filter: EventListFilter,
    includes: string[],
    page: number,
    pageSize: number,
  ): Promise<{ items: EventDecorated[]; total: number }> {
    const scope = await this.scope.clubFilterAny(ctx.access, [MANAGE, CLUB_LOG]);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    const { items, total } = await this.repo.findMany(filter, narrowed, page, pageSize);
    const profile = await this.me.getProfile(ctx);
    const decorated = await Promise.all(
      items.map((row) => this.decorate(ctx, row, includes, profile?.id)),
    );
    return { items: decorated, total };
  }

  async get(ctx: RequestContext, id: string, includes: string[]): Promise<EventDecorated> {
    const row = await this.mustFind(id);
    await this.assertCanRead(ctx.access, row);
    const profile = await this.me.getProfile(ctx);
    return this.decorate(ctx, row, includes, profile?.id);
  }

  async create(ctx: RequestContext, input: CreateEventInput): Promise<EventRow> {
    const startsAt = new Date(input.startsAt);
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const canManage = hasGrant(ctx.access, MANAGE);

    let clubId = input.clubId ?? null;
    let projectKey = input.projectKey ?? null;
    let isDistrictEvent: boolean;

    if (canManage) {
      isDistrictEvent = input.isDistrictEvent ?? true;
      if (isDistrictEvent && clubId) {
        await this.scope.assertCanAccessClub(ctx.access, MANAGE, clubId);
      }
    } else {
      if (!hasGrant(ctx.access, CLUB_LOG)) throw new ForbiddenException();
      if (input.isDistrictEvent === true) {
        throw new ForbiddenException(
          'club_events:log can only log club events, not district events',
        );
      }
      const profile = await this.me.getProfile(ctx);
      if (!profile) throw new BadRequestException('No member profile for this account');
      if (clubId && clubId !== profile.clubId) throw new NotFoundException();
      await this.scope.assertCanAccessClub(ctx.access, CLUB_LOG, profile.clubId);
      isDistrictEvent = false;
      clubId = profile.clubId;
      projectKey = null;
    }

    if (!isDistrictEvent && !clubId) {
      throw new BadRequestException('clubId is required for a club event');
    }

    const slug = input.slug
      ? await this.uniqueSlug(input.slug)
      : await this.uniqueSlug(input.title);
    const created = await this.repo.create({
      title: input.title,
      slug,
      startsAt,
      endsAt,
      location: input.location ?? null,
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      isDistrictEvent,
      clubId,
      projectKey,
      rsvpOpen: input.rsvpOpen ?? true,
      capacity: input.capacity ?? null,
      photos: input.photos ?? [],
      createdById: ctx.user.id,
    });
    return created;
  }

  async update(ctx: RequestContext, id: string, input: UpdateEventInput): Promise<EventRow> {
    const existing = await this.mustFind(id);
    const canManage = hasGrant(ctx.access, MANAGE);

    if (existing.isDistrictEvent) {
      if (!canManage) throw new NotFoundException();
    } else {
      const clubId = existing.clubId as string;
      const allowed = await this.scope.canAccessClubAny(ctx.access, [MANAGE, CLUB_LOG], clubId);
      if (!allowed) throw new NotFoundException();
    }

    if (!canManage) {
      if (
        (input.isDistrictEvent !== undefined &&
          input.isDistrictEvent !== existing.isDistrictEvent) ||
        (input.clubId !== undefined && input.clubId !== existing.clubId) ||
        (input.projectKey !== undefined && input.projectKey !== existing.projectKey)
      ) {
        throw new ForbiddenException('Only events:manage can change event ownership');
      }
    }

    const slug = input.slug ? await this.uniqueSlug(input.slug, existing.id) : undefined;
    const updated = await this.repo.update(id, {
      title: input.title,
      slug,
      startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
      endsAt: input.endsAt === undefined ? undefined : input.endsAt ? new Date(input.endsAt) : null,
      location: input.location,
      description: input.description,
      coverUrl: input.coverUrl,
      isDistrictEvent: canManage ? input.isDistrictEvent : undefined,
      clubId: canManage ? input.clubId : undefined,
      projectKey: canManage ? input.projectKey : undefined,
      rsvpOpen: input.rsvpOpen,
      capacity: input.capacity,
      photos: input.photos,
    });
    return updated;
  }

  async remove(ctx: RequestContext, id: string): Promise<void> {
    const existing = await this.mustFind(id);
    if (existing.isDistrictEvent) {
      if (!hasGrant(ctx.access, MANAGE)) throw new NotFoundException();
    } else {
      const allowed = await this.scope.canAccessClubAny(
        ctx.access,
        [MANAGE, CLUB_LOG],
        existing.clubId as string,
      );
      if (!allowed) throw new NotFoundException();
    }
    await this.repo.remove(id);
  }

  async rsvp(
    ctx: RequestContext,
    eventId: string,
    status: RsvpStatus,
  ): Promise<{ eventId: string; memberId: string; status: RsvpStatus }> {
    const event = await this.mustFind(eventId);
    if (!event.rsvpOpen) {
      throw new CodedConflictException('INVALID_TRANSITION', 'RSVP is closed for this event');
    }
    const profile = await this.me.getProfile(ctx);
    if (!profile) throw new BadRequestException('No member profile for this account');
    const row = await this.repo.upsertRsvp(eventId, profile.id, status);
    return { eventId: row.eventId, memberId: row.memberId, status: row.status };
  }

  async listCheckins(
    ctx: RequestContext,
    eventId: string,
  ): Promise<{ items: CheckinRow[]; byClub: ClubAttendanceCount[] }> {
    await this.mustFind(eventId);
    const clubScope = await this.scope.clubFilter(ctx.access, CHECKIN);
    if ('clubIds' in clubScope && clubScope.clubIds.length === 0) return { items: [], byClub: [] };
    const [items, byClub] = await Promise.all([
      this.repo.findCheckins(eventId, clubScope),
      this.repo.findClubCounts(eventId, clubScope),
    ]);
    return { items, byClub };
  }

  async checkin(
    ctx: RequestContext,
    eventId: string,
    input: CheckinInput,
  ): Promise<{ row: CheckinRow; alreadyCheckedIn: boolean }> {
    const event = await this.mustFind(eventId);

    let memberId: string | null = null;
    let clubId: string;
    let walkInName: string | null = null;
    let method: CheckinMethod;

    if (input.qrToken !== undefined) {
      const member = await this.repo.findMemberIdByQrToken(input.qrToken);
      if (!member) throw new NotFoundException('Unknown QR code');
      memberId = member.id;
      clubId = member.clubId;
      method = 'qr';
    } else if (input.memberId !== undefined) {
      const member = await this.repo.findMemberById(input.memberId);
      if (!member) throw new NotFoundException('Unknown member');
      memberId = member.id;
      clubId = member.clubId;
      method = 'manual';
    } else if (input.walkInName !== undefined && input.clubId !== undefined) {
      const clubExists = await this.repo.findClubIdById(input.clubId);
      if (!clubExists) throw new BadRequestException('Unknown club');
      clubId = input.clubId;
      walkInName = input.walkInName;
      method = 'walk_in';
    } else {
      throw new BadRequestException('Provide qrToken, memberId, or walkInName+clubId');
    }

    await this.scope.assertCanAccessClub(ctx.access, CHECKIN, clubId);

    if (memberId) {
      const existing = await this.repo.findCheckin(eventId, memberId);
      if (existing) return { row: existing, alreadyCheckedIn: true };
    }

    if (event.capacity != null) {
      const count = await this.repo.countCheckins(eventId);
      if (count >= event.capacity) {
        throw new CodedConflictException('CAPACITY_FULL', 'This event has reached its capacity');
      }
    }

    const row = await this.repo.createCheckin({
      eventId,
      memberId,
      walkInName,
      clubId,
      method,
      checkedInById: ctx.user.id,
    });

    if (event.isDistrictEvent) await this.attendance.schedule(eventId, clubId);

    return { row, alreadyCheckedIn: false };
  }

  private async assertCanRead(access: ResolvedAccess, row: EventRow): Promise<void> {
    if (row.isDistrictEvent) return;
    const allowed = await this.scope.canAccessClubAny(
      access,
      [MANAGE, CLUB_LOG],
      row.clubId as string,
    );
    if (!allowed) throw new NotFoundException();
  }

  private async decorate(
    ctx: RequestContext,
    row: EventRow,
    includes: string[],
    memberId: string | undefined,
  ): Promise<EventDecorated> {
    const out: EventDecorated = { ...row };
    if (includes.includes('rsvp')) {
      out.goingCount = await this.repo.countRsvpGoing(row.id);
      out.myRsvp = memberId ? await this.repo.findRsvpForMember(row.id, memberId) : null;
    }
    if (includes.includes('attendance')) {
      const scope = await this.scope.clubFilterAny(ctx.access, [MANAGE, CLUB_LOG, CHECKIN]);
      if ('all' in scope) {
        out.checkinCount = await this.repo.countCheckins(row.id);
      } else if (scope.clubIds.length > 0) {
        const counts = await this.repo.findClubCounts(row.id, scope);
        out.checkinCount = counts.reduce((sum, c) => sum + c.count, 0);
      } else {
        out.checkinCount = 0;
      }
    }
    return out;
  }

  private async mustFind(id: string): Promise<EventRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  private async uniqueSlug(seed: string, excludeId?: string): Promise<string> {
    const base = slugify(seed);
    let candidate = base;
    let n = 2;
    for (;;) {
      const exists = await this.repo.slugExists(candidate);
      if (!exists) return candidate;
      const row = excludeId ? await this.repo.findById(excludeId) : null;
      if (row && row.slug === candidate) return candidate;
      candidate = `${base}-${n}`;
      n += 1;
    }
  }
}
