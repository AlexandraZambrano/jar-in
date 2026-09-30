import { describe, expect, it } from 'vitest';
import type { AllocationEvent, Jar } from '@/db/schemas';
import { addMonths } from '@/lib/date';
import {
  buildBalanceTimeline,
  debitPoints,
  hasTimelineHistory,
  type CreditEvent,
  type DebitEvent,
} from './timeline';
import { accumulationBalanceMinor } from '@/features/dashboard/compute';

const ts = '2026-01-01T00:00:00.000Z';
const jar = (p: Partial<Jar>): Jar => ({
  id: 'j',
  name: 'Safe fund',
  type: 'accumulation',
  percentage: 15,
  visibility: 'personal',
  targetAmountMinor: 500000,
  openingBalanceMinor: 100000,
  startedAt: '2026-01-01',
  currency: 'EUR',
  color: '#8b44d7',
  pattern: 'dots',
  icon: 'shield',
  ownerType: 'user',
  order: 0,
  createdAt: ts,
  updatedAt: ts,
  ...p,
});
const debit = (p: Partial<DebitEvent>): DebitEvent => ({ amountMinor: 0, date: '2026-03-15', ...p });

/** `n` monthly allocation posts of `amountMinor` after `start`, as the engine writes them. */
const posts = (start: string, n: number, amountMinor: number): AllocationEvent[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    jarId: 'j',
    amountMinor,
    currency: 'EUR',
    date: addMonths(start, i + 1),
    createdAt: ts,
    updatedAt: ts,
  }));
const credits = (events: AllocationEvent[]): CreditEvent[] =>
  events.map((a) => ({ amountMinor: a.amountMinor, date: a.date }));

describe('buildBalanceTimeline', () => {
  it('plots each posted credit and ends on the ref date', () => {
    const pts = buildBalanceTimeline(jar({}), credits(posts('2026-01-01', 4, 36000)), [], '2026-05-01');
    expect(pts.map((p) => p.kind)).toEqual([
      'start',
      'accrual',
      'accrual',
      'accrual',
      'accrual',
      'now',
    ]);
    expect(pts[0].balanceMinor).toBe(100000);
    expect(pts.at(-1)!.balanceMinor).toBe(100000 + 4 * 36000);
    expect(pts.at(-1)!.date).toBe('2026-05-01');
  });

  it('plots each credit at the amount it posted at', () => {
    const mixed = [
      { amountMinor: 10000, date: '2026-02-01' },
      { amountMinor: 30000, date: '2026-03-01' },
    ];
    const pts = buildBalanceTimeline(jar({ openingBalanceMinor: 0 }), mixed, [], '2026-03-15');
    expect(pts.filter((p) => p.kind === 'accrual').map((p) => p.deltaMinor)).toEqual([
      10000, 30000,
    ]);
    expect(pts.at(-1)!.balanceMinor).toBe(40000);
  });

  it('inserts debit points in date order with a label, after same-day accrual', () => {
    const pts = buildBalanceTimeline(
      jar({}),
      credits(posts('2026-01-01', 4, 36000)),
      [debit({ amountMinor: 50000, date: '2026-03-15', label: 'Car repair' })],
      '2026-05-01',
    );
    const d = debitPoints(pts);
    expect(d).toHaveLength(1);
    expect(d[0].label).toBe('Car repair');
    expect(d[0].deltaMinor).toBe(-50000);
    const dates = pts.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it('accumulation final point matches accumulationBalanceMinor', () => {
    const j = jar({ openingBalanceMinor: 20000 });
    const allocations = posts('2026-01-01', 4, 10000);
    const withdrawals = [{ id: 'w1', jarId: 'j', amountMinor: 15000, currency: 'EUR', date: '2026-03-01', reason: null, createdAt: ts, updatedAt: ts }];
    const pts = buildBalanceTimeline(
      j,
      credits(allocations),
      withdrawals.map((w) => ({ amountMinor: w.amountMinor, date: w.date })),
      '2026-05-01',
    );
    expect(pts.at(-1)!.balanceMinor).toBe(accumulationBalanceMinor(j, allocations, withdrawals));
  });

  it('clamps event dates into [start, ref] without changing the final balance', () => {
    const j = jar({ type: 'flow', openingBalanceMinor: 20000, startedAt: '2026-09-06' });
    const pts = buildBalanceTimeline(
      j,
      [],
      [
        { amountMinor: 45000, date: '2026-09-01', label: 'Rent' }, // before start
        { amountMinor: 17500, date: '2026-09-07', label: 'Groceries' },
      ],
      '2026-09-07',
    );
    // every plotted date sits inside the window
    expect(pts.every((p) => p.date >= '2026-09-06' && p.date <= '2026-09-07')).toBe(true);
    // pre-start debit is pulled onto the start day, delta still applied
    expect(pts.filter((p) => p.date === '2026-09-06').length).toBe(2);
    // opening 200 − 450 − 175 → clamped to 0
    expect(pts.at(-1)!.balanceMinor).toBe(0);
  });

  it('hasTimelineHistory is false for a jar younger than a month, true once a credit posts', () => {
    const fresh = buildBalanceTimeline(
      jar({ type: 'flow', startedAt: '2026-09-06' }),
      [],
      [{ amountMinor: 17500, date: '2026-09-07' }],
      '2026-09-07',
    );
    expect(hasTimelineHistory(fresh)).toBe(false);

    const aged = buildBalanceTimeline(jar({}), credits(posts('2026-01-01', 4, 36000)), [], '2026-05-01');
    expect(hasTimelineHistory(aged)).toBe(true);
  });

  it('clamps displayed balance at 0', () => {
    const pts = buildBalanceTimeline(
      jar({ openingBalanceMinor: 0 }),
      [],
      [debit({ amountMinor: 99999, date: '2026-02-01' })],
      '2026-03-01',
    );
    expect(pts.every((p) => p.balanceMinor >= 0)).toBe(true);
  });
});
