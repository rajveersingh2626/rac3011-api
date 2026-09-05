import { monthKey } from '../../common/ry-year';

// RY runs 1 July (ryYear) to 30 June (ryYear+1); all months are first-of-month UTC dates.
export function ryStartMonth(ryYear: number): Date {
  return new Date(Date.UTC(ryYear, 6, 1));
}

export function ryEndMonth(ryYear: number): Date {
  return new Date(Date.UTC(ryYear + 1, 5, 1));
}

function firstOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, count: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1));
}

/**
 * Months in scope for a monthly rule: the given month when one is supplied, otherwise every
 * month from 1 July of ryYear through min(now, 30 June of ryYear+1).
 */
export function monthsInScope(
  ryYear: number,
  month: Date | undefined,
  now: Date = new Date(),
): Date[] {
  if (month) return [firstOfMonth(month)];

  const start = ryStartMonth(ryYear);
  const end = firstOfMonth(now) < ryEndMonth(ryYear) ? firstOfMonth(now) : ryEndMonth(ryYear);
  if (end < start) return [];

  const months: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) months.push(cursor);
  return months;
}

export { monthKey };
