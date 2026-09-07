/** The app's UI is English-only. All money and date formatting uses this fixed
 *  locale so numbers ("€2,100.00") and month names ("April 2027") stay English
 *  regardless of the device's language. */
export const APP_LOCALE = 'en-GB';

/** The real device locale — use ONLY to guess a sensible default currency for a
 *  new wallet/income source (currency ≠ language). Never for display formatting. */
export function deviceLocale(): string {
  return typeof navigator !== 'undefined' ? navigator.language : 'en';
}
