import type { ReactNode } from 'react';
import styles from './CoachNote.module.css';

/** The AI-coach surface. In v1 the text is rule-based (see dashboard/compute.ts);
 *  the Groq-worded version arrives in Phase 3. Styled as a paper note pinned onto
 *  the sticker sheet (docs/DESIGN-STICKER-SHEET.md §3.3). */
export function CoachNote({ children }: { children: ReactNode }) {
  return (
    <aside className={styles.note} aria-label="Coach">
      <span className={styles.spine} aria-hidden="true" />
      <span className={styles.tape} aria-hidden="true" />
      <span className={styles.label}>COACH</span>
      {children}
    </aside>
  );
}
