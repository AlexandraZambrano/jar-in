/** Session-scoped dedupe for CSV import. Re-importing the same file in one
 *  session won't create duplicate transactions. Not persisted — real bank sync
 *  (feature 0006 area, Phase 6) uses `externalTransactionId` for durable dedupe. */

const imported = new Set<string>();

export function isImported(hash: string): boolean {
  return imported.has(hash);
}

export function markImported(hashes: string[]): void {
  for (const h of hashes) imported.add(h);
}

/** test helper */
export function resetImported(): void {
  imported.clear();
}
