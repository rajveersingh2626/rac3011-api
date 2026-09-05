export type Overs = number;

// Decimal overs to balls: 4.3 -> 27 balls.
export function oversToBalls(overs: Overs): number {
  const wholeOvers = Math.trunc(overs);
  const balls = Math.round((overs - wholeOvers) * 10);
  return wholeOvers * 6 + balls;
}

export function ballsToOversDecimal(balls: number): number {
  return balls / 6;
}

export type StandingsTeam = { id: string; name: string };

export type StandingsResult = {
  homeRuns: number;
  homeWickets: number;
  homeOvers: Overs;
  awayRuns: number;
  awayWickets: number;
  awayOvers: Overs;
  winnerTeamId: string | null;
};

export type StandingsFixture = {
  homeTeamId: string;
  awayTeamId: string;
  result: StandingsResult | null;
};

export type StandingsSettings = { pointsWin: number; pointsTie: number };

export type StandingsRow = {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  tied: number;
  lost: number;
  points: number;
  nrr: number;
};

type Accumulator = {
  played: number;
  won: number;
  tied: number;
  lost: number;
  points: number;
  runsFor: number;
  ballsFaced: number;
  runsAgainst: number;
  ballsBowled: number;
};

function emptyAccumulator(): Accumulator {
  return {
    played: 0,
    won: 0,
    tied: 0,
    lost: 0,
    points: 0,
    runsFor: 0,
    ballsFaced: 0,
    runsAgainst: 0,
    ballsBowled: 0,
  };
}

export function computeStandings(
  teams: StandingsTeam[],
  fixtures: StandingsFixture[],
  settings: StandingsSettings,
): StandingsRow[] {
  const acc = new Map<string, Accumulator>();
  for (const team of teams) acc.set(team.id, emptyAccumulator());

  for (const fixture of fixtures) {
    const home = acc.get(fixture.homeTeamId);
    const away = acc.get(fixture.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;

    const winnerTeamId = fixture.result?.winnerTeamId ?? null;
    if (winnerTeamId === fixture.homeTeamId) {
      home.won += 1;
      home.points += settings.pointsWin;
      away.lost += 1;
    } else if (winnerTeamId === fixture.awayTeamId) {
      away.won += 1;
      away.points += settings.pointsWin;
      home.lost += 1;
    } else {
      home.tied += 1;
      home.points += settings.pointsTie;
      away.tied += 1;
      away.points += settings.pointsTie;
    }

    if (fixture.result) {
      const homeBalls = oversToBalls(fixture.result.homeOvers);
      const awayBalls = oversToBalls(fixture.result.awayOvers);
      home.runsFor += fixture.result.homeRuns;
      home.ballsFaced += homeBalls;
      home.runsAgainst += fixture.result.awayRuns;
      home.ballsBowled += awayBalls;
      away.runsFor += fixture.result.awayRuns;
      away.ballsFaced += awayBalls;
      away.runsAgainst += fixture.result.homeRuns;
      away.ballsBowled += homeBalls;
    }
  }

  const rows: StandingsRow[] = teams.map((team) => {
    const a = acc.get(team.id) ?? emptyAccumulator();
    const forRate = a.ballsFaced > 0 ? a.runsFor / ballsToOversDecimal(a.ballsFaced) : 0;
    const againstRate = a.ballsBowled > 0 ? a.runsAgainst / ballsToOversDecimal(a.ballsBowled) : 0;
    // Rounded to 3dp so float noise never breaks an exact tie-break comparison.
    const nrr = Math.round((forRate - againstRate) * 1000) / 1000;
    return {
      teamId: team.id,
      teamName: team.name,
      played: a.played,
      won: a.won,
      tied: a.tied,
      lost: a.lost,
      points: a.points,
      nrr,
    };
  });

  rows.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    if (r2.nrr !== r1.nrr) return r2.nrr - r1.nrr;
    if (r2.won !== r1.won) return r2.won - r1.won;
    return r1.teamName.localeCompare(r2.teamName);
  });
  return rows;
}
