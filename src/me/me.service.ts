import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import type { ClubSummaryDto } from '../clubs/clubs.transformer';
import type { RequestContext } from '../common/types/access';
import { MeRepository } from './me.repository';
import type { MemberProfileRow, MemberProfileUpdate } from './me.types';
import type { UpdateMeInput } from './dto/update-me.dto';

@Injectable()
export class MeService {
  constructor(
    private readonly repo: MeRepository,
    private readonly scope: ScopeService,
  ) {}

  async getProfile(ctx: RequestContext): Promise<MemberProfileRow | null> {
    return this.repo.findProfileByUserId(ctx.user.id);
  }

  async findProfileIdForUser(userId: string): Promise<string | null> {
    const profile = await this.repo.findProfileByUserId(userId);
    return profile?.id ?? null;
  }

  async updateProfile(ctx: RequestContext, input: UpdateMeInput): Promise<MemberProfileRow> {
    const existing = await this.repo.findProfileByUserId(ctx.user.id);
    if (!existing) throw new NotFoundException('No member profile for this account');
    return this.repo.updateProfileByUserId(ctx.user.id, toProfileUpdate(input));
  }

  async clubsInScope(ctx: RequestContext): Promise<ClubSummaryDto[]> {
    const filter = await this.scope.clubFilter(ctx.access, 'clubs:view');
    return this.repo.findClubsInScope(filter);
  }
}

function toProfileUpdate(input: UpdateMeInput): MemberProfileUpdate {
  return {
    ...input,
    membershipAnniversary:
      input.membershipAnniversary === undefined
        ? undefined
        : input.membershipAnniversary
          ? new Date(input.membershipAnniversary)
          : null,
  };
}
