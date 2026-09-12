import { describe, expect, it } from 'vitest';
import { configWarnings } from './config-report';
import { parseEnv } from './env';

const prodEnv = (over: Record<string, string> = {}) =>
  parseEnv({
    NODE_ENV: 'production',
    AUTH_SECRET: 'a'.repeat(64),
    DRISHTI_PII_KEY: 'b'.repeat(64),
    WEB_ORIGINS: 'https://rotaract3011.org',
    STORAGE_DRIVER: 'stub',
    ...over,
  });

describe('configWarnings', () => {
  it('is silent when production config is sound', () => {
    expect(configWarnings(prodEnv({ MAIL_DRIVER: 'pool', MAIL_LIVE: '1' }))).toEqual([]);
  });

  it('reports placeholder values left at CHANGEME', () => {
    const out = configWarnings(prodEnv({ MAIL_DRIVER: 'pool', SENTRY_DSN: 'CHANGEME' }));
    expect(out.join('\n')).toMatch(/SENTRY_DSN/);
  });

  it('reports mail being black-holed to the console', () => {
    const out = configWarnings(prodEnv({ MAIL_DRIVER: 'console' }));
    expect(out.join('\n')).toMatch(/MAIL_DRIVER/);
  });

  it('reports a live mail driver with sending disabled', () => {
    const out = configWarnings(prodEnv({ MAIL_DRIVER: 'pool', MAIL_LIVE: '0' }));
    expect(out.join('\n')).toMatch(/MAIL_LIVE/);
  });

  it('says nothing outside production', () => {
    const dev = parseEnv({
      NODE_ENV: 'development',
      MAIL_DRIVER: 'console',
      SENTRY_DSN: 'CHANGEME',
    });
    expect(configWarnings(dev)).toEqual([]);
  });
});
