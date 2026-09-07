import type { Jar } from '@/db/schemas';
import { addMonths, todayISO, wholeMonthsBetween } from '@/lib/date';

export type TimelineKind = 'start' | 'accrual' | 'debit' | 'now';

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  balanceMinor: number;
  kind: TimelineKind;
  label?: string;
  /** signed change at this point (0 for start/now) */
  deltaMinor: number;
}

/** A withdrawal (accumulation) or a transaction (flow), normalised. */
export interface DebitEvent {
  amountMinor: number; // positive
  date: string;
  label?: string;
}

/** Balance-over-time for a jar: `monthlyCreditMinor` accrues at each whole-month
 *  boundary from `startedAt`; each debit subtracts on its date. Balance is
 *  displayed clamped at 0; the final point matches the jar's deterministic
 *  balance (`accumulationBalanceMinor` / `flowRunningBalanceMinor`). */
export function buildBalanceTimeline(
  jar: Jar,
  monthlyCreditMinor: number,
  debits: DebitEvent[],
  ref: string = todayISO(),
): TimelinePoint[] {
  const start = jar.startedAt.slice(0, 10);
  const months = wholeMonthsBetween(start, ref);

  type Ev = { date: string; delta: number; kind: 'accrual' | 'debit'; label?: string; seq: number };
  const events: Ev[] = [];

  for (let i = 1; i <= months; i++) {
    events.push({ date: addMonths(start, i), delta: monthlyCreditMinor, kind: 'accrual', seq: 0 });
  }
  for (const d of debits) {
    events.push({
      date: d.date.slice(0, 10),
      delta: -d.amountMinor,
      kind: 'debit',
      label: d.label?.trim() || 'Debit',
      seq: 1, // same-day: accrual first, then debit
    });
  }
  events.sort((a, b) => (a.date === b.date ? a.seq - b.seq : a.date < b.date ? -1 : 1));

  let running = jar.openingBalanceMinor;
  const points: TimelinePoint[] = [
    { date: start, balanceMinor: Math.max(0, running), kind: 'start', deltaMinor: 0 },
  ];
  for (const e of events) {
    running += e.delta;
    points.push({
      date: e.date,
      balanceMinor: Math.max(0, running),
      kind: e.kind,
      label: e.label,
      deltaMinor: e.delta,
    });
  }
  points.push({ date: ref, balanceMinor: Math.max(0, running), kind: 'now', deltaMinor: 0 });
  return points;
}

export function debitPoints(points: TimelinePoint[]): TimelinePoint[] {
  return points.filter((p) => p.kind === 'debit');
}
