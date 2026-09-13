import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubScopeFilter } from '../common/scope/scope.service';
import type { ClubSummaryDto } from '../clubs/clubs.transformer';
import type { MemberProfileRow, MemberProfileUpdate } from './me.types';

const PROFILE_SELECT = {
  id: true,
  userId: true,
  fullName: true,
  email: true,
  phone: true,
  rotaryId: true,
  clubId: true,
  photoUrl: true,
  bio: true,
  skills: true,
  interests: true,
  membershipAnniversary: true,
  status: true,
  directoryOptIn: true,
  isDacMember: true,
  themePreference: true,
  qrToken: true,
  createdAt: true,
} satisfies Prisma.MemberProfileSelect;

@Injectable()
export class MeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProfileByUserId(userId: string): Promise<MemberProfileRow | null> {
    return this.prisma.memberProfile.findUnique({ where: { userId }, select: PROFILE_SELECT });
  }

  async updateProfileByUserId(
    userId: string,
    data: MemberProfileUpdate,
  ): Promise<MemberProfileRow> {
    if (data.fullName || data.photoUrl !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.fullName ? { name: data.fullName } : {}),
          ...(data.photoUrl !== undefined ? { image: data.photoUrl } : {}),
        },
      });
    }
    const updated = await this.prisma.memberProfile.update({ where: { userId }, data, select: PROFILE_SELECT });

    // Sync to District Team Members (DAC)
    const teamUpdateData: Prisma.DistrictTeamMemberUpdateInput = {};
    if (data.photoUrl !== undefined) teamUpdateData.photoUrl = data.photoUrl;
    if (data.fullName) teamUpdateData.name = data.fullName;
    if (data.phone !== undefined) teamUpdateData.phone = data.phone;
    if (data.bio !== undefined) teamUpdateData.bio = data.bio;

    if (Object.keys(teamUpdateData).length > 0) {
      await this.prisma.districtTeamMember.updateMany({
        where: {
          OR: [
            { memberId: updated.id },
            { email: { equals: updated.email, mode: 'insensitive' } },
          ],
        },
        data: teamUpdateData,
      });
    }

    // Sync to Past DRRs
    if (data.photoUrl !== undefined || data.fullName || data.bio !== undefined) {
      const pastDrrUpdateData: Prisma.PastDrrUpdateInput = {};
      if (data.photoUrl !== undefined) pastDrrUpdateData.photoUrl = data.photoUrl;
      if (data.fullName) pastDrrUpdateData.name = data.fullName;
      if (data.bio !== undefined) pastDrrUpdateData.bio = data.bio;

      if (Object.keys(pastDrrUpdateData).length > 0 && updated.fullName) {
        const cleanName = updated.fullName.replace(/^(Rtn\.?\s*|Rtr\.?\s*|PDRR\s*|DRR\s*)+/gi, '').trim();
        await this.prisma.pastDrr.updateMany({
          where: {
            OR: [
              { name: { contains: cleanName, mode: 'insensitive' } },
              { slug: { contains: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), mode: 'insensitive' } },
            ],
          },
          data: pastDrrUpdateData,
        });
      }
    }

    return updated;
  }

  async findClubsInScope(filter: ClubScopeFilter): Promise<ClubSummaryDto[]> {
    const where: Prisma.ClubWhereInput =
      'all' in filter ? { isActive: true } : { id: { in: filter.clubIds } };
    return this.prisma.club.findMany({
      where,
      select: { id: true, name: true, shortName: true, zoneId: true },
      orderBy: { name: 'asc' },
    });
  }

  async currentPrivacyPolicyPublishedAt(): Promise<Date | null> {
    const block = await this.prisma.contentBlock.findUnique({
      where: { pageKey_sectionKey: { pageKey: 'privacy-policy', sectionKey: 'body' } },
      select: { publishedAt: true },
    });
    return block?.publishedAt ?? null;
  }

  async recordPrivacyAcceptance(memberId: string, policyPublishedAt: Date): Promise<void> {
    await this.prisma.memberPrivacyAcceptance.upsert({
      where: { memberId_policyPublishedAt: { memberId, policyPublishedAt } },
      create: { memberId, policyPublishedAt },
      update: {},
    });
  }
}
