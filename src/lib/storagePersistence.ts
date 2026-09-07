/** Ask the browser to keep our IndexedDB data off the eviction list.
 *
 *  Installed home-screen PWAs on iOS are already exempt from Safari's 7-day
 *  eviction (SPEC.md §10); a plain tab is not. Everywhere else,
 *  `navigator.storage.persist()` is the lever — Chromium grants it heuristically
 *  (installed / engaged origins), Firefox prompts, Safari support is partial.
 *  See docs/features/0010-pwa-polish.md for the spike notes. */

export interface StorageStatus {
  supported: boolean;
  persisted: boolean;
  usageBytes?: number;
  quotaBytes?: number;
}

export async function requestPersistence(): Promise<StorageStatus> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { supported: false, persisted: false };
  }
  let persisted = false;
  try {
    persisted = (await navigator.storage.persisted?.()) ?? false;
    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch {
    /* ignore — best-effort */
  }
  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;
  try {
    const est = await navigator.storage.estimate?.();
    usageBytes = est?.usage;
    quotaBytes = est?.quota;
  } catch {
    /* ignore */
  }
  return { supported: true, persisted, usageBytes, quotaBytes };
}
