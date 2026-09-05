import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { StandingsFixture, StandingsTeam } from './standings';

@Injectable()
export class RclStandingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  teamsForSeason(season: number): Promise<StandingsTeam[]> {
    return this.prisma.rclTeam.findMany({
      where: { season, status: { not: 'withdrawn' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async fixturesForSeason(season: number): Promise<StandingsFixture[]> {
    const rows = await this.prisma.rclFixture.findMany({
      where: { season, status: { in: ['completed', 'abandoned'] } },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        result: {
          select: {
            homeRuns: true,
            homeWickets: true,
            homeOvers: true,
            awayRuns: true,
            awayWickets: true,
            awayOvers: true,
            winnerTeamId: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      result: r.result
        ? {
            homeRuns: r.result.homeRuns,
            homeWickets: r.result.homeWickets,
            homeOvers: Number(r.result.homeOvers),
            awayRuns: r.result.awayRuns,
            awayWickets: r.result.awayWickets,
            awayOvers: Number(r.result.awayOvers),
            winnerTeamId: r.result.winnerTeamId,
          }
        : null,
    }));
  }

  countTeams(season: number): Promise<number> {
    return this.prisma.rclTeam.count({ where: { season } });
  }
}
