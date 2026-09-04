export function reportDeadline(month: Date, deadlineDay: number): Date {
  const year = month.getUTCFullYear();
  const nextMonth = month.getUTCMonth() + 1;
  return new Date(Date.UTC(year, nextMonth, deadlineDay, 23, 59, 59, 999));
}

export function isFiledOnTime(month: Date, submittedAt: Date, deadlineDay: number): boolean {
  return submittedAt.getTime() <= reportDeadline(month, deadlineDay).getTime();
}
