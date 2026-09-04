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
    return this.prisma.memberProfile.update({ where: { userId }, data, select: PROFILE_SELECT });
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
}
