import type { JarInDatabase } from '@/db/database';
import type { SubCategory } from '@/db/schemas';
import { newId } from '@/lib/id';
import { nowISO } from '@/lib/date';
import { move } from '@/lib/reorder';

async function jarSubsSorted(
  db: JarInDatabase,
  jarId: string,
): Promise<SubCategory[]> {
  const docs = await db.subCategories.find({ selector: { jarId } }).exec();
  return docs
    .map((d) => d.toJSON() as SubCategory)
    .sort((a, b) => a.order - b.order);
}

export async function addSubCategory(
  db: JarInDatabase,
  jarId: string,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const subs = await jarSubsSorted(db, jarId);
  const order = subs.reduce((m, s) => Math.max(m, s.order), -1) + 1;
  const ts = nowISO();
  const id = newId();
  await db.subCategories.insert({ id, jarId, name: trimmed, order, createdAt: ts, updatedAt: ts });
  return id;
}

export async function renameSubCategory(
  db: JarInDatabase,
  id: string,
  name: string,
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const doc = await db.subCategories.findOne(id).exec();
  await doc?.patch({ name: trimmed, updatedAt: nowISO() });
}

export async function moveSubCategory(
  db: JarInDatabase,
  jarId: string,
  id: string,
  dir: 'up' | 'down',
): Promise<void> {
  const subs = await jarSubsSorted(db, jarId);
  const index = subs.findIndex((s) => s.id === id);
  const next = move(subs, index, dir);
  if (next === subs) return;
  const ts = nowISO();
  await Promise.all(
    next.map(async (s, i) => {
      if (s.order === i) return;
      const doc = await db.subCategories.findOne(s.id).exec();
      await doc?.patch({ order: i, updatedAt: ts });
    }),
  );
}

export async function deleteSubCategory(db: JarInDatabase, id: string): Promise<void> {
  // Transactions tagged with this sub-category fall back to jar level.
  const tagged = await db.transactions.find({ selector: { subCategoryId: id } }).exec();
  await Promise.all(tagged.map((t) => t.patch({ subCategoryId: null, updatedAt: nowISO() })));
  const doc = await db.subCategories.findOne(id).exec();
  await doc?.remove();
}
