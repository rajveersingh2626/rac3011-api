import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClubScopeFilter } from '../../common/scope/scope.service';
import type { SupportClubListFilter, SupportClubRow, SupportClubUpsert } from './ride.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;

const SUPPORT_CLUB_SELECT = {
  id: true,
  ryYear: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
  capacityDelegates: true,
  homestayAvailable: true,
  preferredMonths: true,
  contactMemberId: true,
  contactPhone: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RideSupportClubSelect;

function whereFor(
  filter: SupportClubListFilter,
  scope?: ClubScopeFilter,
): Prisma.RideSupportClubWhereInput {
  const clauses: Prisma.RideSupportClubWhereInput[] = [];
  if (filter.ryYear !== undefined) clauses.push({ ryYear: filter.ryYear });
  if (filter.clubId) clauses.push({ clubId: filter.clubId });
  if (scope && !('all' in scope)) clauses.push({ clubId: { in: scope.clubIds } });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class RideSupportClubsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: SupportClubListFilter,
    page: number,
    pageSize: number,
    scope?: ClubScopeFilter,
  ): Promise<{ items: SupportClubRow[]; total: number }> {
    const where = whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideSupportClub.findMany({
        where,
        select: SUPPORT_CLUB_SELECT,
        orderBy: [{ ryYear: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideSupportClub.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<SupportClubRow | null> {
    return this.prisma.rideSupportClub.findUnique({ where: { id }, select: SUPPORT_CLUB_SELECT });
  }

  findByClubYear(clubId: string, ryYear: number): Promise<SupportClubRow | null> {
    return this.prisma.rideSupportClub.findUnique({
      where: { ryYear_clubId: { ryYear, clubId } },
      select: SUPPORT_CLUB_SELECT,
    });
  }

  async upsert(data: SupportClubUpsert): Promise<SupportClubRow> {
    const created = await this.prisma.rideSupportClub.upsert({
      where: { ryYear_clubId: { ryYear: data.ryYear, clubId: data.clubId } },
      create: {
        ryYear: data.ryYear,
        clubId: data.clubId,
        capacityDelegates: data.capacityDelegates,
        homestayAvailable: data.homestayAvailable,
        preferredMonths: data.preferredMonths,
        contactMemberId: data.contactMemberId,
        contactPhone: data.contactPhone,
        notes: data.notes,
        createdById: data.createdById,
      },
      update: {
        capacityDelegates: data.capacityDelegates,
        homestayAvailable: data.homestayAvailable,
        preferredMonths: data.preferredMonths,
        contactMemberId: data.contactMemberId,
        contactPhone: data.contactPhone,
        notes: data.notes,
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async findClub(clubId: string): Promise<{ id: string } | null> {
    return this.prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  }

  private async mustFind(id: string): Promise<SupportClubRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RideSupportClub ${id} vanished after write`);
    return row;
  }
}
