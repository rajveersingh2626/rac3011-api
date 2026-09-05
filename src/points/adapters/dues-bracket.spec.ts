import { describe, expect, it } from 'vitest';
import { duesBracket } from './dues-bracket';

const now = new Date('2027-01-01T00:00:00Z');

describe('duesBracket', () => {
  it('bracket 0 for dues paid on or before 31 August', () => {
    expect(duesBracket(new Date('2026-08-31T10:00:00Z'), 2026, now)).toBe(0);
    expect(duesBracket(new Date('2026-07-15T00:00:00Z'), 2026, now)).toBe(0);
  });

  it('bracket 1 for dues paid between 1 September and 30 September', () => {
    expect(duesBracket(new Date('2026-09-01T00:00:00Z'), 2026, now)).toBe(1);
    expect(duesBracket(new Date('2026-09-30T23:00:00Z'), 2026, now)).toBe(1);
  });

  it('bracket 2 for dues paid after 30 September', () => {
    expect(duesBracket(new Date('2026-10-01T00:00:00Z'), 2026, now)).toBe(2);
    expect(duesBracket(new Date('2026-12-25T00:00:00Z'), 2026, now)).toBe(2);
  });

  it('bracket 2 when never paid and the cutoff has passed', () => {
    expect(duesBracket(null, 2026, new Date('2026-10-05T00:00:00Z'))).toBe(2);
  });

  it('null when never paid and the cutoff has not passed yet', () => {
    expect(duesBracket(null, 2026, new Date('2026-09-01T00:00:00Z'))).toBeNull();
  });
});
