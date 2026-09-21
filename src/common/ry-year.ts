// Rotary Year (RY) runs 1 July to 30 June; ryYear is the integer of the July it started in.
export function ryYearOf(date: Date): number {
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  return month >= 7 ? year : year - 1;
}

export function currentRyYear(now: Date = new Date()): number {
  const kolkata = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ryYearOf(kolkata);
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(now: Date = new Date()): string {
  const kolkata = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${kolkata.getFullYear()}-${String(kolkata.getMonth() + 1).padStart(2, '0')}`;
}

export function firstOfCurrentMonth(now: Date = new Date()): Date {
  const kolkata = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return new Date(Date.UTC(kolkata.getFullYear(), kolkata.getMonth(), 1));
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  const name = MONTH_NAMES[(m ?? 1) - 1] ?? monthStr;
  return `${name} ${y}`;
}

export function getRyMonths(ryYear: number, now: Date = new Date()) {
  const currentFirst = firstOfCurrentMonth(now);
  const currentKey = currentMonthKey(now);
  const months = [];

  // July to December of ryYear
  for (let m = 7; m <= 12; m++) {
    const key = `${ryYear}-${String(m).padStart(2, '0')}`;
    const date = new Date(Date.UTC(ryYear, m - 1, 1));
    const isFuture = date > currentFirst;
    months.push({
      key,
      label: `${MONTH_NAMES[m - 1]} ${ryYear}`,
      ryYear,
      isPast: date < currentFirst,
      isCurrent: key === currentKey,
      isFuture,
      isLocked: isFuture,
    });
  }

  // January to June of ryYear + 1
  for (let m = 1; m <= 6; m++) {
    const nextYear = ryYear + 1;
    const key = `${nextYear}-${String(m).padStart(2, '0')}`;
    const date = new Date(Date.UTC(nextYear, m - 1, 1));
    const isFuture = date > currentFirst;
    months.push({
      key,
      label: `${MONTH_NAMES[m - 1]} ${nextYear}`,
      ryYear,
      isPast: date < currentFirst,
      isCurrent: key === currentKey,
      isFuture,
      isLocked: isFuture,
    });
  }

  return months;
}
