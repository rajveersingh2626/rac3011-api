import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { testPrisma } from './db';
import { createClub, createUser } from './fixtures';

type ProjectResponse = {
  id: string;
  slug: string | null;
  title: string;
  category: string;
  summary: string;
  body: string | null;
  status: string;
  consentConfirmed: boolean;
  submittedAt: string | null;
  publishedTitle: string | null;
  publishedSummary: string | null;
  editorNotes: string | null;
  rejectionReason: string | null;
  clubs: { role: string; club: { id: string } }[];
};
type ProjectListResponse = { items: ProjectResponse[]; total: number };
type PublicProjectResponse = { title: string; summary: string };

describe('Showcase submission + moderation (spec step 7)', () => {
  let app: INestApplication;
  let memberA1: TestAgent;
  let memberA2: TestAgent;
  let presidentA: TestAgent;
  let memberC: TestAgent;
  let zrrPrithvi: TestAgent;
  let dsc: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'SC-CLUB-A', name: 'Showcase Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'SC-CLUB-B', name: 'Showcase Club B', zoneName: 'Prithvi' });
    await createClub({ id: 'SC-CLUB-C', name: 'Showcase Club C', zoneName: 'Agni' });

    await createUser({
      email: 'sc-member-a1@example.com',
      name: 'Member A1',
      clubId: 'SC-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'SC-CLUB-A' }],
    });
    await createUser({
      email: 'sc-member-a2@example.com',
      name: 'Member A2',
      clubId: 'SC-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'SC-CLUB-A' }],
    });
    await createUser({
      email: 'sc-president-a@example.com',
      name: 'President A',
      clubId: 'SC-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'SC-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'SC-CLUB-A' },
      ],
    });
    await createUser({
      email: 'sc-member-c@example.com',
      name: 'Member C',
      clubId: 'SC-CLUB-C',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'SC-CLUB-C' }],
    });

    const prisma = testPrisma();
    const prithvi = await prisma.zone.findUniqueOrThrow({ where: { name: 'Prithvi' } });
    await createUser({
      email: 'sc-zrr-prithvi@example.com',
      name: 'ZRR Prithvi',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: prithvi.id }],
    });
    await createUser({
      email: 'sc-dsc@example.com',
      name: 'DSC',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    memberA1 = await signInAndVerify(app, 'sc-member-a1@example.com');
    memberA2 = await signInAndVerify(app, 'sc-member-a2@example.com');
    presidentA = await signInAndVerify(app, 'sc-president-a@example.com');
    memberC = await signInAndVerify(app, 'sc-member-c@example.com');
    zrrPrithvi = await signInAndVerify(app, 'sc-zrr-prithvi@example.com');
    dsc = await signInAndVerify(app, 'sc-dsc@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a draft; blocks submit without consent; allows submit once confirmed', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: 'Tree Plantation Drive',
          category: 'environment',
          date: '2026-07-10',
          summary: 'Planted 200 saplings in the community park.',
          consentConfirmed: false,
        })
        .expect(201)
    ).body as ProjectResponse;
    expect(created.status).toBe('draft');
    expect(created.clubs).toHaveLength(1);
    expect(created.clubs[0]).toMatchObject({ role: 'lead', club: { id: 'SC-CLUB-A' } });

    await memberA1.patch(`/projects/${created.id}`).send({ status: 'submitted' }).expect(400);

    await memberA1.patch(`/projects/${created.id}`).send({ consentConfirmed: true }).expect(200);
    const submitted = (
      await memberA1.patch(`/projects/${created.id}`).send({ status: 'submitted' }).expect(200)
    ).body as ProjectResponse;
    expect(submitted.status).toBe('submitted');
    expect(submitted.submittedAt).toBeTruthy();
  });

  it('collaborating clubs are real club FK rows; an unknown id is rejected', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: 'Joint Blood Camp',
          category: 'community_service',
          date: '2026-07-11',
          summary: 'A joint blood donation camp.',
          collaboratingClubIds: ['SC-CLUB-B'],
        })
        .expect(201)
    ).body as ProjectResponse;
    expect(created.clubs).toHaveLength(2);
    expect(created.clubs.find((c) => c.role === 'lead')?.club.id).toBe('SC-CLUB-A');
    expect(created.clubs.find((c) => c.role === 'collaborator')?.club.id).toBe('SC-CLUB-B');

    await memberA1
      .post('/projects')
      .send({
        title: 'Bad Collaborator',
        category: 'community_service',
        date: '2026-07-11',
        summary: 'x',
        collaboratingClubIds: ['NOT-A-REAL-CLUB'],
      })
      .expect(400);
  });

  it('own submissions are per-submitter, not per-club: a club-mate cannot see or touch it', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: "Member A1's private draft",
          category: 'education',
          date: '2026-07-12',
          summary: 'x',
        })
        .expect(201)
    ).body as ProjectResponse;

    const a2List = (await memberA2.get('/projects').expect(200)).body as ProjectListResponse;
    expect(a2List.items.some((p) => p.id === created.id)).toBe(false);

    const a1List = (await memberA1.get('/projects').expect(200)).body as ProjectListResponse;
    expect(a1List.items.some((p) => p.id === created.id)).toBe(true);

    await memberA2.get(`/projects/${created.id}`).expect(404);
    await memberA2.patch(`/projects/${created.id}`).send({ summary: 'hijacked' }).expect(404);
  });

  it('president (no showcase:publish grant) only sees their own submissions, not a club-wide queue', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: "Member A1's second draft",
          category: 'education',
          date: '2026-07-13',
          summary: 'x',
        })
        .expect(201)
    ).body as ProjectResponse;

    const presidentList = (await presidentA.get('/projects').expect(200))
      .body as ProjectListResponse;
    expect(presidentList.items.some((p) => p.id === created.id)).toBe(false);
  });

  it('moderation queue is scope-filtered by the lead club zone; DSC sees every zone', async () => {
    const inZone = (
      await memberA1
        .post('/projects')
        .send({
          title: 'In-zone submission',
          category: 'environment',
          date: '2026-07-14',
          summary: 'x',
          consentConfirmed: true,
        })
        .expect(201)
    ).body as ProjectResponse;
    await memberA1.patch(`/projects/${inZone.id}`).send({ status: 'submitted' }).expect(200);

    const outProject = (
      await memberC
        .post('/projects')
        .send({
          title: 'Out-of-zone submission',
          category: 'environment',
          date: '2026-07-14',
          summary: 'x',
          consentConfirmed: true,
        })
        .expect(201)
    ).body as ProjectResponse;
    await memberC.patch(`/projects/${outProject.id}`).send({ status: 'submitted' }).expect(200);

    const zrrQueue = (
      await zrrPrithvi.get('/projects').query({ 'filter[status]': 'submitted' }).expect(200)
    ).body as ProjectListResponse;
    expect(zrrQueue.items.some((p) => p.id === inZone.id)).toBe(true);
    expect(zrrQueue.items.some((p) => p.id === outProject.id)).toBe(false);
    await zrrPrithvi.get(`/projects/${outProject.id}`).expect(404);

    const dscQueue = (
      await dsc.get('/projects').query({ 'filter[status]': 'submitted' }).expect(200)
    ).body as ProjectListResponse;
    expect(dscQueue.items.some((p) => p.id === inZone.id)).toBe(true);
    expect(dscQueue.items.some((p) => p.id === outProject.id)).toBe(true);
  });

  it('edit-then-publish: submitted text stays verbatim, officer edits only the published copy, and it goes live publicly', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: 'raw title with a typo',
          category: 'environment',
          date: '2026-07-15',
          summary: 'raw summary as the member wrote it',
          body: 'raw body text',
          consentConfirmed: true,
        })
        .expect(201)
    ).body as ProjectResponse;
    await memberA1.patch(`/projects/${created.id}`).send({ status: 'submitted' }).expect(200);

    const published = (
      await zrrPrithvi
        .patch(`/projects/${created.id}`)
        .send({
          publishedTitle: 'Polished Title',
          publishedSummary: 'Polished summary for the public page.',
          editorNotes: 'Fixed the typo in the title.',
          status: 'published',
        })
        .expect(200)
    ).body as ProjectResponse;

    expect(published.status).toBe('published');
    expect(published.title).toBe('raw title with a typo');
    expect(published.summary).toBe('raw summary as the member wrote it');
    expect(published.publishedTitle).toBe('Polished Title');
    expect(published.publishedSummary).toBe('Polished summary for the public page.');
    expect(published.slug).toBeTruthy();

    await memberA1.patch(`/projects/${created.id}`).send({ summary: 'trying to edit' }).expect(409);

    const publicView = (
      await request(httpServer(app)).get(`/public/projects/${published.slug}`).expect(200)
    ).body as PublicProjectResponse;
    expect(publicView.title).toBe('Polished Title');
    expect(publicView.summary).toBe('Polished summary for the public page.');
  });

  it('reject requires a reason; owner can then revise and resubmit', async () => {
    const created = (
      await memberA1
        .post('/projects')
        .send({
          title: 'Needs more photos',
          category: 'environment',
          date: '2026-07-16',
          summary: 'x',
          consentConfirmed: true,
        })
        .expect(201)
    ).body as ProjectResponse;
    await memberA1.patch(`/projects/${created.id}`).send({ status: 'submitted' }).expect(200);

    await zrrPrithvi.patch(`/projects/${created.id}`).send({ status: 'rejected' }).expect(400);

    const rejected = (
      await zrrPrithvi
        .patch(`/projects/${created.id}`)
        .send({ status: 'rejected', rejectionReason: 'Please add at least two photos.' })
        .expect(200)
    ).body as ProjectResponse;
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Please add at least two photos.');

    const revised = (
      await memberA1
        .patch(`/projects/${created.id}`)
        .send({ summary: 'x, now with photos attached' })
        .expect(200)
    ).body as ProjectResponse;
    expect(revised.summary).toBe('x, now with photos attached');

    const resubmitted = (
      await memberA1.patch(`/projects/${created.id}`).send({ status: 'submitted' }).expect(200)
    ).body as ProjectResponse;
    expect(resubmitted.status).toBe('submitted');
  });

  it('DELETE is owner-only and draft-only', async () => {
    const draft = (
      await memberA1
        .post('/projects')
        .send({
          title: 'Throwaway draft',
          category: 'environment',
          date: '2026-07-17',
          summary: 'x',
        })
        .expect(201)
    ).body as ProjectResponse;

    await memberA2.delete(`/projects/${draft.id}`).expect(404);
    await memberA1.delete(`/projects/${draft.id}`).expect(204);
    await memberA1.get(`/projects/${draft.id}`).expect(404);

    const submitted = (
      await memberA1
        .post('/projects')
        .send({
          title: 'Cannot delete once submitted',
          category: 'environment',
          date: '2026-07-18',
          summary: 'x',
          consentConfirmed: true,
        })
        .expect(201)
    ).body as ProjectResponse;
    await memberA1.patch(`/projects/${submitted.id}`).send({ status: 'submitted' }).expect(200);
    await memberA1.delete(`/projects/${submitted.id}`).expect(409);
  });
});
