import type { Transaction } from '@/db/schemas';
import { todayISO } from '@/lib/date';

export function isUnassigned(txn: Transaction, activeJarIds: Set<string>): boolean {
  return !activeJarIds.has(txn.jarId);
}

export function filterByJar(
  txns: Transaction[],
  jarId: string | null,
): Transaction[] {
  return jarId ? txns.filter((t) => t.jarId === jarId) : txns;
}

export interface DayGroup {
  date: string; // YYYY-MM-DD
  label: string;
  totalMinor: number;
  items: Transaction[];
}

function dayOffset(iso: string, ref: string): number {
  const a = new Date(iso.slice(0, 10) + 'T00:00:00Z').getTime();
  const b = new Date(ref.slice(0, 10) + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dayLabel(iso: string, locale?: string, ref: string = todayISO()): string {
  const d = dayOffset(iso, ref);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return new Date(iso.slice(0, 10) + 'T00:00:00Z').toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Newest day first; within a day, newest `createdAt` first. */
export function groupByDay(
  txns: Transaction[],
  locale?: string,
  ref: string = todayISO(),
): DayGroup[] {
  const byDate = new Map<string, Transaction[]>();
  for (const t of txns) {
    const key = t.date.slice(0, 10);
    (byDate.get(key) ?? byDate.set(key, []).get(key)!).push(t);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      label: dayLabel(date, locale, ref),
      totalMinor: items.reduce((s, t) => s + t.amountMinor, 0),
      items: [...items].sort((x, y) => (x.createdAt < y.createdAt ? 1 : -1)),
    }));
}
