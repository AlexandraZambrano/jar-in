import type { JarInDatabase } from '@/db/database';
import { addMonths, nowISO, todayISO, wholeMonthsBetween } from '@/lib/date';
import { jarPlannedMinor, monthlyIncome } from '@/features/dashboard/compute';

/** Posts one allocation event per whole month a jar has been live and hasn't
 *  been credited for yet, valued at the jar's planned amount *right now* —
 *  past months keep whatever they posted at, never rewritten when the
 *  percentage or income later changes. Idempotent: safe to call every app
 *  open (used by RxdbProvider) or right after seeding an already-aged jar. */
export async function syncAllocationEvents(
  db: JarInDatabase,
  ref: string = todayISO(),
): Promise<void> {
  const [jars, income] = await Promise.all([
    db.jars.find().exec(),
    db.incomeSources.find().exec(),
  ]);
  const monthlyIncomeMinor = monthlyIncome(income.map((d) => d.toJSON())).minor;
  if (monthlyIncomeMinor <= 0) return;

  for (const doc of jars) {
    const jar = doc.toJSON();
    const dueMonths = wholeMonthsBetween(jar.startedAt, ref);
    if (dueMonths <= 0) continue;

    const plannedMinor = jarPlannedMinor(jar, monthlyIncomeMinor);
    if (plannedMinor <= 0) continue;

    const existing = await db.allocationEvents.find({ selector: { jarId: jar.id } }).exec();
    // "Months already posted" comes from the latest posted date rather than
    // existing.length, so a stray gap self-heals.
    const postedMonths = existing.reduce(
      (max, e) => Math.max(max, wholeMonthsBetween(jar.startedAt, e.date)),
      0,
    );
    if (dueMonths <= postedMonths) continue;

    const ts = nowISO();
    const docs = [];
    for (let m = postedMonths + 1; m <= dueMonths; m++) {
      const date = addMonths(jar.startedAt, m);
      docs.push({
        // Deterministic id: a concurrent run (StrictMode's double effect, a
        // second tab) collides on the primary key instead of double-posting.
        id: `${jar.id}_${date}`,
        jarId: jar.id,
        amountMinor: plannedMinor,
        currency: jar.currency,
        date,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    // bulkInsert reports conflicts in `.error` instead of throwing — the
    // first writer wins, so a posted amount is never overwritten.
    await db.allocationEvents.bulkInsert(docs);
  }
}
