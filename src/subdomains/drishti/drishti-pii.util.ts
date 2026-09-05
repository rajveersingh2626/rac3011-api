import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

// Defense in depth: parseEnv() already exits at boot in prod if this is unset (src/config/env.ts).
function keyBuffer(hexKey: string | undefined | null): Buffer {
  if (!hexKey || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error('DRISHTI_PII_KEY missing or invalid: refusing to encrypt/decrypt PII');
  }
  return Buffer.from(hexKey, 'hex');
}

// Encoding: base64(iv[12] || authTag[16] || ciphertext) per spec D10.
export function encryptPhone(phone: string, hexKey: string | undefined | null): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyBuffer(hexKey), iv);
  const ciphertext = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptPhone(payload: string, hexKey: string | undefined | null): string {
  const raw = Buffer.from(payload, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = raw.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGORITHM, keyBuffer(hexKey), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// Last 4 digits visible, everything else replaced regardless of separators/country code.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return '••••';
  const last4 = digits.slice(-4);
  return `••••${last4}`;
}
