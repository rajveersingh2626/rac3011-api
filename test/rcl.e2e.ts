import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';

const SEASON = 2099;

type TeamResponse = {
  id: string;
  club: { id: string };
  name: string;
  status: string;
  players: { name: string; memberId: string | null; role: string | null }[];
};
type TeamListResponse = { items: TeamResponse[]; total: number };
type FixtureResponse = {
  id: string;
  homeTeam: { id: string };
  awayTeam: { id: string };
  status: string;
  result: { homeRuns: number; awayRuns: number; winnerTeamId: string | null } | null;
};
type StandingsResponse = {
  season: number;
  standings: { teamId: string; teamName: string; points: number; nrr: number }[];
};
type FixtureListResponse = { items: FixtureResponse[]; total: number };

describe('RCL teams/fixtures/standings (spec §7-9)', () => {
  let app: INestApplication;
  let memberA: TestAgent;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let rclAdmin: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'RCL-CLUB-A', name: 'RCL Club A', zoneName: 'Vayu' });
    await createClub({ id: 'RCL-CLUB-B', name: 'RCL Club B', zoneName: 'Prithvi' });

    await createUser({
      email: 'rcl-member-a@example.com',
      name: 'Member A',
      clubId: 'RCL-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'RCL-CLUB-A' }],
    });
    await createUser({
      email: 'rcl-president-a@example.com',
      name: 'President A',
      clubId: 'RCL-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RCL-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'RCL-CLUB-A' },
      ],
    });
    await createUser({
      email: 'rcl-president-b@example.com',
      name: 'President B',
      clubId: 'RCL-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RCL-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'RCL-CLUB-B' },
      ],
    });
    await createUser({
      email: 'rcl-admin@example.com',
      name: 'RCL Admin',
      roles: [{ key: 'project_admin:rcl', scopeType: 'project', scopeId: 'rcl' }],
    });

    app = await createTestApp();
    memberA = await signInAndVerify(app, 'rcl-member-a@example.com');
    presidentA = await signInAndVerify(app, 'rcl-president-a@example.com');
    presidentB = await signInAndVerify(app, 'rcl-president-b@example.com');
    rclAdmin = await signInAndVerify(app, 'rcl-admin@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a plain member cannot register a team; a president can, for their own club', async () => {
    await memberA
      .post('/rcl/teams')
      .send({
        clubId: 'RCL-CLUB-A',
        name: 'A Strikers',
        captainName: 'Aman',
        captainPhone: '9876500001',
        season: SEASON,
      })
      .expect(403);

    const created = (
      await presidentA
        .post('/rcl/teams')
        .send({
          clubId: 'RCL-CLUB-A',
          name: 'A Strikers',
          captainName: 'Aman',
          captainPhone: '9876500001',
          season: SEASON,
          players: [
            { name: 'Aman Verma', role: 'batter' },
            { name: 'Kabir Singh', role: 'bowler' },
          ],
        })
        .expect(201)
    ).body as TeamResponse;
    expect(created.club.id).toBe('RCL-CLUB-A');
    expect(created.status).toBe('registered');
    expect(created.players).toHaveLength(2);
  });

  it('rejects a president registering a team for a club that is not their own (403, no scope for that club)', async () => {
    await presidentA
      .post('/rcl/teams')
      .send({
        clubId: 'RCL-CLUB-B',
        name: 'Hijacked Team',
        captainName: 'Aman',
        captainPhone: '9876500001',
        season: SEASON,
      })
      .expect(403);
  });

  it('one team per club per season: a second registration attempt 409s, not 500', async () => {
    await presidentA
      .post('/rcl/teams')
      .send({
        clubId: 'RCL-CLUB-A',
        name: 'A Strikers Again',
        captainName: 'Aman',
        captainPhone: '9876500001',
        season: SEASON,
      })
      .expect(409);
  });

  it("a president cannot list or PATCH another club's team (404, not 403 - ground rule 4)", async () => {
    const teamB = (
      await presidentB
        .post('/rcl/teams')
        .send({
          clubId: 'RCL-CLUB-B',
          name: 'B Blasters',
          captainName: 'Rohit',
          captainPhone: '9876500002',
          season: SEASON,
          players: [{ name: 'Rohit Shetty', role: 'captain' }],
        })
        .expect(201)
    ).body as TeamResponse;

    const listAsPresidentA = (await presidentA.get(`/rcl/teams?season=${SEASON}`).expect(200))
      .body as TeamListResponse;
    expect(listAsPresidentA.items.some((t) => t.id === teamB.id)).toBe(false);

    await presidentA.get(`/rcl/teams/${teamB.id}`).expect(404);
    await presidentA.patch(`/rcl/teams/${teamB.id}`).send({ status: 'confirmed' }).expect(404);

    const listAsAdmin = (await rclAdmin.get(`/rcl/teams?season=${SEASON}`).expect(200))
      .body as TeamListResponse;
    expect(listAsAdmin.items.some((t) => t.id === teamB.id)).toBe(true);
  });

  it('the owning president can update captain info, roster and status', async () => {
    const teamA = (
      await presidentA.get(`/rcl/teams?season=${SEASON}&clubId=RCL-CLUB-A`).expect(200)
    ).body as TeamListResponse;
    const id = teamA.items[0].id;

    const updated = (
      await presidentA
        .patch(`/rcl/teams/${id}`)
        .send({
          status: 'confirmed',
          players: [
            { name: 'Aman Verma', role: 'batter' },
            { name: 'Kabir Singh', role: 'bowler' },
            { name: 'Neha Gupta', role: 'all-rounder' },
          ],
        })
        .expect(200)
    ).body as TeamResponse;
    expect(updated.status).toBe('confirmed');
    expect(updated.players).toHaveLength(3);
  });

  it('a member holding no relevant permission gets 403 attempting to create a fixture', async () => {
    await memberA
      .post('/rcl/fixtures')
      .send({
        homeTeamId: 'does-not-matter',
        awayTeamId: 'does-not-matter-2',
        scheduledAt: '2099-10-04T10:00:00.000Z',
      })
      .expect(403);
  });

  it('a club president (no manage grant) cannot create a fixture either - admin only', async () => {
    const teams = (await rclAdmin.get(`/rcl/teams?season=${SEASON}`).expect(200))
      .body as TeamListResponse;
    const teamA = teams.items.find((t) => t.club.id === 'RCL-CLUB-A')!;
    const teamB = teams.items.find((t) => t.club.id === 'RCL-CLUB-B')!;

    await presidentA
      .post('/rcl/fixtures')
      .send({
        homeTeamId: teamA.id,
        awayTeamId: teamB.id,
        scheduledAt: '2099-10-04T10:00:00.000Z',
        venue: 'District Ground',
      })
      .expect(403);
  });

  it('acceptance test #16, end to end: 150/5 in 20 vs 120/8 in 20 gives +1.5/-1.5 NRR and 2/0 points', async () => {
    const teams = (await rclAdmin.get(`/rcl/teams?season=${SEASON}`).expect(200))
      .body as TeamListResponse;
    const teamA = teams.items.find((t) => t.club.id === 'RCL-CLUB-A')!;
    const teamB = teams.items.find((t) => t.club.id === 'RCL-CLUB-B')!;

    const fixture = (
      await rclAdmin
        .post('/rcl/fixtures')
        .send({
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          scheduledAt: '2099-10-04T10:00:00.000Z',
          venue: 'District Ground',
        })
        .expect(201)
    ).body as FixtureResponse;
    expect(fixture.status).toBe('scheduled');

    // A non-existent team id for winnerTeamId must 400, not silently accept it.
    await rclAdmin
      .put(`/rcl/fixtures/${fixture.id}`)
      .send({
        result: {
          homeRuns: 150,
          homeWickets: 5,
          homeOvers: 20,
          awayRuns: 120,
          awayWickets: 8,
          awayOvers: 20,
          winnerTeamId: 'not-a-real-team-id',
        },
      })
      .expect(400);

    const completed = (
      await rclAdmin
        .put(`/rcl/fixtures/${fixture.id}`)
        .send({
          result: {
            homeRuns: 150,
            homeWickets: 5,
            homeOvers: 20,
            awayRuns: 120,
            awayWickets: 8,
            awayOvers: 20,
            winnerTeamId: teamA.id,
          },
        })
        .expect(200)
    ).body as FixtureResponse;
    expect(completed.status).toBe('completed');
    expect(completed.result?.winnerTeamId).toBe(teamA.id);

    const standings = (
      await request(httpServer(app)).get(`/public/rcl/standings?season=${SEASON}`).expect(200)
    ).body as StandingsResponse;
    const rowA = standings.standings.find((r) => r.teamId === teamA.id);
    const rowB = standings.standings.find((r) => r.teamId === teamB.id);
    expect(rowA?.points).toBe(2);
    expect(rowA?.nrr).toBe(1.5);
    expect(rowB?.points).toBe(0);
    expect(rowB?.nrr).toBe(-1.5);
    // Winner ranks first (higher points).
    expect(standings.standings[0].teamId).toBe(teamA.id);
  });

  it('an abandoned fixture with no score can still be recorded, awarding a tie point each', async () => {
    const teams = (await rclAdmin.get(`/rcl/teams?season=${SEASON}`).expect(200))
      .body as TeamListResponse;
    const teamA = teams.items.find((t) => t.club.id === 'RCL-CLUB-A')!;
    const teamB = teams.items.find((t) => t.club.id === 'RCL-CLUB-B')!;

    const fixture = (
      await rclAdmin
        .post('/rcl/fixtures')
        .send({
          homeTeamId: teamA.id,
          awayTeamId: teamB.id,
          scheduledAt: '2099-11-01T10:00:00.000Z',
        })
        .expect(201)
    ).body as FixtureResponse;

    const abandoned = (
      await rclAdmin.put(`/rcl/fixtures/${fixture.id}`).send({ status: 'abandoned' }).expect(200)
    ).body as FixtureResponse;
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.result).toBeNull();
  });

  it('public fixtures and standings work with zero auth', async () => {
    const fixturesRes = await request(httpServer(app))
      .get(`/public/rcl/fixtures?season=${SEASON}`)
      .expect(200);
    const fixtures = fixturesRes.body as FixtureListResponse;
    expect(fixtures.total).toBeGreaterThanOrEqual(2);

    const standingsRes = await request(httpServer(app))
      .get(`/public/rcl/standings?season=${SEASON}`)
      .expect(200);
    const standings = standingsRes.body as StandingsResponse;
    expect(standings.season).toBe(SEASON);
    expect(standings.standings.length).toBeGreaterThanOrEqual(2);
  });
});
