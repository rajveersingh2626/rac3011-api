import { describe, expect, it } from 'vitest';
import { parseEnv } from './env';

describe('parseEnv', () => {
  it('applies development defaults', () => {
    const env = parseEnv({ NODE_ENV: 'development' });
    expect(env.PORT).toBe(3000);
    expect(env.MAIL_DRIVER).toBe('console');
    expect(env.WORKER).toBe(false);
    expect(env.WEB_ORIGINS).toEqual([]);
    expect(env.RESEND_DAILY_CAP).toBe(100);
  });

  it('parses csv lists and flags', () => {
    const env = parseEnv({
      WEB_ORIGINS: 'http://a.test, http://b.test',
      WORKER: '1',
      SEED_DEV: '1',
    });
    expect(env.WEB_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
    expect(env.WORKER).toBe(true);
    expect(env.SEED_DEV).toBe(true);
  });

  it('rejects invalid values', () => {
    expect(() => parseEnv({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => parseEnv({ AUTH_SECRET: 'short' })).toThrow(/AUTH_SECRET/);
    expect(() => parseEnv({ DRISHTI_PII_KEY: 'nothex' })).toThrow(/DRISHTI_PII_KEY/);
  });

  it('refuses production with dev secret or no origins', () => {
    expect(() => parseEnv({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://x/y' })).toThrow(
      /production/,
    );
  });

  it('refuses production with the dev-default Drishti PII key', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://x/y',
        AUTH_SECRET: 'a-real-32-plus-byte-secret-value-here',
        WEB_ORIGINS: 'https://rotaract3011.org',
      }),
    ).toThrow(/DRISHTI_PII_KEY/);
  });
});
