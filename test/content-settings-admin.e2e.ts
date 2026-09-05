import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';
import { testPrisma } from './db';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';

describe('content, settings, link-health and public-content admin', () => {
  let app: INestApplication;
  let dsc: TestAgent;
  let editingTeam: TestAgent;
  let member: TestAgent;
  let president: TestAgent;
  let contentEditorOnly: TestAgent;
  let superAdmin: TestAgent;

  beforeAll(async () => {
    const prisma = testPrisma();
    await createClub({ id: 'CS-CLUB-A', name: 'CS Club A', zoneName: 'Prithvi' });

    await createUser({
      email: 'cs-dsc@example.com',
      name: 'CS DSC',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });
    await createUser({
      email: 'cs-editing-team@example.com',
      name: 'CS Editing Team',
      roles: [{ key: 'editing_team', scopeType: 'none' }],
    });
    await createUser({
      email: 'cs-member@example.com',
      name: 'CS Member',
      clubId: 'CS-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'CS-CLUB-A' }],
    });
    await createUser({
      email: 'cs-president@example.com',
      name: 'CS President',
      clubId: 'CS-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'CS-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'CS-CLUB-A' },
      ],
    });

    await prisma.role.upsert({
      where: { key: 'cs_content_editor_only' },
      create: {
        key: 'cs_content_editor_only',
        name: 'CS content editor only',
        scopeType: 'none',
        permissions: {
          create: [{ permission: { connect: { key: 'content:edit' } } }],
        },
      },
      update: {},
    });
    await createUser({
      email: 'cs-content-editor-only@example.com',
      name: 'CS Content Editor Only',
      roles: [{ key: 'cs_content_editor_only', scopeType: 'none' }],
    });
    await createUser({
      email: 'cs-super-admin@example.com',
      name: 'CS Super Admin',
      roles: [{ key: 'super_admin', scopeType: 'none' }],
    });

    app = await createTestApp();
    dsc = await signInAndVerify(app, 'cs-dsc@example.com');
    editingTeam = await signInAndVerify(app, 'cs-editing-team@example.com');
    member = await signInAndVerify(app, 'cs-member@example.com');
    president = await signInAndVerify(app, 'cs-president@example.com');
    contentEditorOnly = await signInAndVerify(app, 'cs-content-editor-only@example.com');
    superAdmin = await signInAndVerify(app, 'cs-super-admin@example.com');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('editing_team may publish content and touch nothing else', () => {
    it('gets 403 on reports, points and members routes', async () => {
      await editingTeam.get('/reports').expect(403);
      await editingTeam.get('/clubs/CS-CLUB-A/points').expect(403);
      await editingTeam.get('/members').expect(403);
    });

    it('can edit a draft and publish a content block', async () => {
      const draft = await editingTeam
        .patch('/content-blocks/home/cs_test_section')
        .send({ type: 'text', draftValue: 'Draft copy' })
        .expect(200);
      expect(draft.body).toMatchObject({ draftValue: 'Draft copy', publishedAt: null });

      const published = await editingTeam
        .patch('/content-blocks/home/cs_test_section')
        .send({ publish: true })
        .expect(200);
      const publishedBody = published.body as {
        publishedValue: unknown;
        publishedAt: string | null;
      };
      expect(publishedBody).toMatchObject({ publishedValue: 'Draft copy' });
      expect(publishedBody.publishedAt).not.toBeNull();
    });

    it('member gets 403 on content-blocks routes', async () => {
      await member.get('/content-blocks').expect(403);
      await member
        .patch('/content-blocks/home/cs_test_section')
        .send({ draftValue: 'x' })
        .expect(403);
    });
  });

  describe('content:edit without content:publish cannot publish', () => {
    it('can save a draft but 403s when it tries to publish', async () => {
      await contentEditorOnly
        .patch('/content-blocks/home/cs_editor_only_section')
        .send({ type: 'text', draftValue: 'Editor draft' })
        .expect(200);

      await contentEditorOnly
        .patch('/content-blocks/home/cs_editor_only_section')
        .send({ publish: true })
        .expect(403);
    });
  });

  describe('link-health admin', () => {
    it('checks and tracks a link when a content block of type link/image is saved, then lists and rechecks it', async () => {
      await editingTeam
        .patch('/content-blocks/home/cs_broken_link')
        .send({ type: 'link', draftValue: { url: 'https://example.invalid/does-not-exist' } })
        .expect(200);

      const list = await editingTeam.get('/asset-links').expect(200);
      const items = (list.body as { items: { id: string; url: string; status: string }[] }).items;
      const tracked = items.find((i) => i.url === 'https://example.invalid/does-not-exist');
      expect(tracked).toBeDefined();
      expect(tracked?.status).toBe('broken');

      const rechecked = await editingTeam
        .patch(`/asset-links/${tracked?.id}`)
        .send({ recheck: true })
        .expect(200);
      expect((rechecked.body as { status: string }).status).toBe('broken');
    });

    it('member is denied', async () => {
      await member.get('/asset-links').expect(403);
    });
  });

  describe('settings (settings:manage is super_admin-only per spec §4.4; dsc does not hold it)', () => {
    it('dsc and editing_team are denied entirely; super_admin can read and update', async () => {
      await dsc.get('/settings').expect(403);
      await dsc.patch('/settings').send({ 'report.deadlineDay': 10 }).expect(403);
      await editingTeam.get('/settings').expect(403);
      await editingTeam.patch('/settings').send({ 'report.deadlineDay': 10 }).expect(403);

      const res = await superAdmin
        .patch('/settings')
        .send({ 'report.deadlineDay': 12 })
        .expect(200);
      expect((res.body as Record<string, unknown>)['report.deadlineDay']).toBe(12);

      const read = await superAdmin.get('/settings').expect(200);
      expect((read.body as Record<string, unknown>)['report.deadlineDay']).toBe(12);
    });

    it('rejects an unknown key and an invalid value', async () => {
      await superAdmin.patch('/settings').send({ 'not.a.real.setting': 1 }).expect(400);
      await superAdmin.patch('/settings').send({ 'report.deadlineDay': 999 }).expect(400);
    });

    it('granting subdomain.mission3011.leadClubId to a club grants its president project_admin, and clearing it revokes the grant', async () => {
      await superAdmin
        .patch('/settings')
        .send({ 'subdomain.mission3011.leadClubId': 'CS-CLUB-A' })
        .expect(200);

      const me = await president.get('/me').expect(200);
      const roleKeys = (me.body as { roles: { roleKey: string }[] }).roles.map((r) => r.roleKey);
      expect(roleKeys).toContain('project_admin:mission3011');

      await superAdmin
        .patch('/settings')
        .send({ 'subdomain.mission3011.leadClubId': null })
        .expect(200);

      const meAfter = await president.get('/me').expect(200);
      const roleKeysAfter = (meAfter.body as { roles: { roleKey: string }[] }).roles.map(
        (r) => r.roleKey,
      );
      expect(roleKeysAfter).not.toContain('project_admin:mission3011');
    });
  });

  describe('public-content admin CRUD (achievements as the representative case)', () => {
    it('is denied for a plain member and available to public_content:manage', async () => {
      await member.get('/achievements').expect(403);
      await member
        .post('/achievements')
        .send({ type: 'milestone', title: 'x', date: '2026-01-01' })
        .expect(403);

      const created = await editingTeam
        .post('/achievements')
        .send({ type: 'milestone', title: 'CS milestone one', date: '2026-01-01' })
        .expect(201);
      const createdId = (created.body as { id: string }).id;
      const second = await editingTeam
        .post('/achievements')
        .send({ type: 'milestone', title: 'CS milestone two', date: '2026-02-01' })
        .expect(201);
      const secondId = (second.body as { id: string }).id;

      const updated = await editingTeam
        .patch(`/achievements/${createdId}`)
        .send({ title: 'CS milestone one (edited)' })
        .expect(200);
      expect((updated.body as { title: string }).title).toBe('CS milestone one (edited)');

      const reordered = await editingTeam
        .post('/achievements/reorder')
        .send({ ids: [secondId, createdId] })
        .expect(201);
      const orderedIds = (reordered.body as { items: { id: string }[] }).items.map((i) => i.id);
      expect(orderedIds.indexOf(secondId)).toBeLessThan(orderedIds.indexOf(createdId));

      await editingTeam.delete(`/achievements/${createdId}`).expect(204);
      await editingTeam.delete(`/achievements/${secondId}`).expect(204);
    });
  });

  describe('sister-club-requests', () => {
    it('a president can create one for their own club but not for another club', async () => {
      await createClub({ id: 'CS-CLUB-B', name: 'CS Club B', zoneName: 'Prithvi' });

      await president
        .post('/sister-club-requests')
        .send({
          clubId: 'CS-CLUB-A',
          partnerClubName: 'Partner Club',
          partnerDistrict: 'District 9999',
          country: 'Kenya',
          contactName: 'Contact Person',
          contactEmail: 'contact@example.org',
        })
        .expect(201);

      await president
        .post('/sister-club-requests')
        .send({
          clubId: 'CS-CLUB-B',
          partnerClubName: 'Partner Club',
          partnerDistrict: 'District 9999',
          country: 'Kenya',
          contactName: 'Contact Person',
          contactEmail: 'contact@example.org',
        })
        .expect(404);
    });

    it('member has no route access at all (no public_content:manage or clubs:edit)', async () => {
      await member
        .post('/sister-club-requests')
        .send({
          clubId: 'CS-CLUB-A',
          partnerClubName: 'Partner Club',
          partnerDistrict: 'District 9999',
          country: 'Kenya',
          contactName: 'Contact Person',
          contactEmail: 'contact@example.org',
        })
        .expect(403);
    });
  });

  describe('enquiries admin', () => {
    it('dsc (public_content:manage) can log and update an enquiry; member is denied', async () => {
      await member.get('/enquiries').expect(403);

      const created = await dsc
        .post('/enquiries')
        .send({
          kind: 'contact',
          name: 'Walk-in',
          email: 'walkin@example.org',
          message: 'Logged over the phone',
          routedTo: 'secretariat@example.org',
        })
        .expect(201);

      const createdId = (created.body as { id: string }).id;
      const updated = await dsc
        .patch(`/enquiries/${createdId}`)
        .send({ status: 'in_progress', assignedToId: null })
        .expect(200);
      expect((updated.body as { status: string }).status).toBe('in_progress');
    });
  });
});
