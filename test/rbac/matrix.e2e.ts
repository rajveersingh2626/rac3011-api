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
});
