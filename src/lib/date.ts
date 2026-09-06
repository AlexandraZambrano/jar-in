/** Date helpers. All persisted dates are ISO strings; month math is whole-month,
 *  timezone-naive on the date part only (see DATA-MODEL.md compute model). */

export function nowISO(): string {
  return new Date().toISOString();
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "YYYY-MM" for an ISO date/datetime string. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function isSameMonth(a: string, b: string): boolean {
  return monthKey(a) === monthKey(b);
}

/** Whole months elapsed from `startISO` to `endISO`, never negative. */
export function wholeMonthsBetween(startISO: string, endISO: string): number {
  const s = new Date(startISO.slice(0, 10));
  const e = new Date(endISO.slice(0, 10));
  let months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
  if (e.getUTCDate() < s.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

export function monthLabel(iso: string = nowISO(), locale?: string): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}
