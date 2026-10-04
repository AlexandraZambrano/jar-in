import { afterEach, describe, expect, it } from 'vitest';
import { createRxDatabase, type RxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import type { JarInDatabase } from '@/db/database';
import {
  allocationEventSchema,
  fxRateSchema,
  incomeSourceSchema,
  jarSchema,
  type IncomeSource,
  type Jar,
} from '@/db/schemas';
import { syncAllocationEvents } from './allocationsRepo';

const ts = '2026-01-01T00:00:00.000Z';
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
    allocationEvents: { schema: allocationEventSchema },
    fxRates: { schema: fxRateSchema },
  });
  open = db;
  return db as unknown as JarInDatabase;
}

afterEach(async () => {
  await open?.remove();
  open = null;
});

const jar = (p: Partial<Jar> = {}): Jar => ({
  id: 'j',
  name: 'Safe fund',
  type: 'accumulation',
  percentage: 25,
  visibility: 'personal',
  targetAmountMinor: 1_000_000,
  openingBalanceMinor: 0,
  startedAt: '2026-01-01',
  currency: 'EUR',
  color: '#8b44d7',
  pattern: 'dots',
  icon: 'shield',
  ownerType: 'user',
  order: 0,
  createdAt: ts,
  updatedAt: ts,
  ...p,
});

const salary = (amountMinor: number): IncomeSource => ({
  id: 'i',
  name: 'Salary',
  amountMinor,
  currency: 'EUR',
  frequency: 'monthly',
  destinationWalletId: 'w',
  active: true,
  createdAt: ts,
  updatedAt: ts,
});

const amounts = async (db: JarInDatabase) =>
  (await db.allocationEvents.find().exec())
    .map((d) => d.toJSON())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((a) => [a.date, a.amountMinor]);

describe('syncAllocationEvents', () => {
  it('posts one event per whole month elapsed, at the planned amount', async () => {
    const db = await makeDb();
    await db.jars.insert(jar());
    await db.incomeSources.insert(salary(200_000)); // 25% → 50_000/mo

    await syncAllocationEvents(db, '2026-04-15');

    expect(await amounts(db)).toEqual([
      ['2026-02-01', 50_000],
      ['2026-03-01', 50_000],
      ['2026-04-01', 50_000],
    ]);
  });

  it('is idempotent — a second run on the same day posts nothing', async () => {
    const db = await makeDb();
    await db.jars.insert(jar());
    await db.incomeSources.insert(salary(200_000));

    await syncAllocationEvents(db, '2026-04-15');
    await syncAllocationEvents(db, '2026-04-15');

    expect(await db.allocationEvents.count().exec()).toBe(3);
  });

  it('two concurrent runs post each month once (StrictMode / two tabs)', async () => {
    const db = await makeDb();
    await db.jars.insert(jar());
    await db.incomeSources.insert(salary(200_000));

    await Promise.all([
      syncAllocationEvents(db, '2026-04-15'),
      syncAllocationEvents(db, '2026-04-15'),
    ]);

    expect(await db.allocationEvents.count().exec()).toBe(3);
  });

  it('only catches up the new months, valued at the planned amount *then*', async () => {
    const db = await makeDb();
    await db.jars.insert(jar());
    await db.incomeSources.insert(salary(200_000)); // 50_000/mo

    await syncAllocationEvents(db, '2026-03-15'); // posts Feb + Mar at 50k

    // Percentage bumped 25% → 50%: already-posted months must not reprice.
    const doc = await db.jars.findOne('j').exec();
    await doc!.patch({ percentage: 50 });
    await syncAllocationEvents(db, '2026-05-15'); // posts Apr + May at 100k

    expect(await amounts(db)).toEqual([
      ['2026-02-01', 50_000],
      ['2026-03-01', 50_000],
      ['2026-04-01', 100_000],
      ['2026-05-01', 100_000],
    ]);
  });

  it('defers while a foreign income has no rate, then posts the converted total', async () => {
    const db = await makeDb();
    await db.jars.insert(jar()); // EUR home, 25%
    await db.incomeSources.insert(salary(200_000)); // €2,000
    await db.incomeSources.insert({ ...salary(100_000), id: 'usd', currency: 'USD' }); // $1,000

    await syncAllocationEvents(db, '2026-02-15');
    expect(await db.allocationEvents.count().exec()).toBe(0); // no USD rate yet

    await db.fxRates.insert({
      id: 'EUR_USD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      rate: 1.25,
      fetchedAt: ts,
    });
    await syncAllocationEvents(db, '2026-02-15');
    // (€2,000 + $1,000→€800) × 25% = €700
    expect(await amounts(db)).toEqual([['2026-02-01', 70_000]]);
  });

  it('posts nothing for a jar younger than a month, or with no income', async () => {
    const db = await makeDb();
    await db.jars.insert(jar({ id: 'fresh', startedAt: '2026-04-10' }));
    await db.jars.insert(jar({ id: 'aged' }));

    await syncAllocationEvents(db, '2026-04-15'); // no income source yet
    expect(await db.allocationEvents.count().exec()).toBe(0);

    await db.incomeSources.insert(salary(200_000));
    await syncAllocationEvents(db, '2026-04-15');
    const jarIds = (await db.allocationEvents.find().exec()).map((d) => d.jarId);
    expect(jarIds.every((id) => id === 'aged')).toBe(true);
  });
});
