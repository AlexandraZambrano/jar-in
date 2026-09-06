import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/db/schemas';
import { filterByJar, groupByDay, isUnassigned } from './compute';

const base: Transaction = {
  id: 't',
  jarId: 'j1',
  subCategoryId: null,
  amountMinor: 1000,
  currency: 'EUR',
  date: '2026-06-10',
  note: '',
  sourceType: 'manual',
  externalAccountId: null,
  externalTransactionId: null,
  createdAt: '2026-06-10T10:00:00Z',
  updatedAt: '2026-06-10T10:00:00Z',
};
const t = (p: Partial<Transaction>): Transaction => ({ ...base, ...p });

describe('isUnassigned', () => {
  it('is true when the jar is not among the live ones', () => {
    const live = new Set(['j1', 'j2']);
    expect(isUnassigned(t({ jarId: 'j2' }), live)).toBe(false);
    expect(isUnassigned(t({ jarId: 'gone' }), live)).toBe(true);
  });
});

describe('filterByJar', () => {
  it('passes everything through when jarId is null', () => {
    const list = [t({ id: 'a', jarId: 'j1' }), t({ id: 'b', jarId: 'j2' })];
    expect(filterByJar(list, null)).toHaveLength(2);
    expect(filterByJar(list, 'j2').map((x) => x.id)).toEqual(['b']);
  });
});

describe('groupByDay', () => {
  it('groups, sorts days newest-first, sums per day, and orders items within a day', () => {
    const list = [
      t({ id: 'a', date: '2026-06-10', amountMinor: 500, createdAt: '2026-06-10T09:00:00Z' }),
      t({ id: 'b', date: '2026-06-10', amountMinor: 300, createdAt: '2026-06-10T18:00:00Z' }),
      t({ id: 'c', date: '2026-06-12', amountMinor: 900, createdAt: '2026-06-12T08:00:00Z' }),
    ];
    const groups = groupByDay(list, 'en-GB', '2026-06-15');
    expect(groups.map((g) => g.date)).toEqual(['2026-06-12', '2026-06-10']);
    expect(groups[1].totalMinor).toBe(800);
    expect(groups[1].items.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('labels today and yesterday', () => {
    const groups = groupByDay(
      [t({ id: 'x', date: '2026-06-15' }), t({ id: 'y', date: '2026-06-14' })],
      'en-GB',
      '2026-06-15',
    );
    expect(groups[0].label).toBe('Today');
    expect(groups[1].label).toBe('Yesterday');
  });
});
