import { describe, expect, it } from 'vitest';
import { currencyDecimals, fromMinor, parseAmountInput, toMinor } from './money';

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

  it('parses mixed thousands/decimal separators', () => {
    expect(parseAmountInput('1,234.50')).toBe(1234.5);
    expect(parseAmountInput('1.234,50')).toBe(1234.5);
    expect(parseAmountInput('12,5')).toBe(12.5);
    expect(parseAmountInput('  42 ')).toBe(42);
    expect(parseAmountInput('nope')).toBeNull();
    expect(parseAmountInput('')).toBeNull();
  });
});
