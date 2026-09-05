// Returns null while unpaid and before the 30 Sep cutoff - nothing to score yet either way.
export function duesBracket(duesPaidOn: Date | null, ryYear: number, now: Date): number | null {
  const aug31 = new Date(Date.UTC(ryYear, 7, 31, 23, 59, 59));
  const sep30 = new Date(Date.UTC(ryYear, 8, 30, 23, 59, 59));

  if (duesPaidOn) {
    if (duesPaidOn <= aug31) return 0;
    if (duesPaidOn <= sep30) return 1;
    return 2;
  }
  return now > sep30 ? 2 : null;
}
