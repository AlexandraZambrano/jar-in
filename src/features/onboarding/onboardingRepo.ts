import type { JarInDatabase } from '@/db/database';
import { newId } from '@/lib/id';
import { nowISO, todayISO } from '@/lib/date';
import { toMinor } from '@/lib/money';
import type { ProposedJar } from './proposeJars';

interface BuildInput {
  currency: string;
  incomeMajor: number | null;
  jars: ProposedJar[];
}

/** Turn the reviewed proposal into real documents: a wallet, an income source
 *  (if income was given), and the jars + their sub-categories. */
export async function buildFromProposal(
  db: JarInDatabase,
  { currency, incomeMajor, jars }: BuildInput,
): Promise<void> {
  const ts = nowISO();

  let walletId = (await db.wallets.findOne().exec())?.get('id') as string | undefined;
  if (!walletId) {
    walletId = newId();
    await db.wallets.insert({
      id: walletId,
      name: 'Main account',
      currency,
      ownerType: 'user',
      createdAt: ts,
      updatedAt: ts,
    });
  }

  if (incomeMajor != null && incomeMajor > 0) {
    await db.incomeSources.insert({
      id: newId(),
      name: 'Income',
      amountMinor: toMinor(incomeMajor, currency),
      currency,
      frequency: 'monthly',
      destinationWalletId: walletId,
      active: true,
      createdAt: ts,
      updatedAt: ts,
    });
  }

  const created = jars.map((j, i) => ({
    doc: {
      id: newId(),
      name: j.name.trim(),
      type: j.type,
      percentage: j.percentage,
      visibility: 'personal' as const,
      targetAmountMinor:
        j.type === 'accumulation' && j.targetMajor != null
          ? toMinor(j.targetMajor, currency)
          : null,
      openingBalanceMinor: 0,
      startedAt: todayISO(),
      currency,
      color: j.color,
      pattern: j.pattern,
      icon: j.icon,
      ownerType: 'user' as const,
      order: i,
      createdAt: ts,
      updatedAt: ts,
    },
    subs: j.subCategories ?? [],
  }));
  await db.jars.bulkInsert(created.map((c) => c.doc));

  const subs = created.flatMap((c) =>
    c.subs.map((name, order) => ({
      id: newId(),
      jarId: c.doc.id,
      name,
      order,
      createdAt: ts,
      updatedAt: ts,
    })),
  );
  if (subs.length) await db.subCategories.bulkInsert(subs);
}

/** "Start setup over" — wipe jars + sub-categories so onboarding can re-run.
 *  Transactions are kept (they surface as "Unassigned"). */
export async function wipeForRestart(db: JarInDatabase): Promise<void> {
  await db.subCategories.find().remove();
  await db.jars.find().remove();
  await db.withdrawalEvents.find().remove();
}
