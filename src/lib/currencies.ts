/** A curated set of common ISO-4217 codes for the pickers. Not exhaustive —
 *  an existing document may hold a code outside this list and the picker keeps it. */
export const COMMON_CURRENCIES = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'CAD',
  'AUD',
  'NZD',
  'JPY',
  'CNY',
  'HKD',
  'SGD',
  'INR',
  'BRL',
  'MXN',
  'ZAR',
  'TRY',
  'AED',
  'ILS',
] as const;

export type CurrencyCode = string;

const REGION_TO_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  SG: 'SGD',
  IN: 'INR',
  BR: 'BRL',
  MX: 'MXN',
  ZA: 'ZAR',
  TR: 'TRY',
  IL: 'ILS',
};

/** Best-effort currency guess from the browser locale; defaults to EUR. */
export function defaultCurrencyForLocale(locale?: string): string {
  const loc = locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en');
  try {
    const region = new Intl.Locale(loc).maximize().region;
    if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
  } catch {
    /* ignore */
  }
  return 'EUR';
}

export function currencyLabel(code: string, locale = 'en-GB'): string {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}
