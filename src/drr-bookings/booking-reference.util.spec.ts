import { describe, expect, it } from 'vitest';
import {
  buildBookingReference,
  isBookingReference,
  BOOKING_REFERENCE_PATTERN,
} from './booking-reference.util';

describe('buildBookingReference', () => {
  it('encodes the UTC year and month of the request', () => {
    const ref = buildBookingReference(new Date('2026-03-09T22:30:00Z'), () => 0);
    expect(ref).toBe('DRR-2603-AAAAAA');
  });

  it('pads a single-digit month and wraps the year to two digits', () => {
    expect(buildBookingReference(new Date('2030-01-01T00:00:00Z'), () => 0)).toBe(
      'DRR-3001-AAAAAA',
    );
  });

  it('never emits characters that are ambiguous when read aloud', () => {
    for (let i = 0; i < 500; i += 1) {
      const suffix = buildBookingReference(new Date()).split('-')[2];
      expect(suffix).not.toMatch(/[ILOU01]/);
    }
  });

  it('produces references matching the documented pattern', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(buildBookingReference(new Date())).toMatch(BOOKING_REFERENCE_PATTERN);
    }
  });

  it('draws every suffix character from the alphabet independently', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) seen.add(buildBookingReference(new Date()));
    // Not 200: independent draws collide occasionally, and a birthday collision is not a bug.
    expect(seen.size).toBeGreaterThan(195);
  });

  it('rejects malformed references', () => {
    expect(isBookingReference('DRR-2603-AAAAAA')).toBe(true);
    expect(isBookingReference('drr-2603-aaaaaa')).toBe(false);
    expect(isBookingReference('DRR-2603-AAAAA')).toBe(false);
    expect(isBookingReference('DRR-2603-AAAAA0')).toBe(false);
    expect(isBookingReference('nonsense')).toBe(false);
  });
});
