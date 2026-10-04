import type { Jar } from '@/db/schemas';
import { todayISO } from '@/lib/date';

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

/** A posted allocation event, normalised (same shape as `DebitEvent`, just credited). */
export type CreditEvent = DebitEvent;

/** Balance-over-time for a jar: each credit (a posted allocation) accrues on
 *  its own date; each debit subtracts on its date. Balance is displayed
 *  clamped at 0; the final point matches the jar's deterministic balance
 *  (`accumulationBalanceMinor` / `flowRunningBalanceMinor`). */
export function buildBalanceTimeline(
  jar: Jar,
  credits: CreditEvent[],
  debits: DebitEvent[],
  ref: string = todayISO(),
): TimelinePoint[] {
  const start = jar.startedAt.slice(0, 10);
  const refDay = ref.slice(0, 10);
  // Keep every plotted date inside [start, ref] so an event that predates the
  // jar (e.g. imported history) or lands after `ref` can't blow out the x-axis.
  // The delta still applies in full, so the final balance is unchanged.
  const clampDay = (d: string) => (d < start ? start : d > refDay ? refDay : d);

  type Ev = { date: string; delta: number; kind: 'accrual' | 'debit'; label?: string; seq: number };
  const events: Ev[] = [
    ...credits.map((c): Ev => ({
      date: clampDay(c.date.slice(0, 10)),
      delta: c.amountMinor,
      kind: 'accrual',
      label: c.label,
      seq: 0, // same-day: accrual first, then debit
    })),
    ...debits.map((d): Ev => ({
      date: clampDay(d.date.slice(0, 10)),
      delta: -d.amountMinor,
      kind: 'debit',
      label: d.label?.trim() || 'Debit',
      seq: 1,
    })),
  ];
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
  points.push({ date: refDay, balanceMinor: Math.max(0, running), kind: 'now', deltaMinor: 0 });
  return points;
}

export function debitPoints(points: TimelinePoint[]): TimelinePoint[] {
  return points.filter((p) => p.kind === 'debit');
}

/** True once the series spans enough time to be worth charting — at least one
 *  monthly credit has posted, or the window is a month or wider. Matches the
 *  empty-state guard in `BalanceTimeline`. */
export function hasTimelineHistory(points: TimelinePoint[]): boolean {
  if (points.some((p) => p.kind === 'accrual')) return true;
  const t = (iso: string) => new Date(iso + 'T00:00:00Z').getTime();
  return t(points[points.length - 1].date) - t(points[0].date) >= 28 * 86_400_000;
}
