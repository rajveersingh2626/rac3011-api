import type { Env } from './env';

const PLACEHOLDER = /^CHANGEME/i;

// Dokploy stores env encrypted and outside code review, so drift is invisible
// until something breaks. Surfacing it at boot is the only feedback loop.
export function configWarnings(env: Env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const out: string[] = [];

  const placeholders = (Object.entries(env) as [string, unknown][])
    .filter(([, v]) => typeof v === 'string' && PLACEHOLDER.test(v))
    .map(([k]) => k)
    .sort();
  if (placeholders.length) out.push(`placeholder values still set: ${placeholders.join(', ')}`);

  if (env.MAIL_DRIVER === 'console')
    out.push('MAIL_DRIVER=console: no email is delivered, including password resets and OTPs');

  if (env.MAIL_DRIVER === 'pool' && !env.MAIL_LIVE)
    out.push('MAIL_DRIVER=pool but MAIL_LIVE=0: mail is redirected to MAIL_ALLOWLIST');

  return out;
}
