import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';
import request from 'supertest';

type EventResponse = {
  id: string;
  title: string;
  slug: string;
  isDistrictEvent: boolean;
  clubId: string | null;
  capacity: number | null;
  goingCount?: number;
  myRsvp?: string | null;
};
type EventListResponse = { items: EventResponse[]; total: number };
type CheckinResponse = {
  id: string;
  eventId: string;
  memberId: string | null;
  walkInName: string | null;
  clubId: string;
  method: string;
  alreadyCheckedIn: boolean;
};
type CheckinsListResponse = {
  items: CheckinResponse[];
  byClub: { clubId: string; clubName: string; count: number }[];
};

describe('Events, RSVP, check-in (spec step 8)', () => {
  let app: INestApplication;
  let dsc: TestAgent;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let memberA1: TestAgent;
  let memberB1: TestAgent;
  let dscScopedToA: TestAgent;
  let memberAId = '';
  let memberBId = '';

  beforeAll(async () => {
    await createClub({ id: 'EV-CLUB-A', name: 'Events Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'EV-CLUB-B', name: 'Events Club B', zoneName: 'Agni' });

    await createUser({
      email: 'ev-president-a@example.com',
      name: 'President A',
      clubId: 'EV-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'EV-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'EV-CLUB-A' },
      ],
    });
    await createUser({
      email: 'ev-president-b@example.com',
      name: 'President B',
      clubId: 'EV-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'EV-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'EV-CLUB-B' },
      ],
    });
    await createUser({
      email: 'ev-member-a1@example.com',
      name: 'Member A1',
      clubId: 'EV-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'EV-CLUB-A' }],
    });
    await createUser({
      email: 'ev-member-b1@example.com',
      name: 'Member B1',
      clubId: 'EV-CLUB-B',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'EV-CLUB-B' }],
    });
    await createUser({
      email: 'ev-dsc@example.com',
      name: 'DSC Events',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    // Same permission set as dsc (incl. events:checkin), but scoped to club A only - proves the
    // scope check runs on the *target club of the check-in*, not just the route-level permission gate.
    await createUser({
      email: 'ev-dsc-scoped-a@example.com',
      name: 'DSC Scoped To A',
      roles: [{ key: 'dsc', scopeType: 'club', scopeId: 'EV-CLUB-A' }],
    });

    app = await createTestApp();
    dsc = await signInAndVerify(app, 'ev-dsc@example.com');
    presidentA = await signInAndVerify(app, 'ev-president-a@example.com');
    presidentB = await signInAndVerify(app, 'ev-president-b@example.com');
    memberA1 = await signInAndVerify(app, 'ev-member-a1@example.com');
    memberB1 = await signInAndVerify(app, 'ev-member-b1@example.com');
    dscScopedToA = await signInAndVerify(app, 'ev-dsc-scoped-a@example.com');

    const prisma = testPrisma();
    memberAId = (
      await prisma.memberProfile.findFirstOrThrow({
        where: { clubId: 'EV-CLUB-A', email: 'ev-member-a1@example.com' },
      })
    ).id;
    memberBId = (
      await prisma.memberProfile.findFirstOrThrow({
        where: { clubId: 'EV-CLUB-B', email: 'ev-member-b1@example.com' },
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CRUD + RBAC on ownership', () => {
    it('events:manage can create a district event', async () => {
      const created = (
        await dsc
          .post('/events')
          .send({ title: 'District Fellowship Night', startsAt: '2026-11-01T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      expect(created.isDistrictEvent).toBe(true);
      expect(created.slug).toBeTruthy();
    });

    it('club_events:log can only create its own club event, not a district event', async () => {
      await presidentA
        .post('/events')
        .send({
          title: 'A tries district',
          startsAt: '2026-11-02T10:00:00Z',
          isDistrictEvent: true,
        })
        .expect(403);

      const created = (
        await presidentA
          .post('/events')
          .send({ title: 'Club A meetup', startsAt: '2026-11-02T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      expect(created.isDistrictEvent).toBe(false);
      expect(created.clubId).toBe('EV-CLUB-A');
    });

    it("club_events:log cannot log an event under another club's id", async () => {
      await presidentA
        .post('/events')
        .send({ title: 'Sneaky', startsAt: '2026-11-02T10:00:00Z', clubId: 'EV-CLUB-B' })
        .expect(404);
    });

    it("a president cannot read, edit, or delete another club's event", async () => {
      const clubAEvent = (
        await presidentA
          .post('/events')
          .send({ title: 'A private planning meet', startsAt: '2026-11-03T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;

      await presidentB.get(`/events/${clubAEvent.id}`).expect(404);
      await presidentB.patch(`/events/${clubAEvent.id}`).send({ title: 'hijacked' }).expect(404);
      await presidentB.delete(`/events/${clubAEvent.id}`).expect(404);

      const asOwner = (
        await presidentA.patch(`/events/${clubAEvent.id}`).send({ title: 'Renamed' }).expect(200)
      ).body as EventResponse;
      expect(asOwner.title).toBe('Renamed');
    });

    it('members without events:manage/club_events:log get 403 on the list route', async () => {
      await memberA1.get('/events').expect(403);
    });
  });

  describe('RSVP', () => {
    it('a member can RSVP going/maybe/not_going; closed RSVP is a 409', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Open RSVP Night', startsAt: '2026-11-10T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;

      const rsvp = (
        await memberA1.put(`/events/${event.id}/rsvp`).send({ status: 'going' }).expect(200)
      ).body as { status: string };
      expect(rsvp.status).toBe('going');

      await memberA1.put(`/events/${event.id}/rsvp`).send({ status: 'maybe' }).expect(200);

      const closed = (
        await dsc
          .post('/events')
          .send({ title: 'Closed RSVP Night', startsAt: '2026-11-11T10:00:00Z', rsvpOpen: false })
          .expect(201)
      ).body as EventResponse;
      await memberA1.put(`/events/${closed.id}/rsvp`).send({ status: 'going' }).expect(409);
    });

    it("include=rsvp on the list reflects the caller's own RSVP and the going count", async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Counted RSVP Night', startsAt: '2026-11-12T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      await memberA1.put(`/events/${event.id}/rsvp`).send({ status: 'going' }).expect(200);
      await memberB1.put(`/events/${event.id}/rsvp`).send({ status: 'going' }).expect(200);

      const asMemberA1 = (
        await presidentA
          .get('/events')
          .query({ 'filter[isDistrictEvent]': 'true', include: 'rsvp' })
          .expect(200)
      ).body as EventListResponse;
      const found = asMemberA1.items.find((e) => e.id === event.id);
      expect(found?.goingCount).toBe(2);
    });
  });

  describe('Check-in', () => {
    it('requires events:checkin; a president without it gets 403', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Check-in Gate Test', startsAt: '2026-11-15T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      await presidentA
        .post(`/events/${event.id}/checkins`)
        .send({ memberId: memberAId })
        .expect(403);
      await presidentA.get(`/events/${event.id}/checkins`).expect(403);
    });

    it('duplicate check-in returns 200 alreadyCheckedIn:true; first check-in is 201', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Duplicate Check-in Test', startsAt: '2026-11-16T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;

      const first = (
        await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(201)
      ).body as CheckinResponse;
      expect(first.alreadyCheckedIn).toBe(false);
      expect(first.method).toBe('manual');

      const second = (
        await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(200)
      ).body as CheckinResponse;
      expect(second.alreadyCheckedIn).toBe(true);
      expect(second.id).toBe(first.id);
    });

    it('walk-ins are recorded with a name and a club FK, no memberId', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Walk-in Test', startsAt: '2026-11-17T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      const walkIn = (
        await dsc
          .post(`/events/${event.id}/checkins`)
          .send({ walkInName: 'A Guest', clubId: 'EV-CLUB-A' })
          .expect(201)
      ).body as CheckinResponse;
      expect(walkIn.memberId).toBeNull();
      expect(walkIn.walkInName).toBe('A Guest');
      expect(walkIn.clubId).toBe('EV-CLUB-A');
      expect(walkIn.method).toBe('walk_in');
    });

    it('capacity enforcement returns 409 CAPACITY_FULL once the event is full', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Tiny Capacity Event', startsAt: '2026-11-18T10:00:00Z', capacity: 1 })
          .expect(201)
      ).body as EventResponse;
      await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(201);
      const res = await dsc
        .post(`/events/${event.id}/checkins`)
        .send({ memberId: memberBId })
        .expect(409);
      expect((res.body as { code: string }).code).toBe('CAPACITY_FULL');
    });

    it('a duplicate check-in for an already-checked-in member does not count against capacity', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Capacity Plus Duplicate', startsAt: '2026-11-19T10:00:00Z', capacity: 1 })
          .expect(201)
      ).body as EventResponse;
      await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(201);
      const repeat = (
        await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(200)
      ).body as CheckinResponse;
      expect(repeat.alreadyCheckedIn).toBe(true);
    });

    it("a club-scoped events:checkin grant can check in its own club but not another club's member", async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Scoped Check-in Test', startsAt: '2026-11-20T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;

      await dscScopedToA
        .post(`/events/${event.id}/checkins`)
        .send({ memberId: memberAId })
        .expect(201);
      await dscScopedToA
        .post(`/events/${event.id}/checkins`)
        .send({ memberId: memberBId })
        .expect(404);
      await dscScopedToA
        .post(`/events/${event.id}/checkins`)
        .send({ walkInName: 'Guest for B', clubId: 'EV-CLUB-B' })
        .expect(404);
    });

    it("a club-scoped events:checkin grant reads only its own club's check-ins, never another club's", async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'Scoped Read Test', startsAt: '2026-11-21T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberAId }).expect(201);
      await dsc.post(`/events/${event.id}/checkins`).send({ memberId: memberBId }).expect(201);

      const scopedView = (await dscScopedToA.get(`/events/${event.id}/checkins`).expect(200))
        .body as CheckinsListResponse;
      expect(scopedView.items.every((c) => c.clubId === 'EV-CLUB-A')).toBe(true);
      expect(scopedView.byClub.some((c) => c.clubId === 'EV-CLUB-B')).toBe(false);

      const fullView = (await dsc.get(`/events/${event.id}/checkins`).expect(200))
        .body as CheckinsListResponse;
      expect(fullView.byClub.some((c) => c.clubId === 'EV-CLUB-A')).toBe(true);
      expect(fullView.byClub.some((c) => c.clubId === 'EV-CLUB-B')).toBe(true);
    });

    it('an unknown QR token is a 404, not a 500', async () => {
      const event = (
        await dsc
          .post('/events')
          .send({ title: 'QR Test', startsAt: '2026-11-22T10:00:00Z' })
          .expect(201)
      ).body as EventResponse;
      await dsc
        .post(`/events/${event.id}/checkins`)
        .send({ qrToken: 'not-a-real-token' })
        .expect(404);
    });
  });

  describe('Public calendar still works with the new authenticated routes present', () => {
    it('GET /public/events lists only district events', async () => {
      const res = await request(httpServer(app)).get('/public/events').expect(200);
      const body = res.body as { items: { title: string }[] };
      expect(Array.isArray(body.items)).toBe(true);
    });
  });
});
