import type { SubCategory, Transaction } from '@/db/schemas';
import { addMonths, monthKey, todayISO } from '@/lib/date';
import { APP_LOCALE } from '@/lib/locale';

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

export function dayLabel(
  iso: string,
  locale: string = APP_LOCALE,
  ref: string = todayISO(),
): string {
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
  locale: string = APP_LOCALE,
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

export interface SubCategoryRow {
  /** null = Uncategorised */
  subCategoryId: string | null;
  name: string;
  /** spent this month */
  minor: number;
  /** of this month's spend on the jar, 0..1 */
  share: number;
  /** spent last month */
  prevMinor: number;
}

/** A jar's spend this month by sub-category — largest first — with last
 *  month alongside. Untagged spend, or a sub-category that isn't this jar's
 *  (a transaction moved between jars), rolls up as "Uncategorised". Rows
 *  empty in both months are dropped. */
export function subCategoryBreakdown(
  jarId: string,
  subs: SubCategory[],
  txns: Transaction[],
  ref: string = todayISO(),
): SubCategoryRow[] {
  const thisMonth = monthKey(ref);
  const lastMonth = monthKey(addMonths(ref, -1));
  const names = new Map(subs.filter((s) => s.jarId === jarId).map((s) => [s.id, s.name]));
  const rows = new Map<string | null, SubCategoryRow>();

  for (const t of txns) {
    if (t.jarId !== jarId) continue;
    const month = monthKey(t.date);
    if (month !== thisMonth && month !== lastMonth) continue;
    const id = t.subCategoryId && names.has(t.subCategoryId) ? t.subCategoryId : null;
    let row = rows.get(id);
    if (!row) {
      row = { subCategoryId: id, name: id ? names.get(id)! : 'Uncategorised', minor: 0, share: 0, prevMinor: 0 };
      rows.set(id, row);
    }
    if (month === thisMonth) row.minor += t.amountMinor;
    else row.prevMinor += t.amountMinor;
  }

  const total = [...rows.values()].reduce((s, r) => s + r.minor, 0);
  return [...rows.values()]
    .map((r) => ({ ...r, share: total > 0 ? r.minor / total : 0 }))
    .sort((a, b) => b.minor - a.minor || b.prevMinor - a.prevMinor);
}
