import type { JarInDatabase } from '@/db/database';
import type { IncomeSource } from '@/db/schemas';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/date';

export interface WalletInput {
  name: string;
  currency: string;
}

/** Income sources that would be orphaned if this wallet were removed. */
export function incomeSourcesUsingWallet(
  walletId: string,
  income: IncomeSource[],
): IncomeSource[] {
  return income.filter((s) => s.destinationWalletId === walletId);
}

export async function createWallet(
  db: JarInDatabase,
  input: WalletInput,
): Promise<string> {
  const ts = nowISO();
  const id = newId();
  await db.wallets.insert({
    id,
    name: input.name.trim(),
    currency: input.currency,
    ownerType: 'user',
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateWallet(
  db: JarInDatabase,
  id: string,
  patch: WalletInput,
): Promise<void> {
  const doc = await db.wallets.findOne(id).exec();
  if (!doc) return;
  await doc.patch({
    name: patch.name.trim(),
    currency: patch.currency,
    updatedAt: nowISO(),
  });
}

/** Throws if the wallet is still a destination for an income source. */
export async function deleteWallet(db: JarInDatabase, id: string): Promise<void> {
  const income = await db.incomeSources.find().exec();
  const blockers = incomeSourcesUsingWallet(
    id,
    income.map((d) => d.toJSON() as IncomeSource),
  );
  if (blockers.length) {
    throw new Error(
      `In use by ${blockers.length} income source${blockers.length > 1 ? 's' : ''}. Repoint ${blockers.length > 1 ? 'them' : 'it'} first.`,
    );
  }
  const doc = await db.wallets.findOne(id).exec();
  await doc?.remove();
}
