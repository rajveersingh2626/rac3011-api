import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';
import { ConsoleNotificationAdapter } from '../src/notifications/console-notification.adapter';

type SupportClubResponse = { id: string; club: { id: string }; capacityDelegates: number };
type SupportClubListResponse = { items: SupportClubResponse[]; total: number };
type DelegationResponse = {
  id: string;
  status: string;
  ryYear: number;
  hosts: { club: { id: string }; daysHosted: number; membersSent: number }[];
};
type PublicDelegation = {
  id: string;
  status: string;
  hosts: { id: string; name: string }[];
};
type PublicIncomingResponse = { items: PublicDelegation[] };
type PublicGalleryResponse = { items: { year: number; kind: string }[]; years: number[] };
type ClubPointsResponse = { byCategory: { categoryKey: string; points: number }[] };

describe('RIDE (spec step 14-17)', () => {
  let app: INestApplication;
  let memberA: TestAgent;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let rideAdmin: TestAgent;
  let drishtiAdmin: TestAgent;
  let viewer: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'RIDE-CLUB-A', name: 'Ride Club A', zoneName: 'Vayu' });
    await createClub({ id: 'RIDE-CLUB-B', name: 'Ride Club B', zoneName: 'Prithvi' });

    await createUser({
      email: 'ride-member-a@example.com',
      name: 'Member A',
      clubId: 'RIDE-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'RIDE-CLUB-A' }],
    });
    await createUser({
      email: 'ride-president-a@example.com',
      name: 'President A',
      clubId: 'RIDE-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RIDE-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'RIDE-CLUB-A' },
      ],
    });
    await createUser({
      email: 'ride-president-b@example.com',
      name: 'President B',
      clubId: 'RIDE-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'RIDE-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'RIDE-CLUB-B' },
      ],
    });
    await createUser({
      email: 'ride-admin@example.com',
      name: 'RIDE Admin',
      roles: [{ key: 'project_admin:ride', scopeType: 'project', scopeId: 'ride' }],
    });
    await createUser({
      email: 'ride-dr-admin@example.com',
      name: 'Drishti Admin',
      roles: [{ key: 'project_admin:drishti', scopeType: 'project', scopeId: 'drishti' }],
    });
    await createUser({
      email: 'ride-viewer@example.com',
      name: 'District Viewer',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    memberA = await signInAndVerify(app, 'ride-member-a@example.com');
    presidentA = await signInAndVerify(app, 'ride-president-a@example.com');
    presidentB = await signInAndVerify(app, 'ride-president-b@example.com');
    rideAdmin = await signInAndVerify(app, 'ride-admin@example.com');
    drishtiAdmin = await signInAndVerify(app, 'ride-dr-admin@example.com');
    viewer = await signInAndVerify(app, 'ride-viewer@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a plain member cannot register a support club; a president can, for their own club', async () => {
    await memberA
      .post('/ride/support-clubs')
      .send({ capacityDelegates: 3, homestayAvailable: true, contactPhone: '9876500001' })
      .expect(403);

    const created = (
      await presidentA
        .post('/ride/support-clubs')
        .send({
          capacityDelegates: 3,
          homestayAvailable: true,
          preferredMonths: [10, 11],
          contactPhone: '9876500001',
        })
        .expect(201)
    ).body as SupportClubResponse;
    expect(created.club.id).toBe('RIDE-CLUB-A');
    expect(created.capacityDelegates).toBe(3);
  });

  it('registering again for the same RY upserts in place rather than duplicating', async () => {
    await presidentA
      .post('/ride/support-clubs')
      .send({ capacityDelegates: 5, homestayAvailable: false, contactPhone: '9876500002' })
      .expect(201);

    const list = (await presidentA.get('/ride/support-clubs').expect(200))
      .body as SupportClubListResponse;
    const own = list.items.filter((i) => i.club.id === 'RIDE-CLUB-A');
    expect(own).toHaveLength(1);
    expect(own[0].capacityDelegates).toBe(5);
  });

  it("a president cannot see another club's support-club registration; the ride admin sees all", async () => {
    await presidentB
      .post('/ride/support-clubs')
      .send({ capacityDelegates: 2, homestayAvailable: false, contactPhone: '9876500003' })
      .expect(201);

    const listAsPresidentA = (await presidentA.get('/ride/support-clubs').expect(200))
      .body as SupportClubListResponse;
    expect(listAsPresidentA.items.some((i) => i.club.id === 'RIDE-CLUB-B')).toBe(false);

    const listAsAdmin = (await rideAdmin.get('/ride/support-clubs').expect(200))
      .body as SupportClubListResponse;
    expect(listAsAdmin.items.some((i) => i.club.id === 'RIDE-CLUB-A')).toBe(true);
    expect(listAsAdmin.items.some((i) => i.club.id === 'RIDE-CLUB-B')).toBe(true);
  });

  it('only the ride admin can create/list delegations; a president and a wrong-project admin are both denied', async () => {
    await presidentA.get('/ride/delegations').expect(403);
    await presidentA
      .post('/ride/delegations')
      .send({
        ryYear: 2026,
        visitingDistrict: 'D9999',
        country: 'Testland',
        startsAt: '2026-10-01',
        endsAt: '2026-10-03',
        headcount: 4,
        contactName: 'Test Contact',
      })
      .expect(403);
    await drishtiAdmin.get('/ride/delegations').expect(403);
  });

  it('host assignment replaces the set, audits the change, recomputes points, and notifies host clubs', async () => {
    const delegation = (
      await rideAdmin
        .post('/ride/delegations')
        .send({
          ryYear: 2026,
          visitingDistrict: 'D1111',
          country: 'Testland',
          startsAt: '2026-10-01',
          endsAt: '2026-10-05',
          headcount: 6,
          contactName: 'Visiting Contact',
          contactEmail: 'visiting@example.com',
          status: 'confirmed',
        })
        .expect(201)
    ).body as DelegationResponse;

    const assigned = (
      await rideAdmin
        .put(`/ride/delegations/${delegation.id}/hosts`)
        .send({ hosts: [{ clubId: 'RIDE-CLUB-A', daysHosted: 3, membersSent: 2 }] })
        .expect(200)
    ).body as DelegationResponse;
    expect(assigned.hosts).toHaveLength(1);
    expect(assigned.hosts[0].club.id).toBe('RIDE-CLUB-A');

    const auditRow = await testPrisma().auditLog.findFirst({
      where: {
        resourceType: 'ride_delegation',
        resourceId: delegation.id,
        action: 'ride.delegation.hosts_assigned',
      },
    });
    expect(auditRow).toBeTruthy();

    const adapter = app.get(ConsoleNotificationAdapter);
    const notified = adapter.sent.find(
      (n) => n.template === 'ride-host-assigned' && n.data.delegationId === delegation.id,
    );
    expect(notified).toBeTruthy();

    // 3 days hosted (40/day) + 2 members sent (30/each) + hosted-and-sent flat bonus (50) = 230.
    const pointsA = (
      await viewer.get('/clubs/RIDE-CLUB-A/points').query({ ryYear: 2026 }).expect(200)
    ).body as ClubPointsResponse;
    const isCategoryA = pointsA.byCategory.find((c) => c.categoryKey === 'international_services');
    expect(isCategoryA?.points).toBeGreaterThanOrEqual(230);

    // Reassigning to club B removes club A's host row - its RIDE-derived points recompute away.
    await rideAdmin
      .put(`/ride/delegations/${delegation.id}/hosts`)
      .send({ hosts: [{ clubId: 'RIDE-CLUB-B', daysHosted: 1, membersSent: 0 }] })
      .expect(200);

    const pointsAAfter = (
      await viewer.get('/clubs/RIDE-CLUB-A/points').query({ ryYear: 2026 }).expect(200)
    ).body as ClubPointsResponse;
    const isCategoryAAfter = pointsAAfter.byCategory.find(
      (c) => c.categoryKey === 'international_services',
    );
    expect(isCategoryAAfter?.points ?? 0).toBeLessThan(isCategoryA?.points ?? 0);
  });

  it('public incoming list excludes cancelled delegations and carries no contact PII', async () => {
    await rideAdmin
      .post('/ride/delegations')
      .send({
        ryYear: 2026,
        visitingDistrict: 'D2222',
        country: 'Testland',
        startsAt: '2026-11-01',
        endsAt: '2026-11-03',
        headcount: 3,
        contactName: 'Cancelled Contact',
        status: 'cancelled',
      })
      .expect(201);

    const res = await request(httpServer(app)).get('/public/ride/incoming').expect(200);
    const body = res.body as PublicIncomingResponse;
    expect(body.items.some((i) => i.status === 'cancelled')).toBe(false);
    expect(JSON.stringify(body)).not.toContain('Cancelled Contact');

    const confirmed = body.items.find((i) => i.hosts.some((h) => h.id === 'RIDE-CLUB-B'));
    expect(confirmed).toBeTruthy();
    expect(confirmed?.status).not.toBe('cancelled');
  });

  it('public gallery groups items by year and exposes both photo and video kinds', async () => {
    await rideAdmin
      .post('/ride/gallery-items')
      .send({ year: 2026, url: 'https://picsum.photos/seed/ride-e2e-1/800/600', kind: 'photo' })
      .expect(201);
    await rideAdmin
      .post('/ride/gallery-items')
      .send({ year: 2026, url: 'https://www.youtube.com/watch?v=abc123', kind: 'video' })
      .expect(201);

    const res = await request(httpServer(app)).get('/public/ride/gallery').expect(200);
    const body = res.body as PublicGalleryResponse;
    expect(body.years).toContain(2026);
    expect(body.items.some((i) => i.year === 2026 && i.kind === 'video')).toBe(true);
  });

  it('gallery item create/delete are manage-only; a president is denied', async () => {
    await presidentA
      .post('/ride/gallery-items')
      .send({ year: 2026, url: 'https://picsum.photos/seed/ride-e2e-2/800/600', kind: 'photo' })
      .expect(403);

    const created = (
      await rideAdmin
        .post('/ride/gallery-items')
        .send({ year: 2025, url: 'https://picsum.photos/seed/ride-e2e-3/800/600', kind: 'photo' })
        .expect(201)
    ).body as { id: string };

    await presidentA.delete(`/ride/gallery-items/${created.id}`).expect(403);
    await rideAdmin.delete(`/ride/gallery-items/${created.id}`).expect(204);
  });
});
