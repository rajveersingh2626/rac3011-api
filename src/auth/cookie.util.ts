import { createHash } from 'node:crypto';

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function serializeCookie(
  name: string,
  value: string,
  options: { maxAgeSeconds: number; domain: string; secure: boolean },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${options.maxAgeSeconds}`,
    `Domain=${options.domain}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (options.secure) parts.push('Secure');
  return parts.join('; ');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function toWebHeaders(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export function extractClientIp(req: { headers?: Record<string, string | string[] | undefined>; ip?: string; socket?: { remoteAddress?: string } }): string | null {
  const headers = req.headers;
  const extractHeader = (hName: string): string | null => {
    if (!headers) return null;
    const val = headers[hName] || headers[hName.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return val || null;
  };

  const rawIp =
    extractHeader('cf-connecting-ip') ||
    extractHeader('x-real-ip') ||
    extractHeader('x-client-ip') ||
    extractHeader('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    null;

  if (!rawIp) return null;
  return String(rawIp).replace(/^::ffff:/, '').trim();
}
