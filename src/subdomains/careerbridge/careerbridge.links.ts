import { env } from '../../config/env';

// No per-surface env var exists; derive the careerbridge origin from WEB_ORIGINS (decisions.md).
export function careerbridgeWebOrigin(): string {
  return (
    env.WEB_ORIGINS.find((o) => o.includes('careerbridge')) ??
    env.WEB_ORIGINS[0] ??
    'http://localhost:5173'
  );
}

export function careerbridgeVerifyLink(token: string): string {
  const origin = careerbridgeWebOrigin();
  const url = new URL('/verify', origin);
  url.searchParams.set('token', token);
  url.searchParams.set('surface', 'careerbridge');
  return url.toString();
}
