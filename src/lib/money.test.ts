import { describe, expect, it } from 'vitest';
import { currencyDecimals, formatMoney, fromMinor, parseAmountInput, toMinor } from './money';
import { monthLabel } from './date';

describe('money', () => {
  it('knows zero-decimal currencies', () => {
    expect(currencyDecimals('JPY')).toBe(0);
    expect(currencyDecimals('EUR')).toBe(2);
  });

  it('round-trips major <-> minor without float drift', () => {
    expect(toMinor(12.34, 'EUR')).toBe(1234);
    expect(fromMinor(1234, 'EUR')).toBe(12.34);
    expect(toMinor(1000, 'JPY')).toBe(1000);
  });

  it('formats in English regardless of the caller (fixed app locale)', () => {
    expect(formatMoney(210000, 'EUR')).toBe('€2,100.00');
    expect(formatMoney(500000, 'EUR')).toBe('€5,000.00');
    expect(monthLabel('2027-04-01')).toBe('April 2027');
  });

  it('parses mixed thousands/decimal separators', () => {
    expect(parseAmountInput('1,234.50')).toBe(1234.5);
    expect(parseAmountInput('1.234,50')).toBe(1234.5);
    expect(parseAmountInput('12,5')).toBe(12.5);
    expect(parseAmountInput('  42 ')).toBe(42);
    expect(parseAmountInput('nope')).toBeNull();
    expect(parseAmountInput('')).toBeNull();
  });
});
