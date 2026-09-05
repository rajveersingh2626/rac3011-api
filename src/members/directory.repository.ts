import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { DirectoryEntryRow, DirectoryFilter } from './members.types';

const PRIVACY_POLICY_PAGE_KEY = 'privacy-policy';
const PRIVACY_POLICY_SECTION_KEY = 'body';

@Injectable()
export class DirectoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async currentPrivacyPolicyPublishedAt(): Promise<Date | null> {
    const block = await this.prisma.contentBlock.findUnique({
      where: {
        pageKey_sectionKey: {
          pageKey: PRIVACY_POLICY_PAGE_KEY,
          sectionKey: PRIVACY_POLICY_SECTION_KEY,
        },
      },
      select: { publishedAt: true },
    });
    return block?.publishedAt ?? null;
  }

  async memberIdForUser(userId: string): Promise<string | null> {
    const profile = await this.prisma.memberProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  async hasAccepted(memberId: string, policyPublishedAt: Date): Promise<boolean> {
    const count = await this.prisma.memberPrivacyAcceptance.count({
      where: { memberId, policyPublishedAt },
    });
    return count > 0;
  }

  async recordAcceptance(memberId: string, policyPublishedAt: Date): Promise<void> {
    await this.prisma.memberPrivacyAcceptance.upsert({
      where: { memberId_policyPublishedAt: { memberId, policyPublishedAt } },
      create: { memberId, policyPublishedAt },
      update: {},
    });
  }

  async findMany(
    filter: DirectoryFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DirectoryEntryRow[]; total: number }> {
    const where: Prisma.MemberProfileWhereInput = {
      status: 'approved',
      directoryOptIn: true,
      clubId: filter.clubId,
      skills: filter.skill ? { has: filter.skill } : undefined,
      interests: filter.interest ? { has: filter.interest } : undefined,
      club: filter.zoneId ? { zoneId: filter.zoneId } : undefined,
      fullName: filter.q ? { contains: filter.q, mode: 'insensitive' } : undefined,
    };
    const select = {
      id: true,
      fullName: true,
      photoUrl: true,
      skills: true,
      interests: true,
      club: {
        select: {
          id: true,
          name: true,
          shortName: true,
          zoneId: true,
          zoneRef: { select: { name: true } },
        },
      },
    } satisfies Prisma.MemberProfileSelect;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        where,
        select,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    const items: DirectoryEntryRow[] = rows.map((row) => ({
      id: row.id,
      fullName: row.fullName,
      photoUrl: row.photoUrl,
      skills: row.skills,
      interests: row.interests,
      club: {
        id: row.club.id,
        name: row.club.name,
        shortName: row.club.shortName,
        zoneId: row.club.zoneId,
        zoneName: row.club.zoneRef?.name ?? null,
      },
    }));
    return { items, total };
  }
}
