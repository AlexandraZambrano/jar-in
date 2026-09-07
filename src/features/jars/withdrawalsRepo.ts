import type { JarInDatabase } from '@/db/database';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/date';
import { emitReprojection } from '@/lib/reprojection';

export interface WithdrawalInput {
  jarId: string;
  amountMinor: number;
  currency: string;
  date: string; // YYYY-MM-DD
  reason: string | null;
}

export async function createWithdrawal(
  db: JarInDatabase,
  input: WithdrawalInput,
): Promise<string> {
  const ts = nowISO();
  const id = newId();
  await db.withdrawalEvents.insert({
    id,
    jarId: input.jarId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    date: input.date,
    reason: input.reason?.trim() ? input.reason.trim() : null,
    createdAt: ts,
    updatedAt: ts,
  });
  emitReprojection('withdrawal');
  return id;
}

export async function deleteWithdrawal(db: JarInDatabase, id: string): Promise<void> {
  const doc = await db.withdrawalEvents.findOne(id).exec();
  await doc?.remove();
  emitReprojection('withdrawal');
}
