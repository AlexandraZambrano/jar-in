/** The "immediate re-projection" seam (SPEC.md §7, §4, §8.3).
 *
 *  Income changes, jar-percentage changes and withdrawal events all fire this.
 *  In v1 nothing consumes it beyond a dev log — projections (feature 0009) and
 *  the AI explanation (Phase 3) subscribe here so a change is reflected right
 *  away instead of on a scheduled recompute. */

export type ReprojectionReason =
  | 'income-added'
  | 'income-changed'
  | 'income-removed'
  | 'income-toggled'
  | 'percentage-changed'
  | 'withdrawal';

type Listener = (reason: ReprojectionReason) => void;

const listeners = new Set<Listener>();

export function subscribeReprojection(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitReprojection(reason: ReprojectionReason): void {
  if (import.meta.env.DEV) {
    console.info(`[reprojection] ${reason}`);
  }
  listeners.forEach((fn) => fn(reason));
}
