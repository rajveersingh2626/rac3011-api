import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  DelegationCreate,
  DelegationListFilter,
  DelegationRow,
  DelegationUpdate,
  HostAssignmentInput,
} from './ride.types';

const CLUB_REF_SELECT = { id: true, name: true, shortName: true } satisfies Prisma.ClubSelect;

const HOST_SELECT = {
  id: true,
  clubId: true,
  club: { select: CLUB_REF_SELECT },
  daysHosted: true,
  membersSent: true,
  assignedById: true,
} satisfies Prisma.RideDelegationHostSelect;

const DELEGATION_SELECT = {
  id: true,
  ryYear: true,
  visitingDistrict: true,
  country: true,
  startsAt: true,
  endsAt: true,
  headcount: true,
  contactName: true,
  contactEmail: true,
  status: true,
  hosts: { select: HOST_SELECT, orderBy: { createdAt: 'asc' } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RideDelegationSelect;

function whereFor(filter: DelegationListFilter): Prisma.RideDelegationWhereInput {
  const clauses: Prisma.RideDelegationWhereInput[] = [];
  if (filter.status) clauses.push({ status: filter.status });
  if (filter.ryYear !== undefined) clauses.push({ ryYear: filter.ryYear });
  return clauses.length > 0 ? { AND: clauses } : {};
}

@Injectable()
export class RideDelegationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    filter: DelegationListFilter,
    page: number,
    pageSize: number,
  ): Promise<{ items: DelegationRow[]; total: number }> {
    const where = whereFor(filter);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.rideDelegation.findMany({
        where,
        select: DELEGATION_SELECT,
        orderBy: { startsAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.rideDelegation.count({ where }),
    ]);
    return { items, total };
  }

  findById(id: string): Promise<DelegationRow | null> {
    return this.prisma.rideDelegation.findUnique({ where: { id }, select: DELEGATION_SELECT });
  }

  // Public "incoming" list: everything not cancelled, soonest first.
  findIncoming(): Promise<DelegationRow[]> {
    return this.prisma.rideDelegation.findMany({
      where: { status: { not: 'cancelled' } },
      select: DELEGATION_SELECT,
      orderBy: { startsAt: 'asc' },
      take: 200,
    });
  }

  async create(data: DelegationCreate): Promise<DelegationRow> {
    const created = await this.prisma.rideDelegation.create({
      data: {
        ryYear: data.ryYear,
        visitingDistrict: data.visitingDistrict,
        country: data.country,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        headcount: data.headcount,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        status: data.status,
      },
      select: { id: true },
    });
    return this.mustFind(created.id);
  }

  async update(id: string, data: DelegationUpdate): Promise<DelegationRow> {
    await this.prisma.rideDelegation.update({ where: { id }, data });
    return this.mustFind(id);
  }

  /** Replaces the full host set for a delegation; returns the union of previously- and
   * newly-assigned club ids so the caller can recompute points for everyone affected. */
  async replaceHosts(
    delegationId: string,
    hosts: HostAssignmentInput[],
    assignedById: string,
  ): Promise<{ affectedClubIds: string[] }> {
    const previous = await this.prisma.rideDelegationHost.findMany({
      where: { delegationId },
      select: { clubId: true },
    });
    await this.prisma.$transaction([
      this.prisma.rideDelegationHost.deleteMany({ where: { delegationId } }),
      this.prisma.rideDelegationHost.createMany({
        data: hosts.map((h) => ({
          delegationId,
          clubId: h.clubId,
          daysHosted: h.daysHosted,
          membersSent: h.membersSent,
          assignedById,
        })),
      }),
    ]);
    const affectedClubIds = new Set<string>();
    for (const p of previous) affectedClubIds.add(p.clubId);
    for (const h of hosts) affectedClubIds.add(h.clubId);
    return { affectedClubIds: [...affectedClubIds] };
  }

  async findExistingClubIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.club.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async findClubOfficerUserIds(clubId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: {
        scopeType: 'club',
        scopeId: clubId,
        role: { key: { in: ['president', 'secretary'] } },
      },
      select: { userId: true },
    });
    return [...new Set(rows.map((r) => r.userId))];
  }

  countThisRy(ryYear: number): Promise<number> {
    return this.prisma.rideDelegation.count({ where: { ryYear } });
  }

  async countDistinctHostClubsThisRy(ryYear: number): Promise<number> {
    const rows = await this.prisma.rideDelegationHost.findMany({
      where: { delegation: { ryYear } },
      select: { clubId: true },
      distinct: ['clubId'],
    });
    return rows.length;
  }

  private async mustFind(id: string): Promise<DelegationRow> {
    const row = await this.findById(id);
    if (!row) throw new Error(`RideDelegation ${id} vanished after write`);
    return row;
  }
}
