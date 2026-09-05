import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../app';
import { testPrisma } from '../db';
import { signInAndVerify, type TestAgent } from '../auth-flow';
import { createClub, createUser } from '../fixtures';
import type { ClubListResponse, MeResponse } from '../types';

describe('RBAC denial matrix', () => {
  let app: INestApplication;
  let member: TestAgent;
  let president: TestAgent;
  let zrrSameZone: TestAgent;
  let zrrOtherZone: TestAgent;
  let dsc: TestAgent;
  let editingTeam: TestAgent;

  beforeAll(async () => {
    const prisma = testPrisma();
    const prithvi = await prisma.zone.findUniqueOrThrow({ where: { name: 'Prithvi' } });
    const agni = await prisma.zone.findUniqueOrThrow({ where: { name: 'Agni' } });

    await createClub({ id: 'MX-CLUB-A', name: 'Club A', zoneName: 'Prithvi' });
    await createClub({ id: 'MX-CLUB-B', name: 'Club B', zoneName: 'Agni' });

    await createUser({
      email: 'mx-member-a@example.com',
      name: 'Member A',
      clubId: 'MX-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'MX-CLUB-A' }],
    });
    await createUser({
      email: 'mx-president-a@example.com',
      name: 'President A',
      clubId: 'MX-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'MX-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'MX-CLUB-A' },
      ],
    });
    await createUser({
      email: 'mx-zrr-prithvi@example.com',
      name: 'ZRR Prithvi',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: prithvi.id }],
    });
    await createUser({
      email: 'mx-zrr-agni@example.com',
      name: 'ZRR Agni',
      roles: [{ key: 'zrr', scopeType: 'zone', scopeId: agni.id }],
    });
    await createUser({
      email: 'mx-dsc@example.com',
      name: 'DSC Officer',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    await createUser({
      email: 'mx-editing-team@example.com',
      name: 'Editing Team',
      roles: [{ key: 'editing_team', scopeType: 'none' }],
    });

    app = await createTestApp();
    member = await signInAndVerify(app, 'mx-member-a@example.com');
    president = await signInAndVerify(app, 'mx-president-a@example.com');
    zrrSameZone = await signInAndVerify(app, 'mx-zrr-prithvi@example.com');
    zrrOtherZone = await signInAndVerify(app, 'mx-zrr-agni@example.com');
    dsc = await signInAndVerify(app, 'mx-dsc@example.com');
    editingTeam = await signInAndVerify(app, 'mx-editing-team@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /roles and GET /user-roles (roles:manage, super_admin only)', () => {
    it('denies everyone but super_admin', async () => {
      await member.get('/roles').expect(403);
      await president.get('/roles').expect(403);
      await zrrSameZone.get('/roles').expect(403);
      await dsc.get('/roles').expect(403);
      await editingTeam.get('/roles').expect(403);
      await dsc.get('/user-roles').expect(403);
    });
  });

  describe('GET /audit (audit:view)', () => {
    it('allows only dsc', async () => {
      await member.get('/audit').expect(403);
      await president.get('/audit').expect(403);
      await zrrSameZone.get('/audit').expect(403);
      await editingTeam.get('/audit').expect(403);
      await dsc.get('/audit').expect(200);
    });
  });

  describe('GET /me', () => {
    it('is reachable by any authenticated caller and shows only their own profile', async () => {
      const res = await member.get('/me').expect(200);
      const body = res.body as MeResponse;
      expect(body.user.email).toBe('mx-member-a@example.com');
      expect(body.profile?.clubId).toBe('MX-CLUB-A');
    });
  });

  describe('GET /clubs/:id (clubs:view, own)', () => {
    it('member and president see their own club, 404 for a club outside scope', async () => {
      await member.get('/clubs/MX-CLUB-A').expect(200);
      await president.get('/clubs/MX-CLUB-A').expect(200);
      await member.get('/clubs/MX-CLUB-B').expect(404);
    });

    it('zrr sees clubs in their zone only, 404 for another zone', async () => {
      await zrrSameZone.get('/clubs/MX-CLUB-A').expect(200);
      await zrrOtherZone.get('/clubs/MX-CLUB-A').expect(404);
      await zrrOtherZone.get('/clubs/MX-CLUB-B').expect(200);
    });

    it('dsc sees every club; editing_team has no clubs:view grant at all', async () => {
      await dsc.get('/clubs/MX-CLUB-A').expect(200);
      await dsc.get('/clubs/MX-CLUB-B').expect(200);
      await editingTeam.get('/clubs/MX-CLUB-A').expect(403);
    });
  });

  describe('GET /clubs scope filtering', () => {
    it('president only sees clubs in scope; zrr sees their zone; dsc sees all', async () => {
      const presidentRes = await president.get('/clubs').expect(200);
      const presidentBody = presidentRes.body as ClubListResponse;
      expect(presidentBody.items.map((c) => c.id)).toEqual(['MX-CLUB-A']);

      const zrrRes = await zrrSameZone.get('/clubs').expect(200);
      const zrrClubIds = (zrrRes.body as ClubListResponse).items.map((c) => c.id);
      expect(zrrClubIds).toContain('MX-CLUB-A');
      expect(zrrClubIds).not.toContain('MX-CLUB-B');

      const dscRes = await dsc.get('/clubs').expect(200);
      const dscClubIds = (dscRes.body as ClubListResponse).items.map((c) => c.id);
      expect(dscClubIds).toContain('MX-CLUB-A');
      expect(dscClubIds).toContain('MX-CLUB-B');

      await editingTeam.get('/clubs').expect(403);
    });
  });

  describe('PATCH /clubs/:id (clubs:edit, own)', () => {
    it('member cannot edit; president can edit only their own club; dsc has no clubs:edit', async () => {
      await member.patch('/clubs/MX-CLUB-A').send({ meetingInfo: 'x' }).expect(403);
      await president.patch('/clubs/MX-CLUB-A').send({ meetingInfo: 'Every Saturday' }).expect(200);
      await president.patch('/clubs/MX-CLUB-B').send({ meetingInfo: 'x' }).expect(404);
      await dsc.patch('/clubs/MX-CLUB-A').send({ meetingInfo: 'x' }).expect(403);
    });
  });

  describe('reports (§4.8 denial matrix rows)', () => {
    let reportId: string;

    beforeAll(async () => {
      const created = await president
        .post('/reports')
        .send({ clubId: 'MX-CLUB-A', month: '2026-10' })
        .expect(201);
      reportId = (created.body as { id: string }).id;
    });

    it('GET /reports?filter[clubId]=A: member and editing_team hold neither reports:submit nor reports:review -> 403 (docs/decisions.md); president/zrr(same zone)/dsc -> 200; zrr(other zone) -> empty', async () => {
      await member.get('/reports').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(403);
      await editingTeam.get('/reports').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(403);
      await president.get('/reports').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(200);
      await zrrSameZone.get('/reports').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(200);
      await dsc.get('/reports').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(200);
      const otherZoneRes = await zrrOtherZone
        .get('/reports')
        .query({ 'filter[clubId]': 'MX-CLUB-A' })
        .expect(200);
      expect((otherZoneRes.body as { items: unknown[] }).items).toHaveLength(0);
    });

    it('PATCH /reports/:idA {status:submitted}: only president (own club) succeeds', async () => {
      await member.patch(`/reports/${reportId}`).send({ status: 'submitted' }).expect(403);
      await zrrSameZone.patch(`/reports/${reportId}`).send({ status: 'submitted' }).expect(403);
      await dsc.patch(`/reports/${reportId}`).send({ status: 'submitted' }).expect(403);
      await editingTeam.patch(`/reports/${reportId}`).send({ status: 'submitted' }).expect(403);
      await president
        .patch(`/reports/${reportId}`)
        .send({ values: { physical_meetings: 1, activities: [] }, status: 'submitted' })
        .expect(200);
    });

    it('POST /reports/:idA/queries: member/president/editing_team 403 (no reports:review); zrr(same zone)/dsc 200; zrr(other zone) 404', async () => {
      await member.post(`/reports/${reportId}/queries`).send({ question: 'x' }).expect(403);
      await president.post(`/reports/${reportId}/queries`).send({ question: 'x' }).expect(403);
      await editingTeam.post(`/reports/${reportId}/queries`).send({ question: 'x' }).expect(403);
      await zrrOtherZone.post(`/reports/${reportId}/queries`).send({ question: 'x' }).expect(404);
      await zrrSameZone
        .post(`/reports/${reportId}/queries`)
        .send({ question: 'Please clarify' })
        .expect(201);
    });
  });

  describe('showcase (§4.8 denial matrix rows)', () => {
    let projectId: string;

    beforeAll(async () => {
      const created = await member
        .post('/projects')
        .send({
          title: 'Blood Donation Camp',
          category: 'community_service',
          date: '2026-08-15',
          summary: 'A club blood donation drive.',
          consentConfirmed: true,
        })
        .expect(201);
      projectId = (created.body as { id: string }).id;
    });

    it('POST /projects (submit): any approved member can submit; editing_team cannot', async () => {
      await editingTeam
        .post('/projects')
        .send({ title: 'x', category: 'y', date: '2026-08-15', summary: 'z' })
        .expect(403);
      await president
        .post('/projects')
        .send({
          title: 'President-filed project',
          category: 'community_service',
          date: '2026-08-15',
          summary: 'z',
        })
        .expect(201);
    });

    it('GET /projects/:idA: member (owner) sees it; zrr(other zone) 404s an out-of-scope submission', async () => {
      await member.get(`/projects/${projectId}`).expect(200);
      await zrrOtherZone.get(`/projects/${projectId}`).expect(404);
    });

    it('PATCH /projects/:idA {status:published}: only showcase:publish holders in scope succeed', async () => {
      await member.patch(`/projects/${projectId}`).send({ status: 'published' }).expect(403);
      await president.patch(`/projects/${projectId}`).send({ status: 'published' }).expect(403);
      await editingTeam.patch(`/projects/${projectId}`).send({ status: 'published' }).expect(403);
      await zrrOtherZone.patch(`/projects/${projectId}`).send({ status: 'published' }).expect(404);

      await member.patch(`/projects/${projectId}`).send({ status: 'submitted' }).expect(200);

      await zrrSameZone
        .patch(`/projects/${projectId}`)
        .send({
          publishedTitle: 'Blood Donation Camp',
          publishedSummary: 'A club blood donation drive.',
          status: 'published',
        })
        .expect(200);
    });

    it('the consent tick can only be set by the submitter, even by an officer of the same club', async () => {
      await president.patch(`/projects/${projectId}`).send({ consentConfirmed: true }).expect(404);
    });
  });

  describe('members (§4.8 denial matrix rows)', () => {
    let pendingIdInA: string;

    beforeAll(async () => {
      const res = await member
        .post('/members/register')
        .send({
          fullName: 'RBAC Test Registrant',
          email: 'mx-registrant-a@example.com',
          password: 'Correct-Horse-Battery-2',
          clubId: 'MX-CLUB-A',
        })
        .expect(201);
      pendingIdInA = (res.body as { id: string }).id;
    });

    it('PATCH /members/:idInA {status:approved}: member/zrr(any zone)/editing_team 403 (missing members:approve); president/dsc 200', async () => {
      await member.patch(`/members/${pendingIdInA}`).send({ status: 'approved' }).expect(403);
      await zrrSameZone.patch(`/members/${pendingIdInA}`).send({ status: 'approved' }).expect(403);
      await zrrOtherZone.patch(`/members/${pendingIdInA}`).send({ status: 'approved' }).expect(403);
      await editingTeam.patch(`/members/${pendingIdInA}`).send({ status: 'approved' }).expect(403);
      await dsc.patch(`/members/${pendingIdInA}`).send({ status: 'approved' }).expect(200);
    });

    it('PATCH /members/:idInB {status:approved} (as president A): 404, not 403 (out-of-scope existing resource)', async () => {
      const res = await member
        .post('/members/register')
        .send({
          fullName: 'RBAC Test Registrant B',
          email: 'mx-registrant-b@example.com',
          password: 'Correct-Horse-Battery-2',
          clubId: 'MX-CLUB-B',
        })
        .expect(201);
      const pendingIdInB = (res.body as { id: string }).id;
      await president.patch(`/members/${pendingIdInB}`).send({ status: 'approved' }).expect(404);
    });

    it('GET /members?filter[clubId]=A: president/dsc see it, zrr(other zone) sees an empty list, editing_team is 403', async () => {
      await editingTeam.get('/members').query({ 'filter[clubId]': 'MX-CLUB-A' }).expect(403);
      const otherZone = await zrrOtherZone
        .get('/members')
        .query({ 'filter[clubId]': 'MX-CLUB-A' })
        .expect(200);
      expect((otherZone.body as { items: unknown[] }).items).toHaveLength(0);
      const asPresident = await president
        .get('/members')
        .query({ 'filter[clubId]': 'MX-CLUB-A' })
        .expect(200);
      expect(
        (asPresident.body as { items: { email: string }[] }).items.some(
          (m) => m.email === 'mx-registrant-a@example.com',
        ),
      ).toBe(true);
    });
  });

  describe('points and club facts (§4.8, §5.2, §6.1)', () => {
    it('GET /clubs/:id/points: own club member/president/zrr(same zone)/dsc succeed, zrr(other zone) 404s, editing_team 403s', async () => {
      await member.get('/clubs/MX-CLUB-A/points').expect(200);
      await president.get('/clubs/MX-CLUB-A/points').expect(200);
      await zrrSameZone.get('/clubs/MX-CLUB-A/points').expect(200);
      await dsc.get('/clubs/MX-CLUB-A/points').expect(200);
      await zrrOtherZone.get('/clubs/MX-CLUB-A/points').expect(404);
      await editingTeam.get('/clubs/MX-CLUB-A/points').expect(403);
    });

    it("GET /clubs/B/points as president of A: 404, not another club's numbers", async () => {
      await president.get('/clubs/MX-CLUB-B/points').expect(404);
    });

    it("dsc alone sees both clubs' points; zrr is limited to clubs in their own zone", async () => {
      await dsc.get('/clubs/MX-CLUB-A/points').expect(200);
      await dsc.get('/clubs/MX-CLUB-B/points').expect(200);
      await zrrSameZone.get('/clubs/MX-CLUB-A/points').expect(200);
      await zrrSameZone.get('/clubs/MX-CLUB-B/points').expect(404);
      await zrrOtherZone.get('/clubs/MX-CLUB-B/points').expect(200);
    });

    it('PATCH /clubs/:id/points (judged): only dsc (reports:score) can set a judged score', async () => {
      await member
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-08' })
        .send({ judgedPoints: 6, reason: 'Joint camp with two Rotary clubs' })
        .expect(403);
      await president
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-08' })
        .send({ judgedPoints: 6, reason: 'Joint camp with two Rotary clubs' })
        .expect(403);
      await zrrSameZone
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-08' })
        .send({ judgedPoints: 6, reason: 'Joint camp with two Rotary clubs' })
        .expect(403);
      await editingTeam
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-08' })
        .send({ judgedPoints: 6, reason: 'Joint camp with two Rotary clubs' })
        .expect(403);

      const res = await dsc
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-08' })
        .send({ judgedPoints: 6, reason: 'Joint camp with two Rotary clubs' })
        .expect(200);
      const body = res.body as {
        judged: { points: number; reason: string } | null;
        entries: unknown[];
      };
      expect(body.judged?.points).toBe(6);
      expect(body.judged?.reason).toBe('Joint camp with two Rotary clubs');

      const reread = await president
        .get('/clubs/MX-CLUB-A/points')
        .query({ ryYear: 2026, month: '2026-08' })
        .expect(200);
      expect((reread.body as { judged: { points: number } | null }).judged?.points).toBe(6);
    });

    it('PATCH /clubs/:id/points rejects a judged reason shorter than 10 characters', async () => {
      await dsc
        .patch('/clubs/MX-CLUB-A/points')
        .query({ month: '2026-09' })
        .send({ judgedPoints: 5, reason: 'too short' })
        .expect(400);
    });

    it('GET /clubs/:id/facts: own club member and dsc can read; zrr(other zone) 404s; editing_team 403s', async () => {
      await member.get('/clubs/MX-CLUB-A/facts').expect(200);
      await dsc.get('/clubs/MX-CLUB-A/facts').expect(200);
      await zrrOtherZone.get('/clubs/MX-CLUB-A/facts').expect(404);
      await editingTeam.get('/clubs/MX-CLUB-A/facts').expect(403);
    });

    it('PATCH /clubs/:id/facts (club_facts:edit): only dsc can write; a club officer cannot edit their own facts', async () => {
      await president
        .patch('/clubs/MX-CLUB-A/facts')
        .send({ ryYear: 2026, paulHarrisFellows: 2 })
        .expect(403);
      await zrrSameZone
        .patch('/clubs/MX-CLUB-A/facts')
        .send({ ryYear: 2026, paulHarrisFellows: 2 })
        .expect(403);

      const res = await dsc
        .patch('/clubs/MX-CLUB-A/facts')
        .send({ ryYear: 2026, paulHarrisFellows: 2, dualMembers: 1 })
        .expect(200);
      expect((res.body as { paulHarrisFellows: number }).paulHarrisFellows).toBe(2);

      const reread = await dsc.get('/clubs/MX-CLUB-A/facts').query({ ryYear: 2026 }).expect(200);
      expect((reread.body as { dualMembers: number }).dualMembers).toBe(1);
    });
  });
});
