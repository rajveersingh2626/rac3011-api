import { env } from '../../config/env';

const SUBDOMAINS = ['mission3011', 'drishti', 'rcl', 'careerbridge', 'ride'] as const;
export type SurfaceName = (typeof SUBDOMAINS)[number];

const FALLBACK_ORIGIN = 'http://localhost:5173';

// No per-surface env var exists; derive origins from WEB_ORIGINS (careerbridge.links.ts does the same).
export function mainOrigin(): string {
  return (
    env.WEB_ORIGINS.find((o) => !SUBDOMAINS.some((s) => o.includes(s))) ??
    env.WEB_ORIGINS[0] ??
    FALLBACK_ORIGIN
  );
}

export function surfaceOrigin(surface: SurfaceName): string {
  return env.WEB_ORIGINS.find((o) => o.includes(surface)) ?? mainOrigin();
}

export function link(path: string): string {
  return new URL(path, mainOrigin()).toString();
}

export function surfaceLink(surface: SurfaceName, path: string): string {
  return new URL(path, surfaceOrigin(surface)).toString();
}
