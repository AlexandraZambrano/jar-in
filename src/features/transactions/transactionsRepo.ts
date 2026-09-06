import type { JarInDatabase } from '@/db/database';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/date';

export interface TransactionInput {
  jarId: string;
  subCategoryId: string | null;
  amountMinor: number;
  currency: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export async function addTransaction(
  db: JarInDatabase,
  input: TransactionInput,
): Promise<string> {
  const ts = nowISO();
  const id = newId();
  await db.transactions.insert({
    id,
    jarId: input.jarId,
    subCategoryId: input.subCategoryId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    date: input.date,
    note: input.note.trim(),
    sourceType: 'manual',
    externalAccountId: null,
    externalTransactionId: null,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateTransaction(
  db: JarInDatabase,
  id: string,
  input: TransactionInput,
): Promise<void> {
  const doc = await db.transactions.findOne(id).exec();
  if (!doc) return;
  await doc.patch({
    jarId: input.jarId,
    subCategoryId: input.subCategoryId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    date: input.date,
    note: input.note.trim(),
    updatedAt: nowISO(),
  });
}

export async function deleteTransaction(db: JarInDatabase, id: string): Promise<void> {
  const doc = await db.transactions.findOne(id).exec();
  await doc?.remove();
}

/** Point an orphaned transaction at a live jar. */
export async function reassignTransaction(
  db: JarInDatabase,
  id: string,
  jarId: string,
): Promise<void> {
  const doc = await db.transactions.findOne(id).exec();
  if (!doc) return;
  await doc.patch({ jarId, subCategoryId: null, updatedAt: nowISO() });
}
