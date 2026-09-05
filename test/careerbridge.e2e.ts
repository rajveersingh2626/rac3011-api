import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ConsoleNotificationAdapter } from '../src/notifications/console-notification.adapter';
import { PrismaService } from '../src/prisma/prisma.service';
import { CareerbridgeListingsRepository } from '../src/subdomains/careerbridge/careerbridge-listings.repository';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createUser } from './fixtures';

type ListingResponse = {
  id: string;
  title: string;
  status: string;
  expiresAt: string | null;
  rejectionReason: string | null;
};
type ListingListResponse = { items: ListingResponse[]; total: number };

async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

const SUBMISSION = {
  title: 'Marketing Intern',
  company: 'Acme Traders',
  type: 'internship' as const,
  location: 'Delhi',
  mode: 'hybrid' as const,
  description: 'Support the marketing team with campaigns and content for one semester.',
  contactEmail: 'hiring@acme-traders.example.com',
  postedByName: 'Asha Verma',
  postedByEmail: 'cb-poster@example.com',
};

describe('Career Bridge listings (spec §10, step 13)', () => {
  let app: INestApplication;
  let member: TestAgent;
  let cbAdmin: TestAgent;

  beforeAll(async () => {
    await createUser({
      email: 'cb-member@example.com',
      name: 'Plain Member',
    });
    await createUser({
      email: 'cb-admin@example.com',
      name: 'Career Bridge Admin',
      roles: [{ key: 'project_admin:careerbridge', scopeType: 'project', scopeId: 'careerbridge' }],
    });

    app = await createTestApp();
    member = await signInAndVerify(app, 'cb-member@example.com');
    cbAdmin = await signInAndVerify(app, 'cb-admin@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('a filled honeypot returns a fake success and creates no row', async () => {
    const prisma = app.get(PrismaService);
    const before = await prisma.cbListing.count();

    const res = (
      await request(httpServer(app))
        .post('/public/careerbridge/listings')
        .send({ ...SUBMISSION, postedByEmail: 'bot@example.com', website: 'https://spam.example' })
        .expect(201)
    ).body as { status: string };
    expect(res.status).toBe('pending_email');

    const after = await prisma.cbListing.count();
    expect(after).toBe(before);
  });

  it('post -> pending_email; verify token -> pending; verify by admin -> visible publicly', async () => {
    const posted = (
      await request(httpServer(app))
        .post('/public/careerbridge/listings')
        .send(SUBMISSION)
        .expect(201)
    ).body as { id: string; status: string };
    expect(posted.status).toBe('pending_email');

    // Plain members (no manage grant) cannot see the admin desk at all.
    await member.get('/careerbridge/listings').expect(403);
    await member
      .patch(`/careerbridge/listings/${posted.id}`)
      .send({ status: 'verified' })
      .expect(403);

    const adapter = app.get(ConsoleNotificationAdapter);
    const verifyMail = adapter.lastFor(SUBMISSION.postedByEmail, 'listing-verify');
    const verifyLink = verifyMail?.data.verifyLink as string | undefined;
    expect(verifyLink).toBeTruthy();
    const token = new URL(verifyLink!).searchParams.get('token');
    expect(token).toBeTruthy();

    await request(httpServer(app))
      .post('/public/careerbridge/listings/verify')
      .send({ token: 'not-a-real-token' })
      .expect(400);

    const verified = (
      await request(httpServer(app))
        .post('/public/careerbridge/listings/verify')
        .send({ token })
        .expect(201)
    ).body as { status: string };
    expect(verified.status).toBe('pending');

    // Reusing the same token must fail - it was cleared on first use.
    await request(httpServer(app))
      .post('/public/careerbridge/listings/verify')
      .send({ token })
      .expect(400);

    const pendingList = (
      await cbAdmin.get('/careerbridge/listings?filter[status]=pending').expect(200)
    ).body as ListingListResponse;
    expect(pendingList.items.some((i) => i.id === posted.id)).toBe(true);

    const adminApproved = (
      await cbAdmin
        .patch(`/careerbridge/listings/${posted.id}`)
        .send({ status: 'verified' })
        .expect(200)
    ).body as ListingResponse;
    expect(adminApproved.status).toBe('verified');
    expect(adminApproved.expiresAt).toBeTruthy();

    const verifiedMail = adapter.lastFor(SUBMISSION.postedByEmail, 'listing-verified');
    expect(verifiedMail).toBeTruthy();

    await waitUntil(async () => {
      const publicList = (
        await request(httpServer(app)).get('/public/careerbridge/listings').expect(200)
      ).body as ListingListResponse;
      return publicList.items.some((i) => i.id === posted.id);
    });

    const publicDetail = (
      await request(httpServer(app)).get(`/public/careerbridge/listings/${posted.id}`).expect(200)
    ).body as ListingResponse;
    expect(publicDetail.status).toBe('verified');
  });

  it('rejecting requires a reason and keeps the listing off the public board', async () => {
    const posted = (
      await request(httpServer(app))
        .post('/public/careerbridge/listings')
        .send({ ...SUBMISSION, postedByEmail: 'cb-reject@example.com' })
        .expect(201)
    ).body as { id: string };

    const adapter = app.get(ConsoleNotificationAdapter);
    const token = new URL(
      adapter.lastFor('cb-reject@example.com', 'listing-verify')!.data.verifyLink as string,
    ).searchParams.get('token');
    await request(httpServer(app))
      .post('/public/careerbridge/listings/verify')
      .send({ token })
      .expect(201);

    await cbAdmin
      .patch(`/careerbridge/listings/${posted.id}`)
      .send({ status: 'rejected' })
      .expect(400);
    const rejected = (
      await cbAdmin
        .patch(`/careerbridge/listings/${posted.id}`)
        .send({ status: 'rejected', rejectionReason: 'Role already filled elsewhere' })
        .expect(200)
    ).body as ListingResponse;
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Role already filled elsewhere');

    await request(httpServer(app)).get(`/public/careerbridge/listings/${posted.id}`).expect(404);
  });

  it('marking a verified listing filled keeps it public with a filled status', async () => {
    const posted = (
      await request(httpServer(app))
        .post('/public/careerbridge/listings')
        .send({ ...SUBMISSION, postedByEmail: 'cb-fill@example.com' })
        .expect(201)
    ).body as { id: string };
    const adapter = app.get(ConsoleNotificationAdapter);
    const token = new URL(
      adapter.lastFor('cb-fill@example.com', 'listing-verify')!.data.verifyLink as string,
    ).searchParams.get('token');
    await request(httpServer(app))
      .post('/public/careerbridge/listings/verify')
      .send({ token })
      .expect(201);
    await cbAdmin
      .patch(`/careerbridge/listings/${posted.id}`)
      .send({ status: 'verified' })
      .expect(200);

    await cbAdmin
      .patch(`/careerbridge/listings/${posted.id}`)
      .send({ status: 'filled' })
      .expect(200);
    // Cannot fill an already-filled listing.
    await cbAdmin
      .patch(`/careerbridge/listings/${posted.id}`)
      .send({ status: 'filled' })
      .expect(400);

    const publicDetail = (
      await request(httpServer(app)).get(`/public/careerbridge/listings/${posted.id}`).expect(200)
    ).body as ListingResponse;
    expect(publicDetail.status).toBe('filled');
  });

  it('the nightly expiry job hides listings once past their expiresAt', async () => {
    const repo = app.get(CareerbridgeListingsRepository);
    const created = await repo.create({
      title: 'Expired Fellowship',
      company: 'Old Co',
      type: 'mentorship',
      location: 'Gurgaon',
      mode: 'remote',
      stipend: null,
      description: 'A fellowship whose window has already closed by seed time.',
      applyUrl: null,
      contactEmail: 'contact@old-co.example.com',
      postedByName: 'Old Poster',
      postedByEmail: 'cb-expired@example.com',
      rotaryAffiliation: null,
      verifyToken: 'expired-fixture-token',
    });
    await repo.review(created.id, {
      status: 'verified',
      verifiedById: null,
      verifiedAt: new Date(),
      filledAt: null,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      rejectionReason: null,
    });

    // Defense in depth: already invisible publicly even before the nightly job flips the status.
    await request(httpServer(app)).get(`/public/careerbridge/listings/${created.id}`).expect(404);

    const expiredCount = await repo.expireDue(new Date());
    expect(expiredCount).toBeGreaterThanOrEqual(1);
    const reloaded = await repo.findById(created.id);
    expect(reloaded?.status).toBe('expired');
  });
});
