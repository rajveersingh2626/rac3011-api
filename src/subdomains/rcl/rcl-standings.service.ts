import { Injectable } from '@nestjs/common';
import type { ProjectSummary } from '../../public/project-summary.registry';
import { RclSettingsRepository } from './rcl-settings.repository';
import { RclStandingsRepository } from './rcl-standings.repository';
import { computeStandings, type StandingsRow } from './standings';

export type StandingsResponse = {
  season: number;
  standings: StandingsRow[];
  updatedAt: string;
};

@Injectable()
export class RclStandingsService {
  constructor(
    private readonly repo: RclStandingsRepository,
    private readonly settings: RclSettingsRepository,
  ) {}

  async build(seasonOverride?: number): Promise<StandingsResponse> {
    const config = await this.settings.get();
    const season = seasonOverride ?? config.season;
    const [teams, fixtures] = await Promise.all([
      this.repo.teamsForSeason(season),
      this.repo.fixturesForSeason(season),
    ]);
    const standings = computeStandings(teams, fixtures, {
      pointsWin: config.pointsWin,
      pointsTie: config.pointsTie,
    });
    return { season, standings, updatedAt: new Date().toISOString() };
  }

  async summary(): Promise<ProjectSummary> {
    const config = await this.settings.get();
    const teamsRegistered = await this.repo.countTeams(config.season);
    return {
      headline: 'Teams registered',
      value: teamsRegistered,
      unit: 'teams',
      secondary: [],
      updatedAt: new Date().toISOString(),
    };
  }
}
