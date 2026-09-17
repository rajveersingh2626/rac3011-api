import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export interface BurnerCheckinPayload {
  jti: string;
  eid: string;
  mid: string;
  iat: number;
  exp: number;
}

export const CHECKIN_TOKEN_TTL_SECONDS = 86400 * 7; // 7 days

export function signCheckinToken(
  eventId: string,
  memberId: string,
  ttlSeconds = CHECKIN_TOKEN_TTL_SECONDS,
): { token: string; expiresAt: Date; jti: string } {
  const now = Math.floor(Date.now() / 1000);
  const jti = randomUUID();
  const exp = now + ttlSeconds;

  const payload: BurnerCheckinPayload = {
    jti,
    eid: eventId,
    mid: memberId,
    iat: now,
    exp,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', env.AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return {
    token: `${header}.${body}.${signature}`,
    expiresAt: new Date(exp * 1000),
    jti,
  };
}

export function verifyCheckinToken(token: string): BurnerCheckinPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  try {
    const expectedSignature = createHmac('sha256', env.AUTH_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigA = Buffer.from(signature);
    const sigB = Buffer.from(expectedSignature);

    if (sigA.length !== sigB.length || !timingSafeEqual(sigA, sigB)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as BurnerCheckinPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    if (!payload.eid || !payload.mid || !payload.jti) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function buildGoogleWalletPass(
  event: { id: string; title: string; startsAt: Date; location?: string | null },
  member: { id: string; fullName: string; clubName?: string | null },
  token: string,
) {
  // Generic Google Wallet Event Ticket Object structure
  const passObject = {
    id: `rotaract3011.${event.id}.${member.id}`,
    classId: `rotaract3011.event_${event.id}`,
    logo: {
      sourceUri: {
        uri: 'https://rotaract3011.org/logo.png',
      },
      contentDescription: {
        defaultValue: {
          language: 'en-US',
          value: 'Rotaract District 3011 Logo',
        },
      },
    },
    cardTitle: {
      defaultValue: {
        language: 'en-US',
        value: 'Rotaract District 3011',
      },
    },
    subheader: {
      defaultValue: {
        language: 'en-US',
        value: 'EVENT PASS',
      },
    },
    header: {
      defaultValue: {
        language: 'en-US',
        value: event.title,
      },
    },
    barcode: {
      type: 'QR_CODE',
      value: token,
      alternateText: member.fullName,
    },
    textModulesData: [
      {
        id: 'attendee',
        header: 'ATTENDEE',
        body: member.fullName,
      },
      {
        id: 'club',
        header: 'CLUB',
        body: member.clubName ?? 'District 3011',
      },
      {
        id: 'location',
        header: 'VENUE',
        body: event.location ?? 'TBA',
      },
    ],
  };

  // Google Wallet save link (payload can be signed when service account is active)
  const saveUrl = `https://pay.google.com/gp/v/save/${encodeURIComponent(
    Buffer.from(JSON.stringify(passObject)).toString('base64url'),
  )}`;

  return {
    passObject,
    saveUrl,
  };
}
