import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClubScopeFilter } from '../../common/scope/scope.service';
import type { CampCreate, CampListFilter, CampRow, CampUpdate } from './mission3011.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;

const CAMP_SELECT = {
  id: true,
  leadClubId: true,
  leadClub: { select: CLUB_REF_SELECT },
  date: true,
  venue: true,
  city: true,
  unitsCollected: true,
  donorsRegistered: true,
  partnerBloodBank: true,
  photos: true,
  status: true,
  submittedById: true,
  reviewedById: true,
  reviewedAt: true,
  rejectionReason: true,
  clubs: { select: { club: { select: CLUB_REF_SELECT } } },
  createdAt: true,
} satisfies Prisma.M3011CampSelect;

function whereFor(filter: CampListFilter, scope?: ClubScopeFilter): Prisma.M3011CampWhereInput {
  const clauses: Prisma.M3011CampWhereInput[] = [];
  if (filter.status) clauses.push({ status: filter.status });
  if (filter.clubId) clauses.push({ leadClubId: filter.clubId });
  if (scope && !('all' in scope)) clauses.push({ leadClubId: { in: scope.clubIds } });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class Mission3011CampsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: CampListFilter,
    page: number,
    pageSize: number,
    scope?: ClubScopeFilter,
  ): Promise<{ items: CampRow[]; total: number }> {
    const where = whereFor(filter, scope);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.m3011Camp.findMany({
        where,
        select: CAMP_SELECT,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.m3011Camp.count({ where }),
    ]);
    return { items: items, total };
  }

  findById(id: string): Promise<CampRow | null> {
    return this.prisma.m3011Camp.findUnique({
      where: { id },
      select: CAMP_SELECT,
    });
  }

  async create(data: CampCreate): Promise<CampRow> {
    const created = await this.prisma.m3011Camp.create({
      data: {
        leadClubId: data.leadClubId,
        date: data.date,
        venue: data.venue,
        city: data.city,
        unitsCollected: data.unitsCollected,
        donorsRegistered: data.donorsRegistered,
        partnerBloodBank: data.partnerBloodBank,
        photos: data.photos,
        submittedById: data.submittedById,
        clubs: {
          create: [...new Set([data.leadClubId, ...data.participatingClubIds])].map((clubId) => ({
            clubId,
          })),
        },
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async update(id: string, data: CampUpdate): Promise<CampRow> {
    await this.prisma.m3011Camp.update({ where: { id }, data });
    return this.mustFind(id);
  }

  async replaceParticipatingClubs(
    campId: string,
    leadClubId: string,
    clubIds: string[],
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.m3011CampClub.deleteMany({ where: { campId } }),
      this.prisma.m3011CampClub.createMany({
        data: [...new Set([leadClubId, ...clubIds])].map((clubId) => ({ campId, clubId })),
      }),
    ]);
  }

  async findExistingClubIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async findProjectAdminUserIds(projectKey: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { scopeType: 'project', scopeId: projectKey },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  private async mustFind(id: string): Promise<CampRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`M3011Camp ${id} vanished after write`);
    return row;
  }
}
