import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClubUnits, ZoneUnits } from './mission3011.types';

export type ApprovedCampRow = {
  id: string;
  date: Date;
  venue: string;
  city: string | null;
  unitsCollected: number;
  leadClub: { id: string; name: string; shortName: string | null };
};

@Injectable()
export class Mission3011DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async totalApprovedUnits(): Promise<number> {
    const agg = await this.prisma.m3011Camp.aggregate({
      where: { status: 'approved' },
      _sum: { unitsCollected: true },
    });
    return agg._sum.unitsCollected ?? 0;
  }

  countApprovedCamps(): Promise<number> {
    return this.prisma.m3011Camp.count({ where: { status: 'approved' } });
  }

  async byZone(): Promise<ZoneUnits[]> {
    const camps = await this.prisma.m3011Camp.findMany({
      where: { status: 'approved' },
      select: {
        unitsCollected: true,
        leadClub: { select: { zoneId: true, zoneRef: { select: { name: true } } } },
      },
    });
    const byZone = new Map<string, ZoneUnits>();
    for (const camp of camps) {
      const zoneId = camp.leadClub.zoneId;
      const zoneName = camp.leadClub.zoneRef?.name ?? 'Unassigned';
      const key = zoneId ?? 'unassigned';
      const existing = byZone.get(key) ?? { zoneId, zoneName, units: 0 };
      existing.units += camp.unitsCollected;
      byZone.set(key, existing);
    }
    return [...byZone.values()].sort((a, b) => b.units - a.units);
  }

  latestApproved(take: number): Promise<ApprovedCampRow[]> {
    return this.prisma.m3011Camp.findMany({
      where: { status: 'approved' },
      select: {
        id: true,
        date: true,
        venue: true,
        city: true,
        unitsCollected: true,
        leadClub: { select: { id: true, name: true, shortName: true } },
      },
      orderBy: { date: 'desc' },
      take,
    });
  }

  async perClub(): Promise<ClubUnits[]> {
    const grouped = await this.prisma.m3011Camp.groupBy({
      by: ['leadClubId'],
      where: { status: 'approved' },
      _sum: { unitsCollected: true },
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];
    const clubs = await this.prisma.club.findMany({
      where: { id: { in: grouped.map((g) => g.leadClubId) } },
      select: { id: true, name: true },
    });
    const nameById = new Map(clubs.map((c) => [c.id, c.name]));
    return grouped
      .map((g) => ({
        clubId: g.leadClubId,
        clubName: nameById.get(g.leadClubId) ?? g.leadClubId,
        campsApproved: g._count._all,
        unitsCollected: g._sum.unitsCollected ?? 0,
      }))
      .sort((a, b) => b.unitsCollected - a.unitsCollected);
  }
}
