import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import type IORedis from 'ioredis';
import { CACHE_REDIS } from '../cache/redis.provider';
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
import {
  buildGoogleWalletPass,
  signCheckinToken,
  verifyCheckinToken,
} from './event-checkin-token.util';
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

import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailProviderPool } from '../notifications/email/email-provider-pool.service';
import { env } from '../config/env';
import type { DispatchTicketsInput } from './dto/dispatch-tickets.dto';

@Injectable()
export class EventsAdminService {
  constructor(
    private readonly repo: EventsAdminRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly attendance: AttendanceRecomputeTrigger,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    @Optional() private readonly emailPool?: EmailProviderPool,
    @Optional() @Inject(CACHE_REDIS) private readonly redis?: IORedis,
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

    if (input.coverUrl !== undefined && input.coverUrl !== existing.coverUrl && existing.coverUrl) {
      await this.storage.purgeAssetByUrl(existing.coverUrl).catch(() => {});
    }
    if (input.photos !== undefined && existing.photos && existing.photos.length > 0) {
      const newPhotosSet = new Set(input.photos);
      const removedPhotos = existing.photos.filter((p) => !newPhotosSet.has(p));
      for (const p of removedPhotos) {
        await this.storage.purgeAssetByUrl(p).catch(() => {});
      }
    }

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

    if (existing.coverUrl) {
      await this.storage.purgeAssetByUrl(existing.coverUrl).catch(() => {});
    }
    if (existing.photos && existing.photos.length > 0) {
      for (const p of existing.photos) {
        await this.storage.purgeAssetByUrl(p).catch(() => {});
      }
    }
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
      // 1. First check if it's a signed burner JWT check-in token
      const burnerPayload = verifyCheckinToken(input.qrToken);
      if (burnerPayload) {
        if (burnerPayload.eid !== eventId) {
          throw new BadRequestException('This QR pass is for a different event');
        }

        // Anti-replay check via Redis if available
        if (this.redis) {
          const replayKey = `checkin:jti:${burnerPayload.jti}`;
          const setOk = await this.redis.set(replayKey, '1', 'EX', 86400 * 7, 'NX');
          if (!setOk) {
            const existing = await this.repo.findCheckin(eventId, burnerPayload.mid);
            if (existing) return { row: existing, alreadyCheckedIn: true };
            throw new CodedConflictException(
              'TOKEN_REPLAYED',
              'This single-use QR pass has already been scanned',
            );
          }
        }

        const member = await this.repo.findMemberById(burnerPayload.mid);
        if (!member) throw new NotFoundException('Member profile for this pass not found');
        memberId = member.id;
        clubId = member.clubId;
        method = 'qr';
      } else {
        // 2. Fallback to static member QR token
        const member = await this.repo.findMemberIdByQrToken(input.qrToken);
        if (!member) throw new NotFoundException('Unknown QR code');
        memberId = member.id;
        clubId = member.clubId;
        method = 'qr';
      }
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

  async getTicket(ctx: RequestContext, eventId: string) {
    const event = await this.mustFind(eventId);
    const member = await this.repo.findMemberByUserId(ctx.user.id);
    if (!member) {
      throw new ForbiddenException('A verified member profile is required to generate an event pass');
    }

    const { token, expiresAt } = signCheckinToken(event.id, member.id);
    const wallet = buildGoogleWalletPass(event, member, token);

    return {
      token,
      expiresAt: expiresAt.toISOString(),
      event: {
        id: event.id,
        title: event.title,
        startsAt: event.startsAt.toISOString(),
        location: event.location,
      },
      member: {
        id: member.id,
        fullName: member.fullName,
        clubId: member.clubId,
        clubName: member.club?.name ?? 'Rotaract Club',
      },
      googleWalletUrl: wallet.saveUrl,
      passObject: wallet.passObject,
    };
  }

  async exportCheckinsCsv(
    ctx: RequestContext,
    eventId: string,
  ): Promise<{ filename: string; csv: string }> {
    const event = await this.mustFind(eventId);
    const clubScope = await this.scope.clubFilter(ctx.access, CHECKIN);
    const items = await this.repo.findCheckins(eventId, clubScope);

    const escapeCsv = (val: string | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const header = [
      'Attendee Name',
      'Club Name',
      'Check-in Method',
      'Checked In At (IST)',
      'Checked In By ID',
    ];
    const rows = items.map((item) => {
      const name = item.member?.fullName ?? item.walkInName ?? 'Attendee';
      const club = item.club?.name ?? 'District 3011';
      const method = item.method.toUpperCase();
      const timeIST = new Date(item.checkedInAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
      return [
        escapeCsv(name),
        escapeCsv(club),
        escapeCsv(method),
        escapeCsv(timeIST),
        escapeCsv(item.checkedInById),
      ].join(',');
    });

    const csv = [header.join(','), ...rows].join('\r\n');
    const filename = `checkins-${event.slug || event.id}.csv`;
    return { filename, csv };
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

  async dispatchTickets(
    ctx: RequestContext,
    eventId: string,
    dto: DispatchTicketsInput,
  ): Promise<{ recipientCount: number; dispatchedCount: number }> {
    const event = await this.mustFind(eventId);

    interface Recipient {
      email: string;
      fullName: string;
      memberId?: string;
      clubName?: string;
    }

    const recipients: Recipient[] = [];
    const seenEmails = new Set<string>();

    const addRecipient = (r: Recipient) => {
      const cleanEmail = r.email.toLowerCase().trim();
      if (!cleanEmail || seenEmails.has(cleanEmail)) return;
      seenEmails.add(cleanEmail);
      recipients.push({ ...r, email: cleanEmail });
    };

    if (dto.audience === 'custom_emails') {
      const emails = dto.customEmails ?? [];
      for (const email of emails) {
        const clean = email.toLowerCase().trim();
        if (!clean) continue;
        const existingProfile = await this.prisma.memberProfile.findFirst({
          where: { email: clean },
          include: { club: true },
        });
        addRecipient({
          email: clean,
          fullName: existingProfile?.fullName || 'Distinguished Rotaractor / Guest',
          memberId: existingProfile?.id,
          clubName: existingProfile?.club?.name || 'Rotaract District 3011',
        });
      }
    } else if (dto.audience === 'presidents') {
      const rows = await this.prisma.userRole.findMany({
        where: {
          role: { key: { in: ['president', 'club_president'] } },
        },
        include: {
          user: {
            include: { profile: { include: { club: true } } },
          },
        },
      });
      for (const r of rows) {
        if (r.user?.email && r.user?.profile) {
          addRecipient({
            email: r.user.email,
            fullName: r.user.profile.fullName,
            memberId: r.user.profile.id,
            clubName: r.user.profile.club?.name,
          });
        }
      }
    } else if (dto.audience === 'secretaries') {
      const rows = await this.prisma.userRole.findMany({
        where: {
          role: { key: { in: ['secretary', 'club_secretary'] } },
        },
        include: {
          user: {
            include: { profile: { include: { club: true } } },
          },
        },
      });
      for (const r of rows) {
        if (r.user?.email && r.user?.profile) {
          addRecipient({
            email: r.user.email,
            fullName: r.user.profile.fullName,
            memberId: r.user.profile.id,
            clubName: r.user.profile.club?.name,
          });
        }
      }
    } else if (dto.audience === 'dac_members') {
      const dacProfiles = await this.prisma.memberProfile.findMany({
        where: { isDacMember: true, status: 'approved' },
        include: { club: true },
      });
      for (const p of dacProfiles) {
        if (p.email) {
          addRecipient({
            email: p.email,
            fullName: p.fullName,
            memberId: p.id,
            clubName: p.club?.name,
          });
        }
      }
      const roleRows = await this.prisma.userRole.findMany({
        where: {
          role: {
            key: { in: ['dsc', 'drr', 'zrr', 'super_admin'] },
          },
        },
        include: {
          user: {
            include: { profile: { include: { club: true } } },
          },
        },
      });
      for (const r of roleRows) {
        if (r.user?.email && r.user?.profile) {
          addRecipient({
            email: r.user.email,
            fullName: r.user.profile.fullName,
            memberId: r.user.profile.id,
            clubName: r.user.profile.club?.name,
          });
        }
      }
    } else if (dto.audience === 'all_members') {
      const profiles = await this.prisma.memberProfile.findMany({
        where: {
          status: 'approved',
        },
        include: { club: true },
        take: 2000,
      });
      for (const p of profiles) {
        if (p.email) {
          addRecipient({
            email: p.email,
            fullName: p.fullName,
            memberId: p.id,
            clubName: p.club?.name,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return { recipientCount: 0, dispatchedCount: 0 };
    }

    const eventDate = new Date(event.startsAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const primaryOrigin = env.WEB_ORIGINS.find((o) => o.includes('testing')) || env.WEB_ORIGINS[0] || 'https://testing.rotaract3011.org';
    const baseUrl = primaryOrigin;

    // Trigger async email dispatch
    const sendBatch = async () => {
      for (const r of recipients) {
        try {
          const pseudoMid = r.memberId || `guest_${Buffer.from(r.email).toString('hex').slice(0, 16)}`;
          const { token } = signCheckinToken(event.id, pseudoMid);
          const ticketUrl = `${baseUrl}/portal/admin/events/${event.slug || event.id}/ticket?token=${token}`;

          const subject = `Your Official Entry Ticket: ${event.title} • Rotaract District 3011`;
          const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1.5px solid #F1F5F9; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.06);">
              <div style="background: linear-gradient(135deg, #123499 0%, #0C2470 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
                <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.8);">ROTARACT DISTRICT 3011 • OFFICIAL EVENT PASS</p>
                <h1 style="margin: 0; font-size: 24px; font-weight: 900; line-height: 1.25; color: #FFFFFF;">${event.title}</h1>
              </div>
              <div style="padding: 28px 24px;">
                <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 1.5;">
                  Dear <strong>${r.fullName}</strong>${r.clubName ? ` (${r.clubName})` : ''},
                </p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.5;">
                  Your secure dynamic entry pass for <strong>${event.title}</strong> is ready. Please present this pass or the digital QR code at the event gate for instant check-in.
                </p>
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #1E293B;">
                    <tr>
                      <td style="padding: 6px 0; font-weight: 700; color: #64748B; width: 90px;">Date & Time:</td>
                      <td style="padding: 6px 0; font-weight: 800;">${eventDate} IST</td>
                    </tr>
                    ${event.location ? `
                    <tr>
                      <td style="padding: 6px 0; font-weight: 700; color: #64748B;">Venue:</td>
                      <td style="padding: 6px 0; font-weight: 800;">${event.location}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding: 6px 0; font-weight: 700; color: #64748B;">Attendee:</td>
                      <td style="padding: 6px 0; font-weight: 800;">${r.fullName}</td>
                    </tr>
                  </table>
                </div>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${ticketUrl}" style="background: #D81B60; color: #FFFFFF; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; box-shadow: 0 6px 20px rgba(216, 27, 96, 0.35);">
                    Open Digital Entry Pass
                  </a>
                </div>
                <div style="background: #FFF0F5; border-radius: 10px; padding: 12px; border: 1px dashed rgba(216, 27, 96, 0.3); font-size: 12px; color: #9F1239; line-height: 1.4; text-align: center;">
                  <strong>Fast-Track Gate Verification:</strong> Have your pass screen brightness turned up when approaching entry scanners.
                </div>
              </div>
              <div style="background: #F8FAFC; padding: 16px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
                Rotaract District Organization 3011 • Delhi NCR & Surrounding Areas<br/>
                This is an automated system notification.
              </div>
            </div>
          `;

          const text = `Rotaract District 3011 Entry Pass\nEvent: ${event.title}\nDate: ${eventDate}\nAttendee: ${r.fullName}\nPass Link: ${ticketUrl}`;

          if (this.emailPool) {
            await this.emailPool.send({
              to: r.email,
              subject,
              html,
              text,
            });
          }
        } catch {
          // continue
        }
      }
    };

    void sendBatch();

    return {
      recipientCount: recipients.length,
      dispatchedCount: recipients.length,
    };
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
