import type { JarInDatabase } from '@/db/database';
import type { Jar, JarPattern, JarType } from '@/db/schemas';
import { newId } from '@/lib/id';
import { nowISO, todayISO } from '@/lib/date';

export interface JarInput {
  name: string;
  type: JarType;
  percentage: number;
  color: string;
  pattern: JarPattern;
  icon: string;
  currency: string;
  targetAmountMinor: number | null;
  openingBalanceMinor: number;
}

export async function createJar(db: JarInDatabase, input: JarInput): Promise<string> {
  const ts = nowISO();
  const existing = await db.jars.find().exec();
  const order = existing.reduce((max, j) => Math.max(max, j.order), -1) + 1;
  const id = newId();
  await db.jars.insert({
    id,
    name: input.name.trim(),
    type: input.type,
    percentage: input.percentage,
    visibility: 'personal',
    targetAmountMinor: input.type === 'accumulation' ? input.targetAmountMinor : null,
    openingBalanceMinor: input.openingBalanceMinor,
    startedAt: todayISO(),
    currency: input.currency,
    color: input.color,
    pattern: input.pattern,
    icon: input.icon,
    ownerType: 'user',
    order,
    createdAt: ts,
    updatedAt: ts,
  });
  return id;
}

export async function updateJar(
  db: JarInDatabase,
  id: string,
  patch: Partial<JarInput>,
): Promise<void> {
  const doc = await db.jars.findOne(id).exec();
  if (!doc) return;
  const next: Partial<Jar> = { updatedAt: nowISO() };
  if (patch.name !== undefined) next.name = patch.name.trim();
  if (patch.type !== undefined) next.type = patch.type;
  if (patch.percentage !== undefined) next.percentage = patch.percentage;
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.pattern !== undefined) next.pattern = patch.pattern;
  if (patch.icon !== undefined) next.icon = patch.icon;
  if (patch.currency !== undefined) next.currency = patch.currency;
  const type = patch.type ?? doc.get('type');
  // Opening balance is meaningful for every jar type — a flow jar tracks a
  // running balance too — so persist it regardless of type.
  if (patch.openingBalanceMinor !== undefined)
    next.openingBalanceMinor = patch.openingBalanceMinor;
  if (type === 'accumulation') {
    if (patch.targetAmountMinor !== undefined) next.targetAmountMinor = patch.targetAmountMinor;
  } else {
    next.targetAmountMinor = null;
  }
  await doc.patch(next);
}

export async function deleteJar(db: JarInDatabase, id: string): Promise<void> {
  const doc = await db.jars.findOne(id).exec();
  await doc?.remove();
}
