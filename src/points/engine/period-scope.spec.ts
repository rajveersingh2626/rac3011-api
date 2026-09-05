import { describe, expect, it } from 'vitest';
import { monthKey, monthsInScope, ryEndMonth, ryStartMonth } from './period-scope';

describe('ryStartMonth / ryEndMonth', () => {
  it('RY starts 1 July of ryYear and ends 1 June of ryYear+1', () => {
    expect(ryStartMonth(2026).toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(ryEndMonth(2026).toISOString()).toBe('2027-06-01T00:00:00.000Z');
  });
});

describe('monthsInScope', () => {
  it('returns exactly the given month, normalized to the first of the month', () => {
    const months = monthsInScope(2026, new Date('2026-08-17T00:00:00Z'));
    expect(months.map((m) => monthKey(m))).toEqual(['2026-08']);
  });

  it('with no month, returns July..now when now is inside the RY', () => {
    const months = monthsInScope(2026, undefined, new Date('2026-09-05T00:00:00Z'));
    expect(months.map((m) => monthKey(m))).toEqual(['2026-07', '2026-08', '2026-09']);
  });

  it('caps at 30 June of the RY when now is past the RY end', () => {
    const months = monthsInScope(2026, undefined, new Date('2028-01-01T00:00:00Z'));
    expect(months.map((m) => monthKey(m))).toEqual([
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
      '2027-04',
      '2027-05',
      '2027-06',
    ]);
  });

  it('returns an empty array when now is before the RY starts', () => {
    expect(monthsInScope(2026, undefined, new Date('2026-01-01T00:00:00Z'))).toEqual([]);
  });
});
