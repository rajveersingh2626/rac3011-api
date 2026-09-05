import { Injectable, NotFoundException } from '@nestjs/common';
import { ScopeService } from '../common/scope/scope.service';
import { ClubsService } from '../clubs/clubs.service';
import type { ClubSummaryDto } from '../clubs/clubs.transformer';
import type { ClubWithRelations } from '../clubs/clubs.types';
import { CodedConflictException } from '../common/errors/conflict.error';
import type { RequestContext } from '../common/types/access';
import { MeRepository } from './me.repository';
import { buildCardId } from './member-card.util';
import type { MemberProfileRow, MemberProfileUpdate } from './me.types';
import type { UpdateMeInput } from './dto/update-me.dto';

export type MemberCard = {
  memberId: string;
  fullName: string;
  cardId: string;
  clubName: string;
  clubShortName: string | null;
  memberSince: string | null;
  qrToken: string;
};

@Injectable()
export class MeService {
  constructor(
    private readonly repo: MeRepository,
    private readonly scope: ScopeService,
    private readonly clubs: ClubsService,
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

  async getClub(ctx: RequestContext): Promise<ClubWithRelations> {
    const profile = await this.repo.findProfileByUserId(ctx.user.id);
    if (!profile) throw new NotFoundException('No member profile for this account');
    return this.clubs.get(ctx.access, profile.clubId, { board: true, facts: false });
  }

  async getQrToken(ctx: RequestContext): Promise<string> {
    const profile = await this.repo.findProfileByUserId(ctx.user.id);
    if (!profile) throw new NotFoundException('No member profile for this account');
    return profile.qrToken;
  }

  async getCard(ctx: RequestContext): Promise<MemberCard> {
    const profile = await this.repo.findProfileByUserId(ctx.user.id);
    if (!profile) throw new NotFoundException('No member profile for this account');
    const club = await this.clubs.get(ctx.access, profile.clubId, { board: false, facts: false });
    return {
      memberId: profile.id,
      fullName: profile.fullName,
      cardId: buildCardId(profile.id, club.shortName, club.name),
      clubName: club.name,
      clubShortName: club.shortName,
      memberSince: profile.membershipAnniversary
        ? profile.membershipAnniversary.toISOString().slice(0, 10)
        : null,
      qrToken: profile.qrToken,
    };
  }

  async acceptPrivacyPolicy(ctx: RequestContext): Promise<void> {
    const profile = await this.repo.findProfileByUserId(ctx.user.id);
    if (!profile) throw new NotFoundException('No member profile for this account');
    const publishedAt = await this.repo.currentPrivacyPolicyPublishedAt();
    if (!publishedAt) {
      throw new CodedConflictException(
        'PRIVACY_NOT_ACCEPTED',
        'No privacy policy is currently published',
      );
    }
    await this.repo.recordPrivacyAcceptance(profile.id, publishedAt);
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
