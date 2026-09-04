import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify } from './auth-flow';
import { createClub, createUser } from './fixtures';
import type { MeResponse } from './types';

describe('login -> email OTP second factor -> /me', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await createClub({ id: 'AU-CLUB-A', name: 'Club A', zoneName: 'Prithvi' });
    await createUser({
      email: 'au-president-a@example.com',
      name: 'President A',
      clubId: 'AU-CLUB-A',
      roles: [
        { key: 'member', scopeType: 'club', scopeId: 'AU-CLUB-A' },
        { key: 'president', scopeType: 'club', scopeId: 'AU-CLUB-A' },
      ],
    });
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('blocks every route except the second-factor endpoints until the OTP is verified', async () => {
    const agent = request.agent(httpServer(app));
    await agent
      .post('/auth/sign-in/email')
      .send({ email: 'au-president-a@example.com', password: 'Correct-Horse-Battery-Staple-1' })
      .expect(200);

    await agent.get('/me').expect(401);
    await agent.post('/second-factor/resend').expect(201);
  });

  it('shows president scoped to their club plus the member role after verifying', async () => {
    const agent = await signInAndVerify(app, 'au-president-a@example.com');

    const res = await agent.get('/me').expect(200);
    const body = res.body as MeResponse;
    expect(body.user.email).toBe('au-president-a@example.com');
    expect(body.profile?.clubId).toBe('AU-CLUB-A');
    const roleKeys = body.roles.map((r) => r.roleKey).sort();
    expect(roleKeys).toEqual(['member', 'president']);
    expect(body.roles.every((r) => r.scope.type === 'club' && r.scope.id === 'AU-CLUB-A')).toBe(
      true,
    );
    expect(body.clubs.map((c) => c.id)).toEqual(['AU-CLUB-A']);
  });
});
