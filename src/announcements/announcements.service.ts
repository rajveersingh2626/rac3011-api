import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import type { RequestContext, ResolvedAccess } from '../common/types/access';
import { NotificationPort } from '../notifications/notification.port';
import { AnnouncementsRepository } from './announcements.repository';
import { isEmptyAudience, resolveRoleHolders } from './audience-resolver';
import type { AnnouncementAudience, AnnouncementRow } from './announcements.types';
import type { CreateAnnouncementInput } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly repo: AnnouncementsRepository,
    private readonly scope: ScopeService,
    private readonly notifications: NotificationPort,
  ) {}

  async feed(
    ctx: RequestContext,
    page: number,
    pageSize: number,
  ): Promise<{ items: AnnouncementRow[]; total: number }> {
    const userContext = await this.repo.findUserAudienceContext(ctx.user.id);
    return this.repo.findFeed(ctx.user.id, page, pageSize, userContext);
  }

  async estimate(ctx: RequestContext, audience: AnnouncementAudience): Promise<number> {
    if (isEmptyAudience(audience)) throw new BadRequestException('Audience cannot be empty');
    await this.assertCanSendTo(ctx.access, audience);
    const userIds = await this.resolveAudience(audience);
    return userIds.size;
  }

  async send(ctx: RequestContext, input: CreateAnnouncementInput): Promise<AnnouncementRow> {
    if (isEmptyAudience(input.audience)) throw new BadRequestException('Audience cannot be empty');
    await this.assertCanSendTo(ctx.access, input.audience);

    const created = await this.repo.create({
      title: input.title,
      body: input.body,
      audience: input.audience,
      channels: input.channels,
      createdById: ctx.user.id,
    });

    const userIds = await this.resolveAudience(input.audience);
    if (userIds.size > 0) {
      await this.notifications.notify({
        template: 'announcement',
        to: [...userIds].map((userId) => ({ userId })),
        data: { title: input.title, body: input.body, senderName: ctx.user.name },
        channels: input.channels.filter((c): c is 'email' | 'push' => c !== 'portal'),
      });
    }
    await this.repo.markSent(created.id, userIds.size);
    return { ...created, sentAt: new Date(), recipientCount: userIds.size };
  }

  private async resolveAudience(audience: AnnouncementAudience): Promise<Set<string>> {
    const result = new Set<string>();
    if (audience.roleKeys?.length) {
      const candidates = await this.repo.findRoleHolderCandidates(audience.roleKeys);
      for (const userId of resolveRoleHolders(candidates, audience)) result.add(userId);
    } else if (audience.zoneIds?.length || audience.clubIds?.length) {
      // Rahul, 2026-09-05: with no roleKeys, clubIds/zoneIds select every approved member of
      // those clubs/zones directly, not nobody (corrects the original spec §6.6 reading).
      const userIds = await this.repo.findMemberUserIdsInClubsOrZones(
        audience.clubIds ?? [],
        audience.zoneIds ?? [],
      );
      for (const userId of userIds) result.add(userId);
    }
    if (audience.memberIds?.length) {
      for (const userId of await this.repo.findUserIdsForMemberIds(audience.memberIds)) {
        result.add(userId);
      }
    }
    return result;
  }

  // A club/zone-scoped sender may only target audiences inside their own scope, and can
  // never send an unrestricted roleKeys-only audience (that would reach the whole district).
  private async assertCanSendTo(
    access: ResolvedAccess,
    audience: AnnouncementAudience,
  ): Promise<void> {
    if (access.isSuperAdmin) return;
    if ((access.grants['announcements:send_all'] ?? []).some((s) => s.type === 'none')) return;

    const allowed = await this.scope.clubFilterAny(access, [
      'announcements:send',
      'announcements:send_all',
    ]);
    if ('all' in allowed) return;
    if (allowed.clubIds.length === 0) throw new ForbiddenException();

    const hasZoneOrClub =
      (audience.zoneIds?.length ?? 0) > 0 || (audience.clubIds?.length ?? 0) > 0;
    if (audience.roleKeys?.length && !hasZoneOrClub) {
      throw new ForbiddenException('A club-scoped sender must target specific clubs or zones');
    }
    for (const clubId of audience.clubIds ?? []) {
      if (!allowed.clubIds.includes(clubId)) throw new ForbiddenException();
    }
    if (audience.zoneIds?.length) {
      const clubsInZones = await this.scope.clubIdsInZones(audience.zoneIds);
      // every club in the requested zone(s) must be in the sender's own scope, not just one —
      // a club-scoped sender's single club overlapping a zone must not unlock the whole zone.
      if (!clubsInZones.every((id) => allowed.clubIds.includes(id))) throw new ForbiddenException();
    }
    if (audience.memberIds?.length) {
      const clubIdByMemberId = await this.repo.findClubIdsForMemberIds(audience.memberIds);
      for (const memberId of audience.memberIds) {
        const clubId = clubIdByMemberId.get(memberId);
        if (!clubId || !allowed.clubIds.includes(clubId)) throw new ForbiddenException();
      }
    }
  }
}
