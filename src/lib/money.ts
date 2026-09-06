/** Money helpers. Storage is always integer minor units + an ISO-4217 code.
 *  See docs/decisions/0004-money-and-currency.md. */

const ZERO_DECIMAL = new Set([
  'JPY',
  'KRW',
  'VND',
  'CLP',
  'ISK',
  'XOF',
  'XAF',
  'PYG',
  'RWF',
  'UGX',
]);

export function currencyDecimals(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/** Major units (e.g. 12.34) -> minor units (1234). */
export function toMinor(amount: number, currency: string): number {
  const f = 10 ** currencyDecimals(currency);
  return Math.round(amount * f);
}

/** Minor units (1234) -> major units (12.34). */
export function fromMinor(minor: number, currency: string): number {
  return minor / 10 ** currencyDecimals(currency);
}

export function addMinor(...values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Locale-aware currency string. */
export function formatMoney(
  minor: number,
  currency: string,
  locale?: string,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currencyDecimals(currency),
    }).format(fromMinor(minor, currency));
  } catch {
    // Unknown currency code — fall back to a plain number + code.
    return `${fromMinor(minor, currency).toFixed(currencyDecimals(currency))} ${currency}`;
  }
}

/** Parse a free-typed amount ("1.234,50", "1,234.50", "12") into a number, or null. */
export function parseAmountInput(raw: string): number | null {
  const s = raw.trim().replace(/\s/g, '');
  if (!s) return null;
  let normalised = s;
  if (s.includes(',') && s.includes('.')) {
    // last separator is the decimal one
    normalised = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    normalised = s.replace(',', '.');
  }
  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}
