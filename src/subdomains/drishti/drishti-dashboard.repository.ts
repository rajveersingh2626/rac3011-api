import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { DrishtiStageKind } from './drishti.types';

const STAGES: DrishtiStageKind[] = ['screened', 'scheduled', 'operated', 'followup', 'closed'];

@Injectable()
export class DrishtiDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Counts surgery events, not beneficiaries at the "operated" stage: a beneficiary who has
  // progressed to followup/closed already had a surgery row created, and must still count.
  async operatedCount(): Promise<number> {
    return this.prisma.drishtiSurgery.count();
  }

  async pipelineCounts(): Promise<Record<DrishtiStageKind, number>> {
    const grouped = await this.prisma.drishtiBeneficiary.groupBy({
      by: ['stage'],
      _count: { _all: true },
    });
    const byStage = new Map(grouped.map((g) => [g.stage, g._count._all]));
    return Object.fromEntries(STAGES.map((s) => [s, byStage.get(s) ?? 0])) as Record<
      DrishtiStageKind,
      number
    >;
  }

  async hospitals(): Promise<{ hospital: string; surgeries: number }[]> {
    const grouped = await this.prisma.drishtiSurgery.groupBy({
      by: ['hospital'],
      _count: { _all: true },
    });
    return grouped
      .map((g) => ({ hospital: g.hospital, surgeries: g._count._all }))
      .sort((a, b) => b.surgeries - a.surgeries);
  }

  async perClub(): Promise<
    { clubId: string; clubName: string; beneficiaries: number; operated: number }[]
  > {
    const grouped = await this.prisma.drishtiBeneficiary.groupBy({
      by: ['clubId'],
      _count: { _all: true },
    });
    if (grouped.length === 0) return [];
    const [clubs, operatedGrouped] = await Promise.all([
      this.prisma.club.findMany({
        where: { id: { in: grouped.map((g) => g.clubId) } },
        select: { id: true, name: true },
      }),
      this.prisma.drishtiBeneficiary.groupBy({
        by: ['clubId'],
        where: { stage: { in: ['operated', 'followup', 'closed'] } },
        _count: { _all: true },
      }),
    ]);
    const nameById = new Map(clubs.map((c) => [c.id, c.name]));
    const operatedById = new Map(operatedGrouped.map((g) => [g.clubId, g._count._all]));
    return grouped
      .map((g) => ({
        clubId: g.clubId,
        clubName: nameById.get(g.clubId) ?? g.clubId,
        beneficiaries: g._count._all,
        operated: operatedById.get(g.clubId) ?? 0,
      }))
      .sort((a, b) => b.operated - a.operated);
  }
}
