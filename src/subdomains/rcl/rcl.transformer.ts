import type { FixtureRow, TeamRow } from './rcl.types';

const iso = (d: Date): string => d.toISOString();

export function teamDto(row: TeamRow) {
  return {
    id: row.id,
    season: row.season,
    club: row.club,
    name: row.name,
    captainName: row.captainName,
    captainPhone: row.captainPhone,
    status: row.status,
    players: row.players.map((p) => ({
      id: p.id,
      memberId: p.memberId,
      name: p.name,
      role: p.role,
    })),
    createdAt: iso(row.createdAt),
  };
}

function teamRefDto(ref: FixtureRow['homeTeam']) {
  return { id: ref.id, name: ref.name, club: ref.club };
}

export function fixtureDto(row: FixtureRow) {
  return {
    id: row.id,
    season: row.season,
    homeTeam: teamRefDto(row.homeTeam),
    awayTeam: teamRefDto(row.awayTeam),
    scheduledAt: iso(row.scheduledAt),
    venue: row.venue,
    status: row.status,
    result: row.result
      ? {
          homeRuns: row.result.homeRuns,
          homeWickets: row.result.homeWickets,
          homeOvers: row.result.homeOvers,
          awayRuns: row.result.awayRuns,
          awayWickets: row.result.awayWickets,
          awayOvers: row.result.awayOvers,
          winnerTeamId: row.result.winnerTeamId,
          notes: row.result.notes,
        }
      : null,
    createdAt: iso(row.createdAt),
  };
}
