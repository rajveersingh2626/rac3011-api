import { describe, expect, it } from 'vitest';
import { isFiledOnTime, reportDeadline } from './report-deadline';

describe('reportDeadline', () => {
  it('is the deadlineDay of the month after the reported month', () => {
    const d = reportDeadline(new Date('2026-08-01T00:00:00Z'), 5);
    expect(d.toISOString()).toBe('2026-09-05T23:59:59.999Z');
  });

  it('rolls over the year for a December report', () => {
    const d = reportDeadline(new Date('2026-12-01T00:00:00Z'), 5);
    expect(d.toISOString()).toBe('2027-01-05T23:59:59.999Z');
  });
});

describe('isFiledOnTime', () => {
  it('is true at or before the deadline, false after', () => {
    const month = new Date('2026-08-01T00:00:00Z');
    expect(isFiledOnTime(month, new Date('2026-09-05T23:59:59.999Z'), 5)).toBe(true);
    expect(isFiledOnTime(month, new Date('2026-09-01T00:00:00Z'), 5)).toBe(true);
    expect(isFiledOnTime(month, new Date('2026-09-06T00:00:00Z'), 5)).toBe(false);
  });
});
