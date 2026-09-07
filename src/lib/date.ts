/** Date helpers. All persisted dates are ISO strings; month math is whole-month,
 *  timezone-naive on the date part only (see DATA-MODEL.md compute model). */

import { APP_LOCALE } from './locale';

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

export function monthLabel(iso: string = nowISO(), locale: string = APP_LOCALE): string {
  return new Date(iso).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/** Add `n` whole months to an ISO date, returning a "YYYY-MM-DD" string.
 *  Day-of-month is clamped to the target month's length (Jan 31 + 1mo -> Feb 28). */
export function addMonths(iso: string, n: number): string {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}
