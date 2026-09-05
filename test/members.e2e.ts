import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';
import { testPrisma } from './db';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser, TEST_PASSWORD } from './fixtures';

type MemberResponse = {
  id: string;
  userId: string;
  email: string;
  status: string;
  clubId: string;
  rejectionReason: string | null;
  directoryOptIn: boolean;
};
type MemberListResponse = { items: MemberResponse[]; total: number };

describe('Members: registration, approval, scope (§4.8, §5.2)', () => {
  let app: INestApplication;
  let presidentA: TestAgent;
  let presidentB: TestAgent;
  let zrrOtherZone: TestAgent;
  let dsc: TestAgent;

  beforeAll(async () => {
    const prisma = testPrisma();
    const agni = await prisma.zone.findUniqueOrThrow({ where: { name: 'Agni' } });

    await createClub({ id: 'MB-CLUB-A', name: 'MB Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'MB-CLUB-B', name: 'MB Club B', zoneName: 'Agni' });

    await createUser({
      email: 'mb-president-a@example.com',
      name: 'President A',
      clubId: 'MB-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'MB-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'MB-CLUB-A' },
      ],
    });
    await createUser({
      email: 'mb-president-b@example.com',
      name: 'President B',
      clubId: 'MB-CLUB-B',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'MB-CLUB-B' },
        { key: 'president', scopeType: 'club', scopeId: 'MB-CLUB-B' },
      ],
    });
    await createUser({
      email: 'mb-zrr-agni@example.com',
      name: 'ZRR Agni',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: agni.id }],
    });
    await createUser({
      email: 'mb-dsc@example.com',
      name: 'DSC Officer',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    presidentA = await signInAndVerify(app, 'mb-president-a@example.com');
    presidentB = await signInAndVerify(app, 'mb-president-b@example.com');
    zrrOtherZone = await signInAndVerify(app, 'mb-zrr-agni@example.com');
    dsc = await signInAndVerify(app, 'mb-dsc@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /members/register (public) creates a pending member and rejects a duplicate email', async () => {
    const res = await presidentA
      .post('/members/register')
      .send({
        fullName: 'Ishita Rao',
        email: 'mb-ishita@example.com',
        password: TEST_PASSWORD,
        clubId: 'MB-CLUB-A',
      })
      .expect(201);
    expect((res.body as { status: string }).status).toBe('pending');

    await presidentA
      .post('/members/register')
      .send({
        fullName: 'Ishita Rao',
        email: 'mb-ishita@example.com',
        password: TEST_PASSWORD,
        clubId: 'MB-CLUB-A',
      })
      .expect(409);
  });

  it('rejects registration against an unknown club', async () => {
    await presidentA
      .post('/members/register')
      .send({
        fullName: 'Nikhil Arora',
        email: 'mb-nikhil@example.com',
        password: TEST_PASSWORD,
        clubId: 'NOT-A-CLUB',
      })
      .expect(400);
  });

  it('GET /members scope: president sees only their own club, dsc sees all, zrr(other zone) sees none', async () => {
    const asPresidentA = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    expect(asPresidentA.items.every((m) => m.clubId === 'MB-CLUB-A')).toBe(true);
    expect(asPresidentA.items.some((m) => m.email === 'mb-ishita@example.com')).toBe(true);

    const asDsc = (await dsc.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200))
      .body as MemberListResponse;
    expect(asDsc.items.some((m) => m.email === 'mb-ishita@example.com')).toBe(true);

    const asOtherZone = (
      await zrrOtherZone.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    expect(asOtherZone.items).toHaveLength(0);
  });

  it('GET /members/:id: 404 for out-of-scope (president B reading a member of club A)', async () => {
    const list = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    const ishita = list.items.find((m) => m.email === 'mb-ishita@example.com');
    expect(ishita).toBeTruthy();
    await presidentB.get(`/members/${ishita!.id}`).expect(404);
    await presidentA.get(`/members/${ishita!.id}`).expect(200);
  });

  it('PATCH /members/:id approve: grants the member role and lets the new member sign in with real access', async () => {
    const list = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    const ishita = list.items.find((m) => m.email === 'mb-ishita@example.com')!;

    await presidentB.patch(`/members/${ishita.id}`).send({ status: 'approved' }).expect(404);
    const approved = (
      await presidentA.patch(`/members/${ishita.id}`).send({ status: 'approved' }).expect(200)
    ).body as MemberResponse;
    expect(approved.status).toBe('approved');

    const ishitaAgent = await signInAndVerify(app, 'mb-ishita@example.com');
    const me = (await ishitaAgent.get('/me').expect(200)).body as {
      grants: Record<string, unknown[]>;
    };
    expect(me.grants['profile:edit']).toBeTruthy();
    expect(me.grants['directory:view']).toBeTruthy();
  });

  it('PATCH /members/:id reject (as suspended + reason) requires a reason for a pending member', async () => {
    await presidentA
      .post('/members/register')
      .send({
        fullName: 'Not Ours',
        email: 'mb-notours@example.com',
        password: TEST_PASSWORD,
        clubId: 'MB-CLUB-A',
      })
      .expect(201);
    const list = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    const notOurs = list.items.find((m) => m.email === 'mb-notours@example.com')!;

    await presidentA.patch(`/members/${notOurs.id}`).send({ status: 'suspended' }).expect(400);
    const rejected = (
      await presidentA
        .patch(`/members/${notOurs.id}`)
        .send({ status: 'suspended', rejectionReason: 'Wrong club' })
        .expect(200)
    ).body as MemberResponse;
    expect(rejected.status).toBe('suspended');
    expect(rejected.rejectionReason).toBe('Wrong club');

    await presidentA.patch(`/members/${notOurs.id}`).send({ status: 'suspended' }).expect(409);
  });

  it('suspending a previously-approved member revokes their member role grant', async () => {
    const list = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-CLUB-A' }).expect(200)
    ).body as MemberListResponse;
    const ishita = list.items.find((m) => m.email === 'mb-ishita@example.com')!;

    await presidentA
      .patch(`/members/${ishita.id}`)
      .send({ status: 'suspended', rejectionReason: 'No longer active' })
      .expect(200);

    const ishitaAgent = await signInAndVerify(app, 'mb-ishita@example.com');
    const me = (await ishitaAgent.get('/me').expect(200)).body as {
      grants: Record<string, unknown[]>;
    };
    expect(me.grants['profile:edit'] ?? []).toEqual([]);
  });
});

