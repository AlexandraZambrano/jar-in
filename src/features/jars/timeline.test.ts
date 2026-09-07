import { describe, expect, it } from 'vitest';
import type { Jar, WithdrawalEvent } from '@/db/schemas';
import { buildBalanceTimeline, withdrawalPoints } from './timeline';
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
const wd = (p: Partial<WithdrawalEvent>): WithdrawalEvent => ({
  id: 'w',
  jarId: 'j',
  amountMinor: 0,
  currency: 'EUR',
  date: '2026-03-15',
  reason: null,
  createdAt: ts,
  updatedAt: ts,
  ...p,
});

describe('buildBalanceTimeline', () => {
  it('accrues monthly contributions and ends on the ref date', () => {
    const pts = buildBalanceTimeline(jar({}), 36000, [], '2026-05-01');
    // start + 4 monthly accruals + now
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

  it('inserts withdrawal points in date order with a label, after same-day accrual', () => {
    const pts = buildBalanceTimeline(
      jar({}),
      36000,
      [wd({ id: 'w1', amountMinor: 50000, date: '2026-03-15', reason: 'Car repair' })],
      '2026-05-01',
    );
    const w = withdrawalPoints(pts);
    expect(w).toHaveLength(1);
    expect(w[0].label).toBe('Car repair');
    expect(w[0].deltaMinor).toBe(-50000);
    // dates are non-decreasing
    const dates = pts.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("final point matches the dashboard's accumulationBalanceMinor", () => {
    const j = jar({ openingBalanceMinor: 20000 });
    const withdrawals = [wd({ id: 'w1', amountMinor: 15000, date: '2026-03-01' })];
    const pts = buildBalanceTimeline(j, 10000, withdrawals, '2026-05-01');
    expect(pts.at(-1)!.balanceMinor).toBe(
      accumulationBalanceMinor(j, 10000, withdrawals, '2026-05-01'),
    );
  });

  it('clamps displayed balance at 0', () => {
    const pts = buildBalanceTimeline(
      jar({ openingBalanceMinor: 0 }),
      0,
      [wd({ id: 'w1', amountMinor: 99999, date: '2026-02-01' })],
      '2026-03-01',
    );
    expect(pts.every((p) => p.balanceMinor >= 0)).toBe(true);
  });
});
