import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { ScopeService } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import { MeService } from '../../me/me.service';
import { NotificationPort } from '../../notifications/notification.port';
import type { CreateCampInput } from './dto/create-camp.dto';
import type { UpdateCampInput } from './dto/update-camp.dto';
import { Mission3011CampsRepository } from './mission3011-camps.repository';
import type { CampListFilter, CampRow } from './mission3011.types';

const MANAGE_PERMISSION = 'subdomain:mission3011:manage' as const;

@Injectable()
export class Mission3011CampsService {
  constructor(
    private readonly repo: Mission3011CampsRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationPort,
  ) {}

  list(
    filter: CampListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: CampRow[]; total: number }> {
    return this.repo.findMany(filter, page, pageSize);
  }

  async get(id: string): Promise<CampRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    return row;
  }

  async create(ctx: RequestContext, input: CreateCampInput): Promise<CampRow> {
    const profile = await this.me.getProfile(ctx);
    if (!profile) throw new BadRequestException('No member profile for this account');
    const isOfficer = await this.scope.canAccessClubAny(
      ctx.access,
      ['club_events:log'],
      profile.clubId,
    );
    if (!isOfficer)
      throw new ForbiddenException('Only a club president or secretary can log a camp');

    const requested = [...new Set(input.participatingClubIds ?? [])].filter(
      (id) => id !== profile.clubId,
    );
    const validIds = await this.repo.findExistingClubIds(requested);
    const invalid = requested.filter((id) => !validIds.has(id));
    if (invalid.length > 0)
      throw new BadRequestException(`Unknown club id(s): ${invalid.join(', ')}`);

    const created = await this.repo.create({
      leadClubId: profile.clubId,
      date: new Date(`${input.date}T00:00:00Z`),
      venue: input.venue,
      city: input.city ?? null,
      unitsCollected: input.unitsCollected,
      donorsRegistered: input.donorsRegistered ?? null,
      partnerBloodBank: input.partnerBloodBank ?? null,
      photos: input.photos ?? [],
      submittedById: ctx.user.id,
      participatingClubIds: requested,
    });

    const adminIds = await this.repo.findProjectAdminUserIds('mission3011');
    if (adminIds.length > 0) {
      await this.notifications.notify({
        template: 'camp-submitted',
        to: adminIds.map((userId) => ({ userId })),
        data: { campId: created.id, leadClubId: profile.clubId, venue: created.venue },
      });
    }
    return created;
  }

  async update(ctx: RequestContext, id: string, input: UpdateCampInput): Promise<CampRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();

    const isReviewTransition = input.status === 'approved' || input.status === 'rejected';
    if (isReviewTransition) return this.review(ctx, existing, input);
    return this.editAsOwner(ctx, existing, input);
  }

  private async editAsOwner(
    ctx: RequestContext,
    existing: CampRow,
    input: UpdateCampInput,
  ): Promise<CampRow> {
    await this.scope.assertCanAccessClubAny(ctx.access, ['club_events:log'], existing.leadClubId);
    if (existing.status !== 'submitted') {
      throw new BadRequestException(`Cannot edit a ${existing.status} camp`);
    }

    let participatingClubIds: string[] | undefined;
    if (input.participatingClubIds !== undefined) {
      const requested = [...new Set(input.participatingClubIds)].filter(
        (cid) => cid !== existing.leadClubId,
      );
      const validIds = await this.repo.findExistingClubIds(requested);
      const invalid = requested.filter((cid) => !validIds.has(cid));
      if (invalid.length > 0)
        throw new BadRequestException(`Unknown club id(s): ${invalid.join(', ')}`);
      participatingClubIds = requested;
    }

    await this.repo.update(existing.id, {
      date: input.date ? new Date(`${input.date}T00:00:00Z`) : undefined,
      venue: input.venue,
      city: input.city,
      unitsCollected: input.unitsCollected,
      donorsRegistered: input.donorsRegistered,
      partnerBloodBank: input.partnerBloodBank,
      photos: input.photos,
    });
    if (participatingClubIds !== undefined) {
      await this.repo.replaceParticipatingClubs(
        existing.id,
        existing.leadClubId,
        participatingClubIds,
      );
    }
    return this.get(existing.id);
  }

  private async review(
    ctx: RequestContext,
    existing: CampRow,
    input: UpdateCampInput,
  ): Promise<CampRow> {
    if (!this.hasManageGrant(ctx)) throw new ForbiddenException();
    this.scope.assertCanAccessProject(ctx.access, MANAGE_PERMISSION, 'mission3011');

    if (existing.status !== 'submitted') {
      throw new BadRequestException(`Cannot review a ${existing.status} camp`);
    }
    if (input.status === 'rejected' && !input.rejectionReason) {
      throw new BadRequestException('rejectionReason is required to reject a camp');
    }

    const updated = await this.repo.update(existing.id, {
      status: input.status,
      reviewedById: ctx.user.id,
      reviewedAt: new Date(),
      rejectionReason: input.status === 'rejected' ? input.rejectionReason : null,
    });

    await this.audit.record({
      actorId: ctx.user.id,
      action: input.status === 'approved' ? 'camp.approved' : 'camp.rejected',
      resourceType: 'm3011_camp',
      resourceId: existing.id,
      before: { status: existing.status },
      after: { status: input.status, rejectionReason: input.rejectionReason ?? null },
    });

    if (input.status === 'approved') {
      await this.notifications.notify({
        template: 'camp-approved',
        to: [{ userId: existing.submittedById }],
        data: { campId: existing.id, unitsCollected: existing.unitsCollected },
      });
    }
    return updated;
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