describe('Members CSV import (§5.2)', () => {
  let app: INestApplication;
  let presidentA: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'MB-IMP-CLUB', name: 'MB Import Club', zoneName: 'Prithvi' });
    await createUser({
      email: 'mb-imp-president@example.com',
      name: 'Import President',
      clubId: 'MB-IMP-CLUB',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'MB-IMP-CLUB' },
        { key: 'president', scopeType: 'club', scopeId: 'MB-IMP-CLUB' },
      ],
    });
    app = await createTestApp();
    presidentA = await signInAndVerify(app, 'mb-imp-president@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('previews a CSV, flagging duplicates against existing members and within the file, then commits the new rows', async () => {
    const csv = [
      'fullName,email,phone',
      'Kartik Kumar,mb-kartik@example.com,+91 90000 00001',
      'Meera Nair,mb-meera@example.com,+91 90000 00002',
      'Meera Nair,mb-meera@example.com,+91 90000 00002',
    ].join('\n');

    const preview = (
      await presidentA.post('/members/imports').send({ clubId: 'MB-IMP-CLUB', csv }).expect(201)
    ).body as {
      id: string;
      rows: { email: string; outcome: string }[];
      summary: Record<string, number>;
    };
    expect(preview.summary.total).toBe(3);
    expect(preview.rows.filter((r) => r.outcome === 'new')).toHaveLength(2);
    expect(preview.rows.filter((r) => r.outcome === 'duplicate')).toHaveLength(1);

    const newRows = preview.rows.filter((r) => r.outcome === 'new');
    const commit = (
      await presidentA
        .patch(`/members/imports/${preview.id}`)
        .send({ clubId: 'MB-IMP-CLUB', status: 'committed', rows: newRows })
        .expect(200)
    ).body as { committed: number; skipped: number; memberIds: string[] };
    expect(commit.committed).toBe(2);

    const list = (
      await presidentA.get('/members').query({ 'filter[clubId]': 'MB-IMP-CLUB' }).expect(200)
    ).body as MemberListResponse;
    const kartik = list.items.find((m) => m.email === 'mb-kartik@example.com');
    expect(kartik?.status).toBe('approved');

    // Re-committing the same rows is a no-op (already exist), not a duplicate-key crash.
    const secondCommit = (
      await presidentA
        .patch(`/members/imports/${preview.id}`)
        .send({ clubId: 'MB-IMP-CLUB', status: 'committed', rows: newRows })
        .expect(200)
    ).body as { committed: number; skipped: number };
    expect(secondCommit.committed).toBe(0);
    expect(secondCommit.skipped).toBe(2);
  });

  it('denies import outside the caller club scope', async () => {
    await createClub({ id: 'MB-IMP-OTHER', name: 'MB Import Other', zoneName: 'Agni' });
    await presidentA
      .post('/members/imports')
      .send({ clubId: 'MB-IMP-OTHER', csv: 'fullName,email\nX,x@example.com' })
      .expect(404);
  });
});

