import {
  createRxDatabase,
  addRxPlugin,
  type RxDatabase,
  type RxCollection,
  type RxStorage,
} from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
  walletSchema,
  jarSchema,
  contributionRuleSchema,
  subCategorySchema,
  incomeSourceSchema,
  transactionSchema,
  withdrawalEventSchema,
  fxRateSchema,
  type Wallet,
  type Jar,
  type ContributionRule,
  type SubCategory,
  type IncomeSource,
  type Transaction,
  type WithdrawalEvent,
  type FxRate,
} from './schemas';

export interface Collections {
  wallets: RxCollection<Wallet>;
  jars: RxCollection<Jar>;
  contributionRules: RxCollection<ContributionRule>;
  subCategories: RxCollection<SubCategory>;
  incomeSources: RxCollection<IncomeSource>;
  transactions: RxCollection<Transaction>;
  withdrawalEvents: RxCollection<WithdrawalEvent>;
  fxRates: RxCollection<FxRate>;
}

export type JarInDatabase = RxDatabase<Collections>;

let dbPromise: Promise<JarInDatabase> | null = null;

async function create(): Promise<JarInDatabase> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: RxStorage<any, any> = getRxStorageDexie();

  if (import.meta.env.DEV) {
    const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
    addRxPlugin(RxDBDevModePlugin);
    // Dev-mode requires a top-level schema validator.
    const { wrappedValidateAjvStorage } = await import('rxdb/plugins/validate-ajv');
    storage = wrappedValidateAjvStorage({ storage });
  }

  const db = await createRxDatabase<Collections>({
    name: 'jarin',
    storage,
    multiInstance: true,
    eventReduce: true,
    ignoreDuplicate: import.meta.env.DEV,
  });

  await db.addCollections({
    wallets: { schema: walletSchema },
    jars: { schema: jarSchema },
    contributionRules: { schema: contributionRuleSchema },
    subCategories: { schema: subCategorySchema },
    incomeSources: { schema: incomeSourceSchema },
    transactions: { schema: transactionSchema },
    withdrawalEvents: { schema: withdrawalEventSchema },
    fxRates: { schema: fxRateSchema },
  });

  // Seed exactly once, as part of the memoised singleton init — this is immune
  // to React StrictMode's double-invoked effects.
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty(db);

  return db;
}

/** Singleton — the on-device source of truth. */
export function getDatabase(): Promise<JarInDatabase> {
  if (!dbPromise) dbPromise = create();
  return dbPromise;
}
