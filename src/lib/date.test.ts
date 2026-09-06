import { describe, expect, it } from 'vitest';
import { isSameMonth, monthKey, wholeMonthsBetween } from './date';

describe('date', () => {
  it('monthKey / isSameMonth', () => {
    expect(monthKey('2026-06-10T12:00:00Z')).toBe('2026-06');
    expect(isSameMonth('2026-06-01', '2026-06-30')).toBe(true);
    expect(isSameMonth('2026-06-30', '2026-07-01')).toBe(false);
  });

  it('wholeMonthsBetween counts completed months, never negative', () => {
    expect(wholeMonthsBetween('2026-01-15', '2026-04-14')).toBe(2);
    expect(wholeMonthsBetween('2026-01-15', '2026-04-15')).toBe(3);
    expect(wholeMonthsBetween('2026-05-01', '2026-01-01')).toBe(0);
  });
});
