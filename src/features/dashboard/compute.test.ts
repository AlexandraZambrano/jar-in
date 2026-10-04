import { describe, expect, it } from 'vitest';
import type {
  AllocationEvent,
  IncomeSource,
  Jar,
  Transaction,
  WithdrawalEvent,
} from '@/db/schemas';
import { addMonths } from '@/lib/date';
import {
  accumulationBalanceMinor,
  coachMessage,
  fxNote,
  computeJar,
  flowRunningBalanceMinor,
  flowSpentThisMonthMinor,
  jarPlannedMinor,
  monthlyIncome,
  planHealth,
} from './compute';

const ts = '2026-01-01T00:00:00.000Z';

function income(partial: Partial<IncomeSource>): IncomeSource {
  return {
    id: 'i',
    name: 'x',
    amountMinor: 0,
    currency: 'EUR',
    frequency: 'monthly',
    destinationWalletId: 'w',
    active: true,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

function jar(partial: Partial<Jar>): Jar {
  return {
    id: 'j',
    name: 'Jar',
    type: 'flow',
    percentage: 50,
    visibility: 'personal',
    targetAmountMinor: null,
    openingBalanceMinor: 0,
    startedAt: '2026-01-01',
    currency: 'EUR',
    color: '#e8384f',
    pattern: 'solid',
    icon: 'house',
    ownerType: 'user',
    order: 0,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

/** `n` monthly allocation posts of `amountMinor` after `start`, as the engine writes them. */
function monthly(start: string, n: number, amountMinor: number, jarId = 'j'): AllocationEvent[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    jarId,
    amountMinor,
    currency: 'EUR',
    date: addMonths(start, i + 1),
    createdAt: ts,
    updatedAt: ts,
  }));
}

function txn(partial: Partial<Transaction>): Transaction {
  return {
    id: 't',
    jarId: 'j',
    subCategoryId: null,
    amountMinor: 0,
    currency: 'EUR',
    date: '2026-06-10',
    note: '',
    sourceType: 'manual',
    externalAccountId: null,
    externalTransactionId: null,
    createdAt: ts,
    updatedAt: ts,
    ...partial,
  };
}

describe('monthlyIncome', () => {
  it('normalises frequencies to a monthly figure', () => {
    const r = monthlyIncome(
      [
        income({ id: 'a', amountMinor: 240000, frequency: 'monthly' }),
        income({ id: 'b', amountMinor: 120000, frequency: 'yearly' }),
        income({ id: 'c', amountMinor: 10000, frequency: 'weekly' }),
      ],
      'EUR',
      {},
    );
    // 240000 + 10000 + round(10000 * 52/12)
    expect(r.minor).toBe(240000 + 10000 + Math.round(10000 * (52 / 12)));
  });

  it('excludes inactive and one-off sources but flags the one-off', () => {
    const r = monthlyIncome(
      [
        income({ id: 'a', amountMinor: 100000, active: false }),
        income({ id: 'b', amountMinor: 50000, frequency: 'once' }),
      ],
      'EUR',
      {},
    );
    expect(r.minor).toBe(0);
    expect(r.hasOnce).toBe(true);
  });

  it('converts foreign income into the home currency instead of summing raw', () => {
    const r = monthlyIncome(
      [
        income({ id: 'a', amountMinor: 100000, currency: 'EUR' }),
        income({ id: 'b', amountMinor: 100000, currency: 'USD' }),
      ],
      'EUR',
      { USD: 1.25 },
    );
    expect(r.minor).toBe(100000 + 80000); // €1,000 + $1,000 at 1.25 → €1,800
    expect(r.converted).toEqual(['USD']);
    expect(r.unconverted).toEqual([]);
  });

  it('leaves out (and lists) a currency with no rate', () => {
    const r = monthlyIncome(
      [
        income({ id: 'a', amountMinor: 100000, currency: 'EUR' }),
        income({ id: 'b', amountMinor: 100000, currency: 'COP' }),
      ],
      'EUR',
      {},
    );
    expect(r.minor).toBe(100000);
    expect(r.unconverted).toEqual(['COP']);
    expect(fxNote(r)).toMatch(/No exchange rate yet for COP/);
  });
});

describe('jarPlannedMinor', () => {
  it('is income times percentage', () => {
    expect(jarPlannedMinor(jar({ percentage: 25 }), 240000)).toBe(60000);
  });
});

describe('flowSpentThisMonthMinor', () => {
  it('sums only this-month transactions for the jar', () => {
    const spent = flowSpentThisMonthMinor(
      'j',
      [
        txn({ id: '1', amountMinor: 5000, date: '2026-06-02' }),
        txn({ id: '2', amountMinor: 3000, date: '2026-06-28' }),
        txn({ id: '3', amountMinor: 9999, date: '2026-05-30' }),
        txn({ id: '4', amountMinor: 1000, jarId: 'other', date: '2026-06-10' }),
      ],
      '2026-06-15T12:00:00Z',
    );
    expect(spent).toBe(8000);
  });
});

describe('flowRunningBalanceMinor', () => {
  it('opening + posted allocations - all transactions, clamped at 0', () => {
    const j = jar({ type: 'flow', startedAt: '2026-01-01', openingBalanceMinor: 10000 });
    const spent = flowRunningBalanceMinor(
      j,
      [...monthly('2026-01-01', 4, 40000), ...monthly('2026-01-01', 4, 99999, 'other')],
      [
        txn({ id: '1', jarId: 'j', amountMinor: 25000, date: '2026-02-10' }),
        txn({ id: '2', jarId: 'j', amountMinor: 15000, date: '2026-03-10' }),
        txn({ id: '3', jarId: 'other', amountMinor: 99999, date: '2026-03-10' }),
      ],
    );
    // opening 10000 + 4 posts * 40000 - (25000 + 15000)
    expect(spent).toBe(10000 + 4 * 40000 - 40000);
  });
  it('clamps negative to 0', () => {
    const j = jar({ type: 'flow', startedAt: '2026-01-01', openingBalanceMinor: 0 });
    expect(
      flowRunningBalanceMinor(j, [], [txn({ jarId: 'j', amountMinor: 5000, date: '2026-02-01' })]),
    ).toBe(0);
  });
});

describe('accumulationBalanceMinor', () => {
  it('uses each post at the amount it posted at, not today’s planned figure', () => {
    // 2 months at 10000, then the percentage changed → 2 months at 30000.
    const j = jar({ type: 'accumulation', startedAt: '2026-01-01' });
    const posts = [
      ...monthly('2026-01-01', 2, 10000),
      ...monthly('2026-03-01', 2, 30000).map((a, i) => ({ ...a, id: `b${i}` })),
    ];
    expect(accumulationBalanceMinor(j, posts, [])).toBe(2 * 10000 + 2 * 30000);
  });

  it('opening + posted allocations - withdrawals, clamped at 0', () => {
    const j = jar({ type: 'accumulation', startedAt: '2026-01-01', openingBalanceMinor: 20000 });
    const withdrawals: WithdrawalEvent[] = [
      {
        id: 'w1',
        jarId: 'j',
        amountMinor: 15000,
        currency: 'EUR',
        date: '2026-03-01',
        reason: null,
        createdAt: ts,
        updatedAt: ts,
      },
    ];
    const bal = accumulationBalanceMinor(j, monthly('2026-01-01', 4, 10000), withdrawals);
    expect(bal).toBe(20000 + 4 * 10000 - 15000);
  });
});

describe('computeJar', () => {
  it('marks a flow jar over cap', () => {
    const j = jar({ type: 'flow', percentage: 50 });
    const r = computeJar(
      j,
      40000,
      [txn({ amountMinor: 25000, date: '2026-06-10' })],
      [],
      [],
      '2026-06-15',
    );
    expect(r.plannedMinor).toBe(20000);
    expect(r.over).toBe(true);
  });

  it('marks an accumulation jar goal met', () => {
    const j = jar({
      type: 'accumulation',
      percentage: 100,
      targetAmountMinor: 30000,
      startedAt: '2026-01-01',
    });
    const r = computeJar(j, 10000, [], [], monthly('2026-01-01', 4, 10000));
    expect(r.goalMet).toBe(true);
  });
});

describe('planHealth + coachMessage', () => {
  it('is balanced at exactly 100', () => {
    const h = planHealth([jar({ percentage: 60 }), jar({ percentage: 40 })]);
    expect(h.balanced).toBe(true);
    expect(coachMessage(h)).toMatch(/balanced/i);
  });

  it('flags over-allocation', () => {
    const h = planHealth([jar({ percentage: 70 }), jar({ percentage: 45 })]);
    expect(h.delta).toBe(15);
    expect(coachMessage(h)).toMatch(/over/i);
  });

  it('flags unallocated income', () => {
    const h = planHealth([jar({ percentage: 50 }), jar({ percentage: 30 })]);
    expect(coachMessage(h)).toMatch(/unallocated/i);
  });
});
