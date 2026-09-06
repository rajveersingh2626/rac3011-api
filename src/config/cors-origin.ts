import { env } from './env';

const APEX = 'rotaract3011.org';

// The site's own hostnames are always allowed. WEB_ORIGINS drifted to a testing-only
// list once and silently blocked every production origin, taking the whole site down.
export function isAllowedOrigin(origin: string): boolean {
  if (env.WEB_ORIGINS.includes(origin)) return true;
  let host: string;
  let protocol: string;
  try {
    ({ hostname: host, protocol } = new URL(origin));
  } catch {
    return false;
  }
  if (protocol !== 'https:') return false;
  return host === APEX || host.endsWith(`.${APEX}`);
}

export function corsOrigin(
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void,
): void {
  // No Origin header means a same-origin or non-browser caller; nothing to authorise.
  if (!origin) return cb(null, true);
  cb(null, isAllowedOrigin(origin));
}
