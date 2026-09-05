import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, httpServer } from './app';
import { signInAndVerify } from './auth-flow';
import { createClub, createUser, TEST_PASSWORD } from './fixtures';
import type { MeResponse } from './types';

// RFC 6238, matching what an authenticator app computes from the same base32 secret.
function totp(base32Secret: string, forTime = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32Secret.toUpperCase().replace(/=+$/, '')) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  }
  const bytes = Buffer.from(
    bits
      .slice(0, Math.floor(bits.length / 8) * 8)
      .match(/.{8}/g)
      ?.map((b) => parseInt(b, 2)) ?? [],
  );
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(forTime / 1000 / 30)));
  const hmac = createHmac('sha1', bytes).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

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

describe('login -> authenticator app (TOTP) second factor', () => {
  let app: INestApplication;

  beforeAll(async () => {
    await createClub({ id: 'AU-CLUB-B', name: 'Club B', zoneName: 'Agni' });
    await createUser({
      email: 'au-totp-user@example.com',
      name: 'TOTP User',
      clubId: 'AU-CLUB-B',
      roles: [{ key: 'member', scopeType: 'club', scopeId: 'AU-CLUB-B' }],
    });
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a sign-in for a TOTP-enrolled account returns twoFactorRedirect, and a valid code completes it', async () => {
    const server = httpServer(app);
    const enrolling = await signInAndVerify(app, 'au-totp-user@example.com');

    const enableRes = await enrolling
      .post('/auth/two-factor/enable')
      .set('Origin', 'https://testing.rotaract3011.org')
      .send({ password: TEST_PASSWORD, method: 'totp' })
      .expect(200);
    const totpURI = (enableRes.body as { totpURI: string }).totpURI;
    const secret = new URL(totpURI).searchParams.get('secret');
    if (!secret) throw new Error('no secret in totpURI');

    await enrolling
      .post('/auth/two-factor/verify-totp')
      .set('Origin', 'https://testing.rotaract3011.org')
      .send({ code: totp(secret) })
      .expect(200);

    const freshAgent = request.agent(server);
    const signIn = await freshAgent
      .post('/auth/sign-in/email')
      .send({ email: 'au-totp-user@example.com', password: TEST_PASSWORD })
      .expect(200);
    expect(signIn.body).toMatchObject({ twoFactorRedirect: true, twoFactorMethods: ['totp'] });

    await freshAgent.get('/me').expect(401);

    await freshAgent
      .post('/auth/two-factor/verify-totp')
      .set('Origin', 'https://testing.rotaract3011.org')
      .send({ code: totp(secret) })
      .expect(200);

    await freshAgent.get('/me').expect(200);
  });
});
