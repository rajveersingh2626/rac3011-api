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
