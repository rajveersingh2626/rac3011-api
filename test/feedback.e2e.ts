import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { ConsoleNotificationAdapter } from '../src/notifications/console-notification.adapter';
import { createClub, createUser } from './fixtures';

type FeedbackResponse = {
  id: string;
  submittedById: string | null;
  clubId: string | null;
  category: string;
  message: string;
  eventId: string | null;
  status: string;
  reply: string | null;
};
type FeedbackListResponse = { items: FeedbackResponse[]; total: number };

describe('Feedback (spec step 8)', () => {
  let app: INestApplication;
  let dsc: TestAgent;
  let superAdmin: TestAgent;
  let memberA: TestAgent;
  let memberB: TestAgent;
  let presidentA: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'FB-CLUB-A', name: 'Feedback Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'FB-CLUB-B', name: 'Feedback Club B', zoneName: 'Agni' });

    await createUser({
      email: 'fb-member-a@example.com',
      name: 'Member A',
      clubId: 'FB-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'FB-CLUB-A' }],
    });
    await createUser({
      email: 'fb-member-b@example.com',
      name: 'Member B',
      clubId: 'FB-CLUB-B',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'FB-CLUB-B' }],
    });
    await createUser({
      email: 'fb-president-a@example.com',
      name: 'President A',
      clubId: 'FB-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'FB-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'FB-CLUB-A' },
      ],
    });
    await createUser({
      email: 'fb-dsc@example.com',
      name: 'DSC Feedback',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    await createUser({
      email: 'fb-super-admin@example.com',
      name: 'Super Admin Feedback',
      roles: [{ key: 'super_admin', scopeType: 'none' }],
    });

    app = await createTestApp();
    dsc = await signInAndVerify(app, 'fb-dsc@example.com');
    superAdmin = await signInAndVerify(app, 'fb-super-admin@example.com');
    memberA = await signInAndVerify(app, 'fb-member-a@example.com');
    memberB = await signInAndVerify(app, 'fb-member-b@example.com');
    presidentA = await signInAndVerify(app, 'fb-president-a@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a member can submit general feedback and see it in "mine"; a club-mate does not', async () => {
    const created = (
      await memberA
        .post('/feedback')
        .send({ category: 'general', message: 'Could the calendar go out earlier?' })
        .expect(201)
    ).body as FeedbackResponse;
    expect(created.status).toBe('open');
    expect(created.submittedById).toBeTruthy();

    const mine = (await memberA.get('/feedback/mine').expect(200)).body as FeedbackListResponse;
    expect(mine.items.some((f) => f.id === created.id)).toBe(true);

    const presidentMine = (await presidentA.get('/feedback/mine').expect(200))
      .body as FeedbackListResponse;
    expect(presidentMine.items.some((f) => f.id === created.id)).toBe(false);
  });

  it('event category requires a real eventId', async () => {
    await memberA.post('/feedback').send({ category: 'event', message: 'x' }).expect(400);
    await memberA
      .post('/feedback')
      .send({ category: 'event', eventId: 'not-a-real-event', message: 'x' })
      .expect(400);
  });

  it('anonymous submission is rejected unless feedback.allowAnonymous is enabled', async () => {
    await memberA
      .post('/feedback')
      .send({ category: 'general', message: 'anon attempt', anonymous: true })
      .expect(400);

    await superAdmin.patch('/settings').send({ 'feedback.allowAnonymous': true }).expect(200);
    const created = (
      await memberA
        .post('/feedback')
        .send({ category: 'general', message: 'a truly anonymous note', anonymous: true })
        .expect(201)
    ).body as FeedbackResponse;
    expect(created.submittedById).toBeNull();

    const mine = (await memberA.get('/feedback/mine').expect(200)).body as FeedbackListResponse;
    expect(mine.items.some((f) => f.message === 'a truly anonymous note')).toBe(false);

    await superAdmin.patch('/settings').send({ 'feedback.allowAnonymous': false }).expect(200);
  });

  it('only feedback:review can see the review queue; members are 403', async () => {
    await memberA.get('/feedback').expect(403);
    await dsc.get('/feedback').expect(200);
  });

  it('reply moves an open item to reviewed and notifies the submitter; closed items reject a new reply', async () => {
    const submitted = (
      await memberB
        .post('/feedback')
        .send({ category: 'general', message: 'Please review this' })
        .expect(201)
    ).body as FeedbackResponse;

    const replied = (
      await dsc.patch(`/feedback/${submitted.id}`).send({ reply: 'Thanks, noted.' }).expect(200)
    ).body as FeedbackResponse;
    expect(replied.status).toBe('reviewed');
    expect(replied.reply).toBe('Thanks, noted.');

    const adapter = app.get(ConsoleNotificationAdapter);
    const notification = adapter.lastFor('fb-member-b@example.com', 'feedback-replied');
    expect(notification).toBeTruthy();

    const closed = (
      await dsc.patch(`/feedback/${submitted.id}`).send({ status: 'closed' }).expect(200)
    ).body as FeedbackResponse;
    expect(closed.status).toBe('closed');

    await dsc.patch(`/feedback/${submitted.id}`).send({ reply: 'too late' }).expect(409);
  });

  it("event-scoped feedback carries the submitter's club as a real club FK", async () => {
    const districtEvent = (
      await dsc
        .post('/events')
        .send({ title: 'Feedback Test Event', startsAt: '2026-12-01T10:00:00Z' })
        .expect(201)
    ).body as { id: string };

    const created = (
      await memberA
        .post('/feedback')
        .send({ category: 'event', eventId: districtEvent.id, message: 'No ramp at the venue' })
        .expect(201)
    ).body as FeedbackResponse;
    expect(created.eventId).toBe(districtEvent.id);
    expect(created.clubId).toBe('FB-CLUB-A');
  });
});
