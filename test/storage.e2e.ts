import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify, type TestAgent } from './auth-flow';
import { createClub, createUser } from './fixtures';
import { StubStorageAdapter } from '../src/storage/adapters/stub-storage.adapter';

type GrantResponse = { grantId: string; uploadUrl: string; fields?: Record<string, string> };
type StoredFileResponse = {
  id: string;
  tier: string;
  url: string | null;
  mimeType: string;
  size: number;
};

describe('storage grant flow (§3A)', () => {
  let app: INestApplication;
  let member: TestAgent;
  let dsc: TestAgent;
  let memberProfileId: string;

  beforeAll(async () => {
    await createClub({ id: 'ST-CLUB-A', name: 'Storage Club A', zoneName: 'Prithvi' });
    await createUser({
      email: 'st-member-a@example.com',
      name: 'Member A',
      clubId: 'ST-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'ST-CLUB-A' }],
    });
    await createUser({
      email: 'st-member-b@example.com',
      name: 'Member B',
      clubId: 'ST-CLUB-A',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'ST-CLUB-A' }],
    });
    await createUser({
      email: 'st-dsc@example.com',
      name: 'DSC Officer',
      roles: [{ key: 'dsc', scopeType: 'none' }],
    });

    app = await createTestApp();
    member = await signInAndVerify(app, 'st-member-a@example.com');
    await signInAndVerify(app, 'st-member-b@example.com');
    dsc = await signInAndVerify(app, 'st-dsc@example.com');

    const me = await member.get('/me').expect(200);
    memberProfileId = (me.body as { profile: { id: string } }).profile.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(httpServer(app))
      .post('/files/grants')
      .send({ tier: 'permanent', mimeType: 'image/png', size: 1024, resourceType: 'partner_logo' })
      .expect(401);
  });

  it('403s a resourceType the caller has no permission for', async () => {
    await member
      .post('/files/grants')
      .send({ tier: 'permanent', mimeType: 'image/png', size: 1024, resourceType: 'partner_logo' })
      .expect(403);
  });

  it("403s member_photo grants for another member's row", async () => {
    await member
      .post('/files/grants')
      .send({
        tier: 'dynamic',
        mimeType: 'image/png',
        size: 1024,
        resourceType: 'member_photo',
        resourceId: 'not-my-profile-id',
      })
      .expect(403);
  });

  it('400s an oversized or wrong-MIME upload', async () => {
    await member
      .post('/files/grants')
      .send({
        tier: 'dynamic',
        mimeType: 'application/zip',
        size: 1024,
        resourceType: 'member_photo',
        resourceId: memberProfileId,
      })
      .expect(400);
    await member
      .post('/files/grants')
      .send({
        tier: 'dynamic',
        mimeType: 'image/png',
        size: 100 * 1024 * 1024,
        resourceType: 'member_photo',
        resourceId: memberProfileId,
      })
      .expect(400);
  });

  it('grants, finalises, and produces a files row with a CDN url', async () => {
    const grantRes = await member
      .post('/files/grants')
      .send({
        tier: 'dynamic',
        mimeType: 'image/png',
        size: 2048,
        resourceType: 'member_photo',
        resourceId: memberProfileId,
      })
      .expect(201);
    const grant = grantRes.body as GrantResponse;
    expect(grant.grantId).toBeTruthy();

    const finaliseRes = await member
      .patch(`/files/grants/${grant.grantId}`)
      .send({ providerKey: 'test-provider-key-1' })
      .expect(200);
    const file = finaliseRes.body as StoredFileResponse;
    expect(file.tier).toBe('dynamic');
    expect(file.url).toMatch(/^stub:\/\/cdn\//);

    const getRes = await member.get(`/files/${file.id}`).redirects(0);
    expect(getRes.status).toBe(301);
    expect(getRes.headers.location).toBe(file.url);
  });

  it('404s a private file for a caller who cannot read the owning resource, 200s for an entitled caller', async () => {
    const grantRes = await dsc
      .post('/files/grants')
      .send({
        tier: 'private',
        mimeType: 'application/pdf',
        size: 4096,
        resourceType: 'resource_document',
      })
      .expect(201);
    const grant = grantRes.body as GrantResponse;
    const finaliseRes = await dsc
      .patch(`/files/grants/${grant.grantId}`)
      .send({ providerKey: 'private-key-1' })
      .expect(200);
    const file = finaliseRes.body as StoredFileResponse;
    expect(file.url).toBeNull();

    await member.get(`/files/${file.id}`).expect(404);
    const entitledRes = await dsc.get(`/files/${file.id}`).expect(200);
    expect(entitledRes.headers['content-type']).toContain('application/octet-stream');
  });

  it('deletes the file through the storage port when the owning row is deleted', async () => {
    const grantRes = await dsc
      .post('/files/grants')
      .send({
        tier: 'private',
        mimeType: 'application/pdf',
        size: 1024,
        resourceType: 'resource_document',
      })
      .expect(201);
    const grant = grantRes.body as GrantResponse;
    const finaliseRes = await dsc
      .patch(`/files/grants/${grant.grantId}`)
      .send({ providerKey: 'private-key-2' })
      .expect(200);
    const file = finaliseRes.body as StoredFileResponse;

    await dsc.delete(`/files/${file.id}`).expect(204);
    await dsc.get(`/files/${file.id}`).expect(404);

    const adapter = app.get(StubStorageAdapter);
    expect(adapter.deletedFileIds()).toContain(file.id);
  });
});
