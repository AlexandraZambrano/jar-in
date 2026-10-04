import type { JarInDatabase } from '@/db/database';
import type { FxRate } from '@/db/schemas';
import { DEFAULT_CURRENCY } from '@/db/constants';

const FRESH_MS = 24 * 60 * 60 * 1000;
const API = 'https://api.frankfurter.dev/v1/latest';

/** The currency all jar math runs in — every jar shares it (new jars copy
 *  the first one's; there's no per-jar picker). */
export async function homeCurrency(db: JarInDatabase): Promise<string> {
  return (await db.jars.findOne().exec())?.currency ?? DEFAULT_CURRENCY;
}

/** `fxRates` rows for `home` as the `rates` map `convertMinor` expects. */
export function ratesFor(rows: Pick<FxRate, 'baseCurrency' | 'quoteCurrency' | 'rate'>[], home: string) {
  const rates: Record<string, number> = {};
  for (const r of rows) if (r.baseCurrency === home) rates[r.quoteCurrency] = r.rate;
  return rates;
}

/** Refresh the cached ECB rates (via Frankfurter) for the home currency.
 *  Makes no request when no active income is foreign or the cache is under
 *  a day old; a network/HTTP failure keeps the cached rates. Resolves `true`
 *  only when fresh rates were written. Never throws. */
export async function syncFxRates(db: JarInDatabase, now: number = Date.now()): Promise<boolean> {
  try {
    const home = await homeCurrency(db);
    const income = await db.incomeSources.find().exec();
    if (!income.some((s) => s.active && s.currency !== home)) return false;

    const cached = await db.fxRates.find({ selector: { baseCurrency: home } }).exec();
    if (cached.some((r) => now - Date.parse(r.fetchedAt) < FRESH_MS)) return false;

    const res = await fetch(`${API}?base=${encodeURIComponent(home)}`);
    if (!res.ok) return false;
    const { rates } = (await res.json()) as { rates: Record<string, number> };
    const fetchedAt = new Date(now).toISOString();
    await db.fxRates.bulkUpsert(
      Object.entries(rates).map(([quote, rate]) => ({
        id: `${home}_${quote}`,
        baseCurrency: home,
        quoteCurrency: quote,
        rate,
        fetchedAt,
      })),
    );
    return true;
  } catch {
    return false; // offline / bad JSON — the cached rates stand
  }
}
