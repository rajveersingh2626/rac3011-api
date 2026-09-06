import { describe, expect, it } from 'vitest';
import { isAllowedOrigin } from './cors-origin';

describe('isAllowedOrigin', () => {
  it('allows the apex and its https subdomains regardless of WEB_ORIGINS', () => {
    expect(isAllowedOrigin('https://rotaract3011.org')).toBe(true);
    expect(isAllowedOrigin('https://www.rotaract3011.org')).toBe(true);
    expect(isAllowedOrigin('https://mission3011.rotaract3011.org')).toBe(true);
    expect(isAllowedOrigin('https://testing.careerbridge.rotaract3011.org')).toBe(true);
  });

  it('rejects lookalike hosts that merely end with the apex string', () => {
    expect(isAllowedOrigin('https://notrotaract3011.org')).toBe(false);
    expect(isAllowedOrigin('https://rotaract3011.org.evil.com')).toBe(false);
    expect(isAllowedOrigin('https://evilrotaract3011.org')).toBe(false);
  });

  it('rejects plaintext http and malformed origins', () => {
    expect(isAllowedOrigin('http://rotaract3011.org')).toBe(false);
    expect(isAllowedOrigin('not-a-url')).toBe(false);
    expect(isAllowedOrigin('null')).toBe(false);
  });
});
