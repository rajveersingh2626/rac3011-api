import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ClubFactsForAdapterRow, ReportForAdapterRow } from './points.types';

const NOT_DRAFT = ['submitted', 'queried', 'scored'] as const;

@Injectable()
export class PointsSourceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findClubFacts(clubId: string, ryYear: number): Promise<ClubFactsForAdapterRow> {
    return this.prisma.clubFacts.findUnique({
      where: { clubId_ryYear: { clubId, ryYear } },
      select: {
        duesPaidOn: true,
        riCitationCompleted: true,
        paulHarrisFellows: true,
        dualMembers: true,
        mdioCommitteeMembers: true,
        mdioEventsAttended: true,
        sisterClubSignedOn: true,
        drrVisitOn: true,
        vocationalCentreOn: true,
        activeSocialHandles: true,
        clubMerchandise: true,
        priorYearMemberCount: true,
      },
    });
  }

  async countApprovedMembers(clubId: string): Promise<number> {
    return this.prisma.memberProfile.count({ where: { clubId, status: 'approved' } });
  }

  async countApprovedMembersWithSkill(clubId: string): Promise<number> {
    return this.prisma.memberProfile.count({
      where: { clubId, status: 'approved', skills: { isEmpty: false } },
    });
  }

  async findReportForMonth(clubId: string, month: Date): Promise<ReportForAdapterRow | null> {
    return this.prisma.report.findFirst({
      where: { clubId, month, status: { in: [...NOT_DRAFT] } },
      select: { month: true, values: true, filedOnTime: true },
    });
  }

  async findReportsInRange(clubId: string, from: Date, to: Date): Promise<ReportForAdapterRow[]> {
    return this.prisma.report.findMany({
      where: { clubId, month: { gte: from, lte: to }, status: { in: [...NOT_DRAFT] } },
      select: { month: true, values: true, filedOnTime: true },
      orderBy: { month: 'asc' },
    });
  }

  async findLatestReport(clubId: string): Promise<ReportForAdapterRow | null> {
    return this.prisma.report.findFirst({
      where: { clubId, status: { in: [...NOT_DRAFT] } },
      select: { month: true, values: true, filedOnTime: true },
      orderBy: { month: 'desc' },
    });
  }

  async findDistrictEventIdsInMonth(monthStart: Date, monthEnd: Date): Promise<string[]> {
    const rows = await this.prisma.event.findMany({
      where: { isDistrictEvent: true, startsAt: { gte: monthStart, lt: monthEnd } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async findRideHostingTotals(
    clubId: string,
    ryYear: number,
  ): Promise<{ daysHosted: number; membersSent: number }> {
    const agg = await this.prisma.rideDelegationHost.aggregate({
      where: { clubId, delegation: { ryYear } },
      _sum: { daysHosted: true, membersSent: true },
    });
    return { daysHosted: agg._sum.daysHosted ?? 0, membersSent: agg._sum.membersSent ?? 0 };
  }

  async countCheckinsForClubAtEvents(
    clubId: string,
    eventIds: string[],
  ): Promise<Map<string, number>> {
    if (eventIds.length === 0) return new Map();
    // memberId null = walk-in, not an "approved member" checkin, so it's excluded from the ratio.
    const rows = await this.prisma.eventCheckin.groupBy({
      by: ['eventId'],
      where: { clubId, eventId: { in: eventIds }, memberId: { not: null } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [r.eventId, r._count._all]));
  }
}
