import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import { NotificationPort } from '../../notifications/notification.port';
import { PointsEngineService } from '../../points/engine/points-engine.service';
import type { CreateDelegationInput } from './dto/create-delegation.dto';
import type { UpdateDelegationInput } from './dto/update-delegation.dto';
import type { AssignHostsInput } from './dto/assign-hosts.dto';
import { RideDelegationsRepository } from './ride-delegations.repository';
import type { DelegationListFilter, DelegationRow } from './ride.types';

export const MANAGE_PERMISSION = 'subdomain:ride:manage' as const;
export const RIDE_HOST_ASSIGNED_TRIGGER = 'ride.host_assigned' as const;

@Injectable()
export class RideDelegationsService {
  constructor(
    private readonly repo: RideDelegationsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
    private readonly pointsEngine: PointsEngineService,
  ) {}

  list(
    filter: DelegationListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DelegationRow[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  listIncoming(): Promise<DelegationRow[]> {
    return this.repo.findIncoming();
  }

  async get(id: string): Promise<DelegationRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(ctx: RequestContext, input: CreateDelegationInput): Promise<DelegationRow> {
    this.assertManage(ctx);
    return this.repo.create({
      ryYear: input.ryYear,
      visitingDistrict: input.visitingDistrict,
      country: input.country,
      startsAt: new Date(`${input.startsAt}T00:00:00Z`),
      endsAt: new Date(`${input.endsAt}T00:00:00Z`),
      headcount: input.headcount,
      contactName: input.contactName,
      contactEmail: input.contactEmail ?? null,
      status: input.status,
    });
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: UpdateDelegationInput,
  ): Promise<DelegationRow> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    return this.repo.update(id, {
      visitingDistrict: input.visitingDistrict,
      country: input.country,
      startsAt: input.startsAt ? new Date(`${input.startsAt}T00:00:00Z`) : undefined,
      endsAt: input.endsAt ? new Date(`${input.endsAt}T00:00:00Z`) : undefined,
      headcount: input.headcount,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      status: input.status,
    });
  }

  async assignHosts(
    ctx: RequestContext,
    id: string,
    input: AssignHostsInput,
  ): Promise<DelegationRow> {
    this.assertManage(ctx);
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    const requestedClubIds = input.hosts.map((h) => h.clubId);
    const validIds = await this.repo.findExistingClubIds(requestedClubIds);
    const invalid = requestedClubIds.filter((cid) => !validIds.has(cid));
    if (invalid.length > 0)
      throw new BadRequestException(`Unknown club id(s): ${invalid.join(', ')}`);

    const before = existing.hosts.map((h) => ({
      clubId: h.clubId,
      daysHosted: h.daysHosted,
      membersSent: h.membersSent,
    }));

    const { affectedClubIds } = await this.repo.replaceHosts(id, input.hosts, ctx.user.id);

    await this.audit.record({
      actorId: ctx.user.id,
      action: 'ride.delegation.hosts_assigned',
      resourceType: 'ride_delegation',
      resourceId: id,
      before: { hosts: before },
      after: { hosts: input.hosts },
    });

    for (const clubId of affectedClubIds) {
      await this.pointsEngine.recompute({
        clubId,
        ryYear: existing.ryYear,
        trigger: RIDE_HOST_ASSIGNED_TRIGGER,
      });
    }

    if (input.hosts.length > 0) {
      const to: { userId: string }[] = [];
      for (const host of input.hosts) {
        const officerIds = await this.repo.findClubOfficerUserIds(host.clubId);
        for (const userId of officerIds) to.push({ userId });
      }
      if (to.length > 0) {
        await this.notifications.notify({
          template: 'ride-host-assigned',
          to,
          data: {
            delegationId: id,
            visitingDistrict: existing.visitingDistrict,
            country: existing.country,
            startsAt: existing.startsAt.toISOString().slice(0, 10),
            endsAt: existing.endsAt.toISOString().slice(0, 10),
          },
        });
      }
    }

    return this.get(id);
  }

  private assertManage(ctx: RequestContext): void {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, MANAGE_PERMISSION, 'ride');
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
