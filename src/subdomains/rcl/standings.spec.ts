import { describe, expect, it } from 'vitest';
import {
  ballsToOversDecimal,
  computeStandings,
  oversToBalls,
  type StandingsFixture,
} from './standings';

const SETTINGS = { pointsWin: 2, pointsTie: 1 };

describe('oversToBalls', () => {
  it('converts decimal overs to balls (spec §6.2 example)', () => {
    expect(oversToBalls(4.3)).toBe(27);
    expect(oversToBalls(20)).toBe(120);
    expect(oversToBalls(0)).toBe(0);
  });

  it('round-trips through ballsToOversDecimal', () => {
    expect(ballsToOversDecimal(oversToBalls(20))).toBe(20);
  });
});

describe('computeStandings', () => {
  it('matches acceptance test #16 exactly: 150/5 in 20 vs 120/8 in 20', () => {
    const teams = [
      { id: 'A', name: 'Team A' },
      { id: 'B', name: 'Team B' },
    ];
    const fixtures: StandingsFixture[] = [
      {
        homeTeamId: 'A',
        awayTeamId: 'B',
        result: {
          homeRuns: 150,
          homeWickets: 5,
          homeOvers: 20,
          awayRuns: 120,
          awayWickets: 8,
          awayOvers: 20,
          winnerTeamId: 'A',
        },
      },
    ];

    const rows = computeStandings(teams, fixtures, SETTINGS);
    const a = rows.find((r) => r.teamId === 'A')!;
    const b = rows.find((r) => r.teamId === 'B')!;

    expect(a.points).toBe(2);
    expect(a.nrr).toBe(1.5);
    expect(b.points).toBe(0);
    expect(b.nrr).toBe(-1.5);
  });

  it('awards pointsTie to both teams on a tie/abandoned result', () => {
    const teams = [
      { id: 'A', name: 'Team A' },
      { id: 'B', name: 'Team B' },
    ];
    const fixtures: StandingsFixture[] = [
      {
        homeTeamId: 'A',
        awayTeamId: 'B',
        result: {
          homeRuns: 100,
          homeWickets: 10,
          homeOvers: 18.4,
          awayRuns: 100,
          awayWickets: 9,
          awayOvers: 20,
          winnerTeamId: null,
        },
      },
    ];
    const rows = computeStandings(teams, fixtures, SETTINGS);
    expect(rows.find((r) => r.teamId === 'A')?.points).toBe(1);
    expect(rows.find((r) => r.teamId === 'B')?.points).toBe(1);
  });

  it('counts points for an abandoned fixture with no result row at all', () => {
    const teams = [
      { id: 'A', name: 'Team A' },
      { id: 'B', name: 'Team B' },
    ];
    const fixtures: StandingsFixture[] = [{ homeTeamId: 'A', awayTeamId: 'B', result: null }];
    const rows = computeStandings(teams, fixtures, SETTINGS);
    expect(rows.find((r) => r.teamId === 'A')?.points).toBe(1);
    expect(rows.find((r) => r.teamId === 'B')?.points).toBe(1);
    expect(rows.find((r) => r.teamId === 'A')?.nrr).toBe(0);
  });

  it('applies settings overrides for pointsWin/pointsTie instead of hardcoded 2/1', () => {
    const teams = [
      { id: 'A', name: 'Team A' },
      { id: 'B', name: 'Team B' },
    ];
    const fixtures: StandingsFixture[] = [
      {
        homeTeamId: 'A',
        awayTeamId: 'B',
        result: {
          homeRuns: 150,
          homeWickets: 5,
          homeOvers: 20,
          awayRuns: 120,
          awayWickets: 8,
          awayOvers: 20,
          winnerTeamId: 'A',
        },
      },
    ];
    const rows = computeStandings(teams, fixtures, { pointsWin: 4, pointsTie: 2 });
    expect(rows.find((r) => r.teamId === 'A')?.points).toBe(4);
  });

  it('sorts by points desc, then NRR desc, then wins desc, then name', () => {
    const teams = [
      { id: 'A', name: 'Zeta' },
      { id: 'B', name: 'Alpha' },
      { id: 'C', name: 'Beta' },
      { id: 'D', name: 'Gamma' },
    ];
    // A and B both finish on 2 points (one win each vs weaker opposition); A's NRR is higher.
    // C and D both finish on 0 points via losses so a same-points/-nrr/-wins case reaches the name tiebreak.
    const fixtures: StandingsFixture[] = [
      {
        homeTeamId: 'A',
        awayTeamId: 'C',
        result: {
          homeRuns: 180,
          homeWickets: 2,
          homeOvers: 20,
          awayRuns: 90,
          awayWickets: 10,
          awayOvers: 20,
          winnerTeamId: 'A',
        },
      },
      {
        homeTeamId: 'B',
        awayTeamId: 'D',
        result: {
          homeRuns: 140,
          homeWickets: 4,
          homeOvers: 20,
          awayRuns: 100,
          awayWickets: 10,
          awayOvers: 20,
          winnerTeamId: 'B',
        },
      },
    ];
    const rows = computeStandings(teams, fixtures, SETTINGS);
    // A/B (2pts) rank above C/D (0pts); within each pair, higher NRR ranks first.
    expect(rows.map((r) => r.teamId)).toEqual(['A', 'B', 'D', 'C']);

    // C and D are both 0 points / 0 NRR-affecting losses aside from being on the wrong side of the
    // same two fixtures above - equalise them directly to exercise the pure name tiebreak.
    const tiedRows = computeStandings(
      [
        { id: 'X', name: 'Zeta' },
        { id: 'Y', name: 'Alpha' },
      ],
      [],
      SETTINGS,
    );
    expect(tiedRows.map((r) => r.teamId)).toEqual(['Y', 'X']);
  });
});
