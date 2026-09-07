/** Tracks projected goal dates between recomputes so the dashboard coach note
 *  can call out the single most notable shift ("Safe fund now finishes 2 months
 *  sooner"). Module-level state — survives navigation, resets on reload. */

export interface ProjectionSnapshot {
  jarId: string;
  jarName: string;
  /** null = no projection (target met, or not growing) */
  monthsRemaining: number | null;
}

export interface NotableChange {
  jarName: string;
  deltaMonths: number; // absolute, ≥ 1
  direction: 'sooner' | 'later';
}

let previous = new Map<string, number | null>();
let notable: NotableChange | null = null;
let seeded = false;

export function recordProjections(snaps: ProjectionSnapshot[]): void {
  let best: NotableChange | null = null;

  if (seeded) {
    for (const s of snaps) {
      const prev = previous.get(s.jarId);
      if (prev == null || s.monthsRemaining == null) continue;
      const rounded = Math.round(prev - s.monthsRemaining); // >0 = fewer months now
      if (Math.abs(rounded) < 1) continue;
      if (!best || Math.abs(rounded) > best.deltaMonths) {
        best = {
          jarName: s.jarName,
          deltaMonths: Math.abs(rounded),
          direction: rounded > 0 ? 'sooner' : 'later',
        };
      }
    }
    if (best) notable = best;
  }

  // Update the baseline. A transient loading render (monthsRemaining === null
  // before data arrives) must not wipe a known value, or the next real change
  // would be compared against nothing.
  for (const s of snaps) {
    if (s.monthsRemaining != null) previous.set(s.jarId, s.monthsRemaining);
    else if (!previous.has(s.jarId)) previous.set(s.jarId, null);
  }
  seeded = true;
}

export function getNotableChange(): NotableChange | null {
  return notable;
}

/** test helper */
export function resetTracker(): void {
  previous = new Map();
  notable = null;
  seeded = false;
}
