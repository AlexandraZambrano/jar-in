import { describe, expect, it } from 'vitest';
import type { SubCategory, Transaction } from '@/db/schemas';
import { filterByJar, groupByDay, isUnassigned, subCategoryBreakdown } from './compute';

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

describe('subCategoryBreakdown', () => {
  const sub = (id: string, name: string, jarId = 'j1'): SubCategory => ({
    id,
    jarId,
    name,
    order: 0,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  });
  const subs = [sub('rent', 'Rent'), sub('food', 'Groceries'), sub('other-jar', 'Fun', 'j2')];
  const REF = '2026-06-20';

  it('splits this month by sub-category, largest first, with last month alongside', () => {
    const rows = subCategoryBreakdown(
      'j1',
      subs,
      [
        t({ id: '1', subCategoryId: 'rent', amountMinor: 45000, date: '2026-06-01' }),
        t({ id: '2', subCategoryId: 'food', amountMinor: 12000, date: '2026-06-05' }),
        t({ id: '3', subCategoryId: 'food', amountMinor: 3000, date: '2026-06-18' }),
        t({ id: '4', subCategoryId: 'food', amountMinor: 9000, date: '2026-05-12' }), // last month
        t({ id: '5', subCategoryId: 'rent', amountMinor: 45000, date: '2026-05-01' }), // last month
        t({ id: '6', subCategoryId: 'food', amountMinor: 99999, date: '2026-04-30' }), // too old
        t({ id: '7', jarId: 'j2', subCategoryId: 'other-jar', amountMinor: 99999 }), // other jar
      ],
      REF,
    );
    expect(rows.map((r) => [r.name, r.minor, r.prevMinor])).toEqual([
      ['Rent', 45000, 45000],
      ['Groceries', 15000, 9000],
    ]);
    expect(rows[0].share).toBeCloseTo(0.75);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1);
  });

  it("rolls untagged spend — and a sub-category that isn't this jar's — into Uncategorised", () => {
    const rows = subCategoryBreakdown(
      'j1',
      subs,
      [
        t({ id: '1', subCategoryId: null, amountMinor: 2000, date: '2026-06-02' }),
        t({ id: '2', subCategoryId: 'other-jar', amountMinor: 1000, date: '2026-06-03' }),
      ],
      REF,
    );
    expect(rows).toEqual([
      { subCategoryId: null, name: 'Uncategorised', minor: 3000, share: 1, prevMinor: 0 },
    ]);
  });

  it('keeps a row that only had spend last month, at 0 share', () => {
    const rows = subCategoryBreakdown(
      'j1',
      subs,
      [t({ id: '1', subCategoryId: 'food', amountMinor: 5000, date: '2026-05-20' })],
      REF,
    );
    expect(rows).toEqual([
      { subCategoryId: 'food', name: 'Groceries', minor: 0, share: 0, prevMinor: 5000 },
    ]);
  });

  it('is empty with no spend in either month', () => {
    expect(subCategoryBreakdown('j1', subs, [], REF)).toEqual([]);
  });
});
