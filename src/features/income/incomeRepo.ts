import type { JarInDatabase } from '@/db/database';
import type { IncomeFrequency } from '@/db/schemas';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/date';
import { emitReprojection } from '@/lib/reprojection';

export interface IncomeInput {
  name: string;
  amountMinor: number;
  currency: string;
  frequency: IncomeFrequency;
  destinationWalletId: string;
  active: boolean;
}

export async function createIncome(
  db: JarInDatabase,
  input: IncomeInput,
): Promise<string> {
  const ts = nowISO();
  const id = newId();
  await db.incomeSources.insert({
    id,
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    frequency: input.frequency,
    destinationWalletId: input.destinationWalletId,
    active: input.active,
    createdAt: ts,
    updatedAt: ts,
  });
  emitReprojection('income-added');
  return id;
}

export async function updateIncome(
  db: JarInDatabase,
  id: string,
  input: IncomeInput,
): Promise<void> {
  const doc = await db.incomeSources.findOne(id).exec();
  if (!doc) return;
  await doc.patch({
    name: input.name.trim(),
    amountMinor: input.amountMinor,
    currency: input.currency,
    frequency: input.frequency,
    destinationWalletId: input.destinationWalletId,
    active: input.active,
    updatedAt: nowISO(),
  });
  emitReprojection('income-changed');
}

export async function setIncomeActive(
  db: JarInDatabase,
  id: string,
  active: boolean,
): Promise<void> {
  const doc = await db.incomeSources.findOne(id).exec();
  if (!doc) return;
  await doc.patch({ active, updatedAt: nowISO() });
  emitReprojection('income-toggled');
}

export async function deleteIncome(db: JarInDatabase, id: string): Promise<void> {
  const doc = await db.incomeSources.findOne(id).exec();
  await doc?.remove();
  emitReprojection('income-removed');
}
