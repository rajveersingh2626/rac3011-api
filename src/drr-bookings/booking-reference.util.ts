import { randomInt } from 'node:crypto';

// Ambiguity-free alphabet: a reference gets read out over the phone, so no I/L/O/U/0/1.
const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
const SUFFIX_LENGTH = 6;

export type RandomIndex = (maxExclusive: number) => number;

export function buildBookingReference(now: Date, pick: RandomIndex = randomInt): string {
  const yy = String(now.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) suffix += ALPHABET[pick(ALPHABET.length)];
  return `DRR-${yy}${mm}-${suffix}`;
}

export const BOOKING_REFERENCE_PATTERN = /^DRR-\d{4}-[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/;

export function isBookingReference(value: string): boolean {
  return BOOKING_REFERENCE_PATTERN.test(value);
}