describe('Directory and privacy acceptance (§4.8, §5.2)', () => {
  let app: INestApplication;
  let memberOptIn: TestAgent;
  let memberOptOut: TestAgent;
  let editingTeam: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'MB-DIR-CLUB', name: 'MB Directory Club', zoneName: 'Prithvi' });
    await createUser({
      email: 'mb-dir-optin@example.com',
      name: 'Aman Verma',
      clubId: 'MB-DIR-CLUB',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'MB-DIR-CLUB' }],
    });
    await createUser({
      email: 'mb-dir-optout@example.com',
      name: 'Sana Qureshi',
      clubId: 'MB-DIR-CLUB',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'MB-DIR-CLUB' }],
    });
    await createUser({
      email: 'mb-dir-editing@example.com',
      name: 'Editing Team',
      roles: [{ key: 'editing_team', scopeType: 'none' }],
    });

    const prisma = testPrisma();
    await prisma.memberProfile.update({
      where: { email: 'mb-dir-optin@example.com' },
      data: {
        directoryOptIn: true,
        skills: ['video editing', 'cricket'],
        interests: ['environment'],
      },
    });
    await prisma.memberProfile.update({
      where: { email: 'mb-dir-optout@example.com' },
      data: { directoryOptIn: false, skills: ['photography'] },
    });

    app = await createTestApp();
    memberOptIn = await signInAndVerify(app, 'mb-dir-optin@example.com');
    memberOptOut = await signInAndVerify(app, 'mb-dir-optout@example.com');
    editingTeam = await signInAndVerify(app, 'mb-dir-editing@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it('editing_team has no directory:view grant at all', async () => {
    await editingTeam.get('/directory').expect(403);
  });

  it('409 PRIVACY_NOT_ACCEPTED until the caller accepts, then 200 with only opted-in, public fields', async () => {
    const before = await memberOptIn.get('/directory').expect(409);
    expect((before.body as { code: string }).code).toBe('PRIVACY_NOT_ACCEPTED');

    await memberOptIn.post('/me/privacy-acceptances').expect(200);

    const after = (
      await memberOptIn.get('/directory').query({ 'filter[clubId]': 'MB-DIR-CLUB' }).expect(200)
    ).body as { items: Record<string, unknown>[] };
    expect(after.items.some((i) => i.fullName === 'Aman Verma')).toBe(true);
    expect(after.items.some((i) => i.fullName === 'Sana Qureshi')).toBe(false);
    const entry = after.items.find((i) => i.fullName === 'Aman Verma')!;
    expect(entry.email).toBeUndefined();
    expect(entry.phone).toBeUndefined();

    // The opt-out member can still search (their own opt-out only hides their own row).
    await memberOptOut.post('/me/privacy-acceptances').expect(200);
    const asOptOut = (await memberOptOut.get('/directory').expect(200)).body as {
      items: Record<string, unknown>[];
    };
    expect(asOptOut.items.some((i) => i.fullName === 'Sana Qureshi')).toBe(false);
  });

  it('GET /skill-tags is reachable by any authenticated user', async () => {
    const res = await memberOptIn.get('/skill-tags').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('/me additions: club, card, qr.svg', () => {
  let app: INestApplication;
  let president: TestAgent;

  beforeAll(async () => {
    await createClub({ id: 'MB-ME-CLUB', name: 'MB Me Club', zoneName: 'Prithvi' });
    await createUser({
      email: 'mb-me-president@example.com',
      name: 'Me President',
      clubId: 'MB-ME-CLUB',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'MB-ME-CLUB' },
        { key: 'president', scopeType: 'club', scopeId: 'MB-ME-CLUB' },
      ],
    });
    app = await createTestApp();
    president = await signInAndVerify(app, 'mb-me-president@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /me/club returns the caller's own club", async () => {
    const res = await president.get('/me/club').expect(200);
    expect((res.body as { id: string }).id).toBe('MB-ME-CLUB');
  });

  it('GET /me/card returns card fields including a stable cardId and qrToken', async () => {
    const res = await president.get('/me/card').expect(200);
    const body = res.body as { cardId: string; qrToken: string; clubName: string };
    expect(body.cardId).toMatch(/^3011-/);
    expect(body.qrToken.length).toBeGreaterThan(0);
    expect(body.clubName).toBe('MB Me Club');
  });

  it('GET /me/qr.svg returns an SVG image', async () => {
    const res = await president.get('/me/qr.svg').expect(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    const body = Buffer.isBuffer(res.body) ? res.body.toString('utf8') : String(res.text);
    expect(body).toContain('<svg');
  });
});
