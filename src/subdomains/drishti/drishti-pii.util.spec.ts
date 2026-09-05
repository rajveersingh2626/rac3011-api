import { describe, expect, it } from 'vitest';
import { decryptPhone, encryptPhone, maskPhone } from './drishti-pii.util';

const KEY = 'de'.repeat(32);
const OTHER_KEY = 'ab'.repeat(32);

describe('drishti-pii.util', () => {
  it('round-trips a phone number through AES-256-GCM', () => {
    const encrypted = encryptPhone('+91 98765 43210', KEY);
    expect(encrypted).not.toContain('98765');
    expect(decryptPhone(encrypted, KEY)).toBe('+91 98765 43210');
  });

  it('produces a different ciphertext each time (random iv)', () => {
    const a = encryptPhone('9876543210', KEY);
    const b = encryptPhone('9876543210', KEY);
    expect(a).not.toBe(b);
  });

  it('fails to decrypt with the wrong key', () => {
    const encrypted = encryptPhone('9876543210', KEY);
    expect(() => decryptPhone(encrypted, OTHER_KEY)).toThrow();
  });

  it('masks all but the last 4 digits', () => {
    expect(maskPhone('+91 98765 43210')).toBe('••••3210');
    expect(maskPhone('9876543210')).toBe('••••3210');
    expect(maskPhone('123')).toBe('••••123');
    expect(maskPhone('')).toBe('••••');
  });

  it('fails closed when the key is missing, empty, or malformed', () => {
    expect(() => encryptPhone('9876543210', undefined)).toThrow(/DRISHTI_PII_KEY/);
    expect(() => encryptPhone('9876543210', null)).toThrow(/DRISHTI_PII_KEY/);
    expect(() => encryptPhone('9876543210', '')).toThrow(/DRISHTI_PII_KEY/);
    expect(() => encryptPhone('9876543210', 'not-hex')).toThrow(/DRISHTI_PII_KEY/);
    const encrypted = encryptPhone('9876543210', KEY);
    expect(() => decryptPhone(encrypted, undefined)).toThrow(/DRISHTI_PII_KEY/);
    expect(() => decryptPhone(encrypted, '')).toThrow(/DRISHTI_PII_KEY/);
  });
});
