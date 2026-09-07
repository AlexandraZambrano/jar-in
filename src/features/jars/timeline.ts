import type { Jar, WithdrawalEvent } from '@/db/schemas';
import { addMonths, todayISO, wholeMonthsBetween } from '@/lib/date';

export type TimelineKind = 'start' | 'accrual' | 'withdrawal' | 'now';

export interface TimelinePoint {
  date: string; // YYYY-MM-DD
  balanceMinor: number;
  kind: TimelineKind;
  label?: string;
  /** signed change at this point (0 for start/now) */
  deltaMinor: number;
}

/** Balance-over-time for an accumulation jar: monthly contributions accrue at
 *  each whole-month boundary from `startedAt`; withdrawals subtract on their
 *  date. Balance is displayed clamped at 0; the final point matches
 *  `accumulationBalanceMinor` (dashboard/compute.ts). */
export function buildBalanceTimeline(
  jar: Jar,
  plannedPerMonthMinor: number,
  withdrawals: WithdrawalEvent[],
  ref: string = todayISO(),
): TimelinePoint[] {
  const start = jar.startedAt.slice(0, 10);
  const months = wholeMonthsBetween(start, ref);

  type Ev = { date: string; delta: number; kind: 'accrual' | 'withdrawal'; label?: string; seq: number };
  const events: Ev[] = [];

  for (let i = 1; i <= months; i++) {
    events.push({ date: addMonths(start, i), delta: plannedPerMonthMinor, kind: 'accrual', seq: 0 });
  }
  for (const w of withdrawals) {
    if (w.jarId !== jar.id) continue;
    events.push({
      date: w.date.slice(0, 10),
      delta: -w.amountMinor,
      kind: 'withdrawal',
      label: w.reason?.trim() || 'Withdrawal',
      seq: 1, // same-day: accrual first, then withdrawal
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

export function withdrawalPoints(points: TimelinePoint[]): TimelinePoint[] {
  return points.filter((p) => p.kind === 'withdrawal');
}
