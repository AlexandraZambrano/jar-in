import type { JarInDatabase } from './database';
import { newId } from '@/lib/id';
import { addMonths, nowISO, todayISO } from '@/lib/date';
import { toMinor } from '@/lib/money';
import { DEFAULT_JAR_TEMPLATE } from '@/features/jars/jarTemplate';
import { DEFAULT_CURRENCY } from './constants';

/** First-run data so the app has something to show. Runs only when there are
 *  no jars yet — a second load never re-seeds. */
export async function seedIfEmpty(db: JarInDatabase): Promise<void> {
  const jarCount = await db.jars.count().exec();
  if (jarCount > 0) return;

  const ts = nowISO();

  const wallet = {
    id: newId(),
    name: 'Main account',
    currency: DEFAULT_CURRENCY,
    ownerType: 'user' as const,
    createdAt: ts,
    updatedAt: ts,
  };
  await db.wallets.insert(wallet);

  await db.incomeSources.insert({
    id: newId(),
    name: 'Salary',
    amountMinor: toMinor(2400, DEFAULT_CURRENCY),
    currency: DEFAULT_CURRENCY,
    frequency: 'monthly',
    destinationWalletId: wallet.id,
    active: true,
    createdAt: ts,
    updatedAt: ts,
  });

  const jars = DEFAULT_JAR_TEMPLATE.map((t, i) => ({
    id: newId(),
    name: t.name,
    type: t.type,
    percentage: t.percentage,
    visibility: 'personal' as const,
    targetAmountMinor:
      t.targetMajor != null ? toMinor(t.targetMajor, DEFAULT_CURRENCY) : null,
    openingBalanceMinor:
      t.openingMajor != null ? toMinor(t.openingMajor, DEFAULT_CURRENCY) : 0,
    startedAt: t.startedMonthsAgo
      ? addMonths(todayISO(), -t.startedMonthsAgo)
      : todayISO(),
    currency: DEFAULT_CURRENCY,
    color: t.color,
    pattern: t.pattern,
    icon: t.icon,
    ownerType: 'user' as const,
    order: i,
    createdAt: ts,
    updatedAt: ts,
  }));
  await db.jars.bulkInsert(jars);

  const jarByKey = new Map(DEFAULT_JAR_TEMPLATE.map((t, i) => [t.key, jars[i]]));
  const subs = DEFAULT_JAR_TEMPLATE.flatMap((t) =>
    (t.subCategories ?? []).map((name, order) => ({
      id: newId(),
      jarId: jarByKey.get(t.key)!.id,
      name,
      order,
      createdAt: ts,
      updatedAt: ts,
    })),
  );
  if (subs.length) await db.subCategories.bulkInsert(subs);
}
