// Returns null while unpaid - nothing to score yet either way, preventing premature negative baseline.
export function duesBracket(duesPaidOn: Date | null, ryYear: number, _now: Date): number | null {
  if (!duesPaidOn) return null;
  const aug31 = new Date(Date.UTC(ryYear, 7, 31, 23, 59, 59));
  const sep30 = new Date(Date.UTC(ryYear, 8, 30, 23, 59, 59));

  if (duesPaidOn <= aug31) return 0;
  if (duesPaidOn <= sep30) return 1;
  return 2;
}
