import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ScopeService, type ClubScopeFilter } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import { currentRyYear } from '../../common/ry-year';
import { MeService } from '../../me/me.service';
import type { UpsertSupportClubInput } from './dto/upsert-support-club.dto';
import { RideSupportClubsRepository } from './ride-support-clubs.repository';
import type { SupportClubListFilter, SupportClubRow } from './ride.types';

const MANAGE_PERMISSION = 'subdomain:ride:manage' as const;
const OFFICER_PERMISSION = 'club_events:log' as const;

@Injectable()
export class RideSupportClubsService {
  constructor(
    private readonly repo: RideSupportClubsRepository,
    private readonly scope: ScopeService,
    private readonly me: MeService,
  ) {}

  async list(
    ctx: RequestContext,
    filter: SupportClubListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: SupportClubRow[]; total: number }> {
    const scope = await this.clubScopeFor(ctx);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, page, pageSize, narrowed);
  }

  async upsert(ctx: RequestContext, input: UpsertSupportClubInput): Promise<SupportClubRow> {
    const hasManageGrant = this.hasManageGrant(ctx);
    let clubId: string;
    if (hasManageGrant && input.clubId) {
      const club = await this.repo.findClub(input.clubId);
      if (!club) throw new BadRequestException(`Unknown club id: ${input.clubId}`);
      clubId = club.id;
    } else {
      const profile = await this.me.getProfile(ctx);
      if (!profile) throw new BadRequestException('No member profile for this account');
      const isOfficer = await this.scope.canAccessClubAny(
        ctx.access,
        [OFFICER_PERMISSION],
        profile.clubId,
      );
      if (!isOfficer && !hasManageGrant) {
        throw new ForbiddenException(
          'Only a club president or secretary can register a support club',
        );
      }
      clubId = profile.clubId;
    }

    const ryYear = hasManageGrant && input.ryYear ? input.ryYear : currentRyYear();

    return this.repo.upsert({
      clubId,
      ryYear,
      capacityDelegates: input.capacityDelegates,
      homestayAvailable: input.homestayAvailable,
      preferredMonths: input.preferredMonths,
      contactMemberId: input.contactMemberId ?? null,
      contactPhone: input.contactPhone,
      notes: input.notes ?? null,
      createdById: ctx.user.id,
    });
  }

  /** Manage-grant callers see every club; everyone else (club_events:log officers, already
   * required by the route guard) are scoped to their own club(s) only. */
  private async clubScopeFor(ctx: RequestContext): Promise<ClubScopeFilter> {
    if (this.hasManageGrant(ctx)) return { all: true };
    return this.scope.clubFilter(ctx.access, OFFICER_PERMISSION);
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
