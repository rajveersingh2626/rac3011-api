import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { ScopeService, type ClubScopeFilter } from '../../common/scope/scope.service';
import type { RequestContext } from '../../common/types/access';
import type { CreateTeamInput } from './dto/create-team.dto';
import type { UpdateTeamInput } from './dto/update-team.dto';
import { RclSettingsRepository } from './rcl-settings.repository';
import { RclTeamsRepository } from './rcl-teams.repository';
import { RclTeamConflictError } from './rcl.types';
import type { TeamListFilter, TeamRow } from './rcl.types';

const MANAGE_PERMISSION = 'subdomain:rcl:manage' as const;
const OFFICER_PERMISSION = 'club_events:log' as const;

@Injectable()
export class RclTeamsService {
  constructor(
    private readonly repo: RclTeamsRepository,
    private readonly settings: RclSettingsRepository,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    ctx: RequestContext,
    filter: TeamListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: TeamRow[]; total: number }> {
    const scope = await this.clubScopeFor(ctx);
    const narrowed = ScopeService.narrowClubs(scope, filter.clubId);
    if ('clubIds' in narrowed && narrowed.clubIds.length === 0) return { items: [], total: 0 };
    return this.repo.findMany(filter, page, pageSize, narrowed);
  }

  async get(ctx: RequestContext, id: string): Promise<TeamRow> {
    const row = await this.repo.findById(id);
    if (!row) throw new NotFoundException();
    if (!this.hasManageGrant(ctx)) {
      await this.scope.assertCanAccessClub(ctx.access, OFFICER_PERMISSION, row.clubId);
    }
    return row;
  }

  async create(ctx: RequestContext, input: CreateTeamInput): Promise<TeamRow> {
    if (!this.hasManageGrant(ctx)) {
      const canRegister = await this.scope.canAccessClub(
        ctx.access,
        OFFICER_PERMISSION,
        input.clubId,
      );
      if (!canRegister) {
        throw new ForbiddenException(
          "Only that club's president or secretary can register its RCL team",
        );
      }
    }
    const club = await this.repo.findClub(input.clubId);
    if (!club) throw new BadRequestException(`Unknown club id: ${input.clubId}`);

    const defaults = await this.settings.get();
    const season = input.season ?? defaults.season;

    try {
      return await this.repo.create({
        clubId: input.clubId,
        season,
        name: input.name,
        captainName: input.captainName,
        captainPhone: input.captainPhone,
        players: input.players ?? [],
        createdById: ctx.user.id,
      });
    } catch (err) {
      if (err instanceof RclTeamConflictError) {
        throw new ConflictException(
          `${input.clubId} already has a registered team for season ${season}`,
        );
      }
      throw err;
    }
  }

  async update(ctx: RequestContext, id: string, input: UpdateTeamInput): Promise<TeamRow> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException();
    if (!this.hasManageGrant(ctx)) {
      await this.scope.assertCanAccessClubAny(ctx.access, [OFFICER_PERMISSION], existing.clubId);
    }

    const updated = await this.repo.update(id, {
      name: input.name,
      captainName: input.captainName,
      captainPhone: input.captainPhone,
      status: input.status,
      players: input.players,
    });

    if (input.status && input.status !== existing.status) {
      await this.audit.record({
        actorId: ctx.user.id,
        action: 'rcl.team.status_changed',
        resourceType: 'rcl_team',
        resourceId: id,
        before: { status: existing.status },
        after: { status: input.status },
      });
    }
    return updated;
  }

  private async clubScopeFor(ctx: RequestContext): Promise<ClubScopeFilter> {
    if (this.hasManageGrant(ctx)) return { all: true };
    return this.scope.clubFilter(ctx.access, OFFICER_PERMISSION);
  }

  private hasManageGrant(ctx: RequestContext): boolean {
    return ctx.access.isSuperAdmin || (ctx.access.grants[MANAGE_PERMISSION] ?? []).length > 0;
  }
}
