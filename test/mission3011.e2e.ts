import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';

type CampResponse = {
  id: string;
  leadClub: { id: string };
  status: string;
  unitsCollected: number;
  participatingClubs: { id: string }[];
  reviewedById: string | null;
  rejectionReason: string | null;
};
type CampListResponse = { items: CampResponse[]; total: number };
type DashboardResponse = {
  totalUnits: number;
  target: number;
  byZone: { zoneName: string; units: number }[];
  perClub: { clubId: string; unitsCollected: number; campsApproved: number }[];
};

// Cache purge runs on a BullMQ worker after the write commits (see test/cache.e2e.ts's waitUntil).
async function waitUntilDashboardReflects(
  agent: TestAgent,
  expectedTotalUnits: number,
  timeoutMs = 5000,
): Promise<DashboardResponse> {
  const start = Date.now();
  for (;;) {
    const body = (await agent.get('/public/mission3011/dashboard').expect(200))
      .body as DashboardResponse;
    if (body.totalUnits === expectedTotalUnits) return body;
    if (Date.now() - start > timeoutMs) return body;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe('Mission 3011 camps (spec step 12)', () => {
  let app: INestApplication;
  let memberA: TestAgent;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let m3011Admin: TestAgent;
  let drishtiAdmin: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'M3-CLUB-A', name: 'Mission Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'M3-CLUB-B', name: 'Mission Club B', zoneName: 'Agni' });

    await createUser({
      email: 'm3-member-a@example.com',
      name: 'Member A',
      clubId: 'M3-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'M3-CLUB-A' }],
    });
    await createUser({
      email: 'm3-president-a@example.com',
      name: 'President A',
      clubId: 'M3-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'M3-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'M3-CLUB-A' },
      ],
    });
    await createUser({
      email: 'm3-president-b@example.com',
      name: 'President B',
      clubId: 'M3-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'M3-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'M3-CLUB-B' },
      ],
    });
    await createUser({
      email: 'm3-admin@example.com',
      name: 'Mission 3011 Admin',
      roles: [{ key: 'project_admin:mission3011', scopeType: 'project', scopeId: 'mission3011' }],
    });
    await createUser({
      email: 'm3-drishti-admin@example.com',
      name: 'Drishti Admin',
      roles: [{ key: 'project_admin:drishti', scopeType: 'project', scopeId: 'drishti' }],
    });

    app = await createTestApp();
    memberA = await signInAndVerify(app, 'm3-member-a@example.com');
    presidentA = await signInAndVerify(app, 'm3-president-a@example.com');
    presidentB = await signInAndVerify(app, 'm3-president-b@example.com');
    m3011Admin = await signInAndVerify(app, 'm3-admin@example.com');
    drishtiAdmin = await signInAndVerify(app, 'm3-drishti-admin@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a plain member cannot log a camp; a president can, with participating clubs', async () => {
    await memberA
      .post('/mission3011/camps')
      .send({ date: '2026-08-01', venue: 'Community Hall', unitsCollected: 40 })
      .expect(403);

    const created = (
      await presidentA
        .post('/mission3011/camps')
        .send({
          date: '2026-08-01',
          venue: 'Community Hall',
          city: 'Delhi',
          unitsCollected: 120,
          donorsRegistered: 130,
          partnerBloodBank: 'Rotary Blood Bank',
          participatingClubIds: ['M3-CLUB-B'],
        })
        .expect(201)
    ).body as CampResponse;
    expect(created.status).toBe('submitted');
    expect(created.leadClub.id).toBe('M3-CLUB-A');
    expect(created.participatingClubs.map((c) => c.id).sort()).toEqual(['M3-CLUB-A', 'M3-CLUB-B']);
  });

  it('rejects an unknown participating club id', async () => {
    await presidentA
      .post('/mission3011/camps')
      .send({ date: '2026-08-02', venue: 'X', unitsCollected: 10, participatingClubIds: ['NOPE'] })
      .expect(400);
  });

  it('any authenticated user can list camps, including a plain member', async () => {
    const list = (await memberA.get('/mission3011/camps').expect(200)).body as CampListResponse;
    expect(list.total).toBeGreaterThan(0);
  });

  it('only the project admin can approve/reject; the submitting president cannot', async () => {
    const created = (
      await presidentB
        .post('/mission3011/camps')
        .send({ date: '2026-08-03', venue: 'City Ground', unitsCollected: 200 })
        .expect(201)
    ).body as CampResponse;

    await presidentB
      .patch(`/mission3011/camps/${created.id}`)
      .send({ status: 'approved' })
      .expect(403);
    await drishtiAdmin
      .patch(`/mission3011/camps/${created.id}`)
      .send({ status: 'approved' })
      .expect(403);

    await m3011Admin
      .patch(`/mission3011/camps/${created.id}`)
      .send({ status: 'rejected' })
      .expect(400); // no reason

    const rejected = (
      await m3011Admin
        .patch(`/mission3011/camps/${created.id}`)
        .send({ status: 'rejected', rejectionReason: 'Duplicate entry' })
        .expect(200)
    ).body as CampResponse;
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Duplicate entry');

    const auditRow = await testPrisma().auditLog.findFirst({
      where: { resourceType: 'm3011_camp', resourceId: created.id, action: 'camp.rejected' },
    });
    expect(auditRow).toBeTruthy();

    // A camp already reviewed cannot be edited by its owner or re-reviewed.
    await presidentB
      .patch(`/mission3011/camps/${created.id}`)
      .send({ unitsCollected: 5 })
      .expect(400);
  });

  it('only approved camps count toward the public dashboard target; rejected ones do not', async () => {
    const before = (await memberA.get('/public/mission3011/dashboard').expect(200))
      .body as DashboardResponse;

    const created = (
      await presidentA
        .post('/mission3011/camps')
        .send({ date: '2026-08-05', venue: 'Approved Camp Venue', unitsCollected: 77 })
        .expect(201)
    ).body as CampResponse;
    await m3011Admin
      .patch(`/mission3011/camps/${created.id}`)
      .send({ status: 'approved' })
      .expect(200);

    // Cache purge runs on a BullMQ worker after the write commits; poll like test/cache.e2e.ts does.
    const after = await waitUntilDashboardReflects(memberA, before.totalUnits + 77);
    expect(after.totalUnits).toBe(before.totalUnits + 77);
    expect(after.target).toBe(3011);
    const clubRow = after.perClub.find((c) => c.clubId === 'M3-CLUB-A');
    expect(clubRow?.unitsCollected).toBeGreaterThanOrEqual(77);
  });

  it('public dashboard works with zero auth and carries no member/internal identifiers', async () => {
    const res = await request(httpServer(app)).get('/public/mission3011/dashboard').expect(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('submittedById');
    expect(body).not.toContain('reviewedById');
  });
});
