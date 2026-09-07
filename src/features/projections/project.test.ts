import { describe, expect, it } from 'vitest';
import type { Jar, WithdrawalEvent } from '@/db/schemas';
import { monthlyBalanceSeries, projectGoalDate } from './project';

const ts = '2026-01-01T00:00:00.000Z';
const jar = (p: Partial<Jar>): Jar => ({
  id: 'j',
  name: 'Safe fund',
  type: 'accumulation',
  percentage: 15,
  visibility: 'personal',
  targetAmountMinor: 1_000_000,
  openingBalanceMinor: 0,
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

describe('monthlyBalanceSeries', () => {
  it('has one point per whole month and ends at the current balance', () => {
    const s = monthlyBalanceSeries(jar({ openingBalanceMinor: 100_000 }), 50_000, [], '2026-05-01');
    expect(s).toEqual([100_000, 150_000, 200_000, 250_000, 300_000]);
  });
  it('applies withdrawals from the month they occur', () => {
    const s = monthlyBalanceSeries(
      jar({ openingBalanceMinor: 0 }),
      50_000,
      [wd({ id: 'w1', amountMinor: 40_000, date: '2026-03-10' })],
      '2026-05-01',
    );
    // months 0..4: 0, 50k, 100k, 150k-40k=110k, 160k
    expect(s).toEqual([0, 50_000, 100_000, 110_000, 160_000]);
  });
});

describe('projectGoalDate', () => {
  it('returns null with no target or when already met', () => {
    expect(projectGoalDate(jar({ targetAmountMinor: null }), [0], 1000)).toBeNull();
    expect(
      projectGoalDate(jar({ targetAmountMinor: 100 }), [0, 100, 200], 1000),
    ).toBeNull();
  });

  it('returns null when the jar is not growing', () => {
    const flat = [200_000, 200_000, 200_000, 200_000];
    expect(projectGoalDate(jar({}), flat, 0)).toBeNull();
  });

  it('projects a steady saver: ~15 months from 250k at 50k/mo toward 1M', () => {
    const series = [0, 50_000, 100_000, 150_000, 200_000, 250_000];
    const p = projectGoalDate(jar({}), series, 50_000, { ref: '2026-06-01' })!;
    expect(p).not.toBeNull();
    expect(Math.round(p.monthsRemaining)).toBe(15);
    expect(p.confidence).toBe('high');
    expect(p.date).toBe('2027-09-01'); // 2026-06-01 + 15 months
  });

  it('a faster saver finishes sooner than a slower one', () => {
    const slow = projectGoalDate(jar({}), [0, 20_000, 40_000, 60_000, 80_000], 20_000)!;
    const fast = projectGoalDate(jar({}), [0, 80_000, 160_000, 240_000, 320_000], 80_000)!;
    expect(fast.monthsRemaining).toBeLessThan(slow.monthsRemaining);
  });

  it('a mid-history withdrawal lowers confidence vs. a clean run', () => {
    const clean = projectGoalDate(jar({}), [0, 50_000, 100_000, 150_000, 200_000], 50_000)!;
    const bumpy = projectGoalDate(jar({}), [0, 50_000, 20_000, 70_000, 120_000], 50_000)!;
    expect(clean.confidence).toBe('high');
    expect(['low', 'medium']).toContain(bumpy.confidence);
  });

  it('falls back to the planned contribution with too little history', () => {
    const p = projectGoalDate(jar({ openingBalanceMinor: 100_000 }), [100_000], 60_000, {
      ref: '2026-01-01',
    })!;
    expect(p.method).toBe('ema');
    expect(p.ratePerMonthMinor).toBe(60_000);
    expect(Math.round(p.monthsRemaining)).toBe(15); // (1M - 100k) / 60k
  });

  it('honours an explicit method choice', () => {
    const series = [0, 50_000, 100_000, 150_000, 200_000, 250_000];
    const ema = projectGoalDate(jar({}), series, 50_000, { method: 'ema' })!;
    const reg = projectGoalDate(jar({}), series, 50_000, { method: 'regression' })!;
    expect(ema.method).toBe('ema');
    expect(reg.method).toBe('regression');
    // both land in the same ballpark for a linear series
    expect(Math.abs(ema.monthsRemaining - reg.monthsRemaining)).toBeLessThan(1);
  });
});
