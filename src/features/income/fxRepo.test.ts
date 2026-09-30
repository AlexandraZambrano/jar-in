import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRxDatabase, type RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import type { JarInDatabase } from '@/db/database';
import { fxRateSchema, incomeSourceSchema, jarSchema, type IncomeSource, type Jar } from '@/db/schemas';
import { syncFxRates } from './fxRepo';

const ts = '2026-01-01T00:00:00.000Z';
const NOW = Date.parse('2026-09-30T12:00:00Z');
let open: RxDatabase | null = null;

async function makeDb(): Promise<JarInDatabase> {
  const db = await createRxDatabase({
    name: `t${Math.random().toString(36).slice(2)}`,
    storage: getRxStorageMemory(),
    multiInstance: false,
  });
  await db.addCollections({
    jars: { schema: jarSchema },
    incomeSources: { schema: incomeSourceSchema },
    fxRates: { schema: fxRateSchema },
  });
  open = db;
  return db as unknown as JarInDatabase;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await open?.remove();
  open = null;
});

const jar = { id: 'j', name: 'Jar', type: 'flow', percentage: 50, visibility: 'personal', targetAmountMinor: null, openingBalanceMinor: 0, startedAt: '2026-01-01', currency: 'EUR', color: '#e8384f', pattern: 'solid', icon: 'house', ownerType: 'user', order: 0, createdAt: ts, updatedAt: ts } satisfies Jar;
const income = (currency: string): IncomeSource => ({ id: currency, name: 'x', amountMinor: 100_000, currency, frequency: 'monthly', destinationWalletId: 'w', active: true, createdAt: ts, updatedAt: ts });

function stubFetch(impl: () => Promise<Response>) {
  const fetch = vi.fn(impl);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
const ok = () => Promise.resolve(new Response(JSON.stringify({ base: 'EUR', rates: { USD: 1.25, JPY: 160 } })));

describe('syncFxRates', () => {
  it('makes no request when all income is in the home currency', async () => {
    const db = await makeDb();
    await db.jars.insert(jar);
    await db.incomeSources.insert(income('EUR'));
    const fetch = stubFetch(ok);

    expect(await syncFxRates(db, NOW)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches home-based rates for foreign income and caches them', async () => {
    const db = await makeDb();
    await db.jars.insert(jar);
    await db.incomeSources.insert(income('USD'));
    const fetch = stubFetch(ok);

    expect(await syncFxRates(db, NOW)).toBe(true);
    expect(fetch).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=EUR');
    const usd = await db.fxRates.findOne('EUR_USD').exec();
    expect(usd?.rate).toBe(1.25);
  });

  it('skips the request while the cache is under a day old', async () => {
    const db = await makeDb();
    await db.jars.insert(jar);
    await db.incomeSources.insert(income('USD'));
    stubFetch(ok);
    await syncFxRates(db, NOW);

    const fetch = stubFetch(ok);
    expect(await syncFxRates(db, NOW + 60 * 60 * 1000)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps cached rates and never throws when offline', async () => {
    const db = await makeDb();
    await db.jars.insert(jar);
    await db.incomeSources.insert(income('USD'));
    stubFetch(ok);
    await syncFxRates(db, NOW);

    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    expect(await syncFxRates(db, NOW + 2 * 24 * 60 * 60 * 1000)).toBe(false);
    expect((await db.fxRates.findOne('EUR_USD').exec())?.rate).toBe(1.25);
  });
});
