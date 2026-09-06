import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BOOKING_REFERENCE_PATTERN } from '../src/drr-bookings/booking-reference.util';
import { ConsoleNotificationAdapter } from '../src/notifications/console-notification.adapter';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';

type SubmitResponse = { received: boolean; reference: string | null; status?: string };
type PublicBooking = {
  reference: string;
  purpose: string;
  clubId: string | null;
  requesterName: string;
  startsAt: string;
  status: string;
  decisionReason: string | null;
};
type AdminBooking = PublicBooking & {
  id: string;
  requesterEmail: string;
  requesterPhone: string;
  decidedById: string | null;
};
type AdminList = { items: AdminBooking[]; total: number; page: number; pageSize: number };

const REQUESTER = 'installation-host@example.com';

// The public submit route is capped at 3/hour/IP, and every e2e request here shares one IP,
// so this file spends its budget deliberately: two real bookings, one honeypot, then the 429.
function submitBooking(app: INestApplication, body: Record<string, unknown>) {
  return request(httpServer(app)).post('/public/drr-bookings').send(body);
}

describe('DRR booking requests', () => {
  let app: INestApplication;
  let officer: TestAgent;
  let clubScopedOfficer: TestAgent;
  let dsc: TestAgent;
  let member: TestAgent;
  let bothRolesUserId: string;
  let confirmed: AdminBooking;
  let declined: AdminBooking;

  beforeAll(async () => {
    await createClub({ id: 'DRR-CLUB-A', name: 'DRR Booking Club', zoneName: 'Prithvi' });
    await createUser({
      email: 'drr-officer@example.com',
      name: 'District Rotaract Representative',
      roles: [{ key: 'drr', scopeType: 'none' }],
    });
    await createUser({
      email: 'drr-club-officer@example.com',
      name: 'Club Scoped Calendar Grant',
      clubId: 'DRR-CLUB-A',
      roles: [{ key: 'drr', scopeType: 'club', scopeId: 'DRR-CLUB-A' }],
    });
    await createUser({
      email: 'drr-dsc@example.com',
      name: 'DSC Triaging For The DRR',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    // Holds the key through two district roles: must still be notified exactly once.
    bothRolesUserId = (
      await createUser({
        email: 'drr-both-roles@example.com',
        name: 'DRR Who Is Also On The Secretariat',
        roles: [
          { key: 'drr', scopeType: 'none' },
          { key: 'dsc', scopeType: 'none' },
        ],
      })
    ).id;
    await createUser({
      email: 'drr-member@example.com',
      name: 'Ordinary Member',
      clubId: 'DRR-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'DRR-CLUB-A' }],
    });

    app = await createTestApp();
    officer = await signInAndVerify(app, 'drr-officer@example.com');
    clubScopedOfficer = await signInAndVerify(app, 'drr-club-officer@example.com');
    dsc = await signInAndVerify(app, 'drr-dsc@example.com');
    member = await signInAndVerify(app, 'drr-member@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a visitor request is persisted as a real row and notifies the officers', async () => {
    const body = (
      await submitBooking(app, {
        purpose: 'installation',
        clubId: 'DRR-CLUB-A',
        requesterName: 'Installation Host',
        requesterEmail: REQUESTER,
        requesterPhone: '+919876543210',
        startsAt: '2027-01-15T12:00:00.000Z',
        endsAt: '2027-01-15T14:00:00.000Z',
        notes: 'Installation ceremony, please arrive by 5pm.',
      }).expect(201)
    ).body as SubmitResponse;

    expect(body.received).toBe(true);
    expect(body.reference).toMatch(BOOKING_REFERENCE_PATTERN);
    expect(body.status).toBe('requested');

    const row = await testPrisma().drrBooking.findUniqueOrThrow({
      where: { reference: body.reference as string },
    });
    expect(row.clubId).toBe('DRR-CLUB-A');
    expect(row.requesterEmail).toBe(REQUESTER);
    expect(row.status).toBe('requested');
    expect(row.startsAt.toISOString()).toBe('2027-01-15T12:00:00.000Z');

    const notification = app
      .get(ConsoleNotificationAdapter)
      .lastFor('drr-officer@example.com', 'booking-requested');
    expect(notification).toBeTruthy();
    expect(notification?.to.filter((t) => t.userId === bothRolesUserId)).toHaveLength(1);
    expect(notification?.data).toMatchObject({
      reference: body.reference,
      requesterName: 'Installation Host',
      purpose: 'installation',
      startsAt: '2027-01-15T12:00:00.000Z',
    });

    confirmed = (await officer.get(`/drr-bookings/${row.id}`).expect(200)).body as AdminBooking;
  });

  it('a visitor can look their own request up by reference, without leaking contact details', async () => {
    const found = (
      await request(httpServer(app)).get(`/public/drr-bookings/${confirmed.reference}`).expect(200)
    ).body as PublicBooking & Record<string, unknown>;

    expect(found.reference).toBe(confirmed.reference);
    expect(found.status).toBe('requested');
    expect(found.requesterName).toBe('Installation Host');
    expect(found.requesterEmail).toBeUndefined();
    expect(found.requesterPhone).toBeUndefined();
    expect(found.id).toBeUndefined();
  });

  it('an unknown reference is a 404, not an empty booking', async () => {
    await request(httpServer(app)).get('/public/drr-bookings/DRR-2601-ZZZZZZ').expect(404);
    // Not reference-shaped: rejected before the lookup runs.
    await request(httpServer(app)).get('/public/drr-bookings/nonsense').expect(404);
  });

  it('only drr_calendar:manage holders can see or decide bookings', async () => {
    await request(httpServer(app)).get('/drr-bookings').expect(401);
    await member.get('/drr-bookings').expect(403);
    await member.patch(`/drr-bookings/${confirmed.id}`).send({ status: 'confirmed' }).expect(403);

    const list = (await officer.get('/drr-bookings?filter[status]=requested').expect(200))
      .body as AdminList;
    expect(list.items.some((b) => b.id === confirmed.id)).toBe(true);
  });

  it('the secretariat holds the key too, and triages on the DRR behalf', async () => {
    const list = (await dsc.get('/drr-bookings?filter[status]=requested').expect(200))
      .body as AdminList;
    expect(list.items.some((b) => b.id === confirmed.id)).toBe(true);
    await dsc.get(`/drr-bookings/${confirmed.id}`).expect(200);
  });

  it('a club-scoped grant of drr_calendar:manage is refused, not widened to the district', async () => {
    await clubScopedOfficer.get('/drr-bookings').expect(403);
    await clubScopedOfficer.get(`/drr-bookings/${confirmed.id}`).expect(403);
    await clubScopedOfficer
      .patch(`/drr-bookings/${confirmed.id}`)
      .send({ status: 'confirmed' })
      .expect(403);
  });

  it('the club-scoped grant holder is not notified of new requests either', () => {
    const notification = app
      .get(ConsoleNotificationAdapter)
      .lastFor('drr-club-officer@example.com', 'booking-requested');
    expect(notification).toBeUndefined();
  });

  it('confirming a request notifies the requester with the reference, slot and purpose', async () => {
    const updated = (
      await officer.patch(`/drr-bookings/${confirmed.id}`).send({ status: 'confirmed' }).expect(200)
    ).body as AdminBooking;
    expect(updated.status).toBe('confirmed');
    expect(updated.decidedById).toBeTruthy();

    const notification = app
      .get(ConsoleNotificationAdapter)
      .lastFor(REQUESTER, 'booking-confirmed');
    expect(notification).toBeTruthy();
    expect(notification?.data).toMatchObject({
      reference: confirmed.reference,
      startsAt: '2027-01-15T12:00:00.000Z',
      purpose: 'installation',
    });

    const seenByVisitor = (
      await request(httpServer(app)).get(`/public/drr-bookings/${confirmed.reference}`).expect(200)
    ).body as PublicBooking;
    expect(seenByVisitor.status).toBe('confirmed');
  });

  it('declining carries the reason through, and a decided booking cannot be decided again', async () => {
    const submitted = (
      await submitBooking(app, {
        purpose: 'meeting',
        requesterName: 'Second Requester',
        requesterEmail: 'second-requester@example.com',
        requesterPhone: '+919000000000',
        startsAt: '2027-02-02T05:30:00.000Z',
        endsAt: '2027-02-02T07:30:00.000Z',
      }).expect(201)
    ).body as SubmitResponse;

    const row = await testPrisma().drrBooking.findUniqueOrThrow({
      where: { reference: submitted.reference as string },
    });

    declined = (
      await officer
        .patch(`/drr-bookings/${row.id}`)
        .send({ status: 'declined', decisionReason: 'The DRR is at the district conference.' })
        .expect(200)
    ).body as AdminBooking;
    expect(declined.status).toBe('declined');
    expect(declined.decisionReason).toBe('The DRR is at the district conference.');

    const notification = app
      .get(ConsoleNotificationAdapter)
      .lastFor('second-requester@example.com', 'booking-declined');
    expect(notification).toBeTruthy();
    expect(notification?.data).toMatchObject({
      reference: submitted.reference,
      startsAt: '2027-02-02T05:30:00.000Z',
      decisionReason: 'The DRR is at the district conference.',
    });

    await officer.patch(`/drr-bookings/${row.id}`).send({ status: 'confirmed' }).expect(409);
    await officer.patch(`/drr-bookings/${row.id}`).send({ status: 'declined' }).expect(400);

    // A losing second decide must not contradict the first with a second email.
    expect(
      app
        .get(ConsoleNotificationAdapter)
        .lastFor('second-requester@example.com', 'booking-confirmed'),
    ).toBeUndefined();
    const sent = app
      .get(ConsoleNotificationAdapter)
      .sent.filter(
        (n) =>
          n.template === 'booking-declined' &&
          n.to.some((t) => t.email === 'second-requester@example.com'),
      );
    expect(sent).toHaveLength(1);
  });

  it('a honeypot submission is swallowed without writing a row, and the 4th request is throttled', async () => {
    const before = await testPrisma().drrBooking.count();
    const body = (
      await submitBooking(app, {
        purpose: 'club_event',
        requesterName: 'Spam Bot',
        requesterEmail: 'bot@example.com',
        requesterPhone: '+910000000000',
        startsAt: '2027-03-03T05:30:00.000Z',
        endsAt: '2027-03-03T07:30:00.000Z',
        website: 'https://buy-cheap-things.example',
      }).expect(201)
    ).body as SubmitResponse;
    expect(body.reference).toBeNull();
    expect(await testPrisma().drrBooking.count()).toBe(before);

    await submitBooking(app, {
      purpose: 'meeting',
      requesterName: 'Fourth Requester',
      requesterEmail: 'fourth@example.com',
      requesterPhone: '+919111111111',
      startsAt: '2027-04-04T05:30:00.000Z',
      endsAt: '2027-04-04T07:30:00.000Z',
    }).expect(429);
  });
});
