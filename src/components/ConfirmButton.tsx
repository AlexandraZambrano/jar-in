import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './icons';
import styles from './ConfirmButton.module.css';

interface Props {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  caption?: ReactNode;
  /** icon-only 34px button (for tight rows) */
  compact?: boolean;
  'aria-label'?: string;
}

/** Two-step destructive action — no `window.confirm()` (which browsers can
 *  suppress, silently no-op'ing the delete). First click arms; second confirms;
 *  Cancel or 4s of inactivity disarms. */
export function ConfirmButton({
  onConfirm,
  label = 'Delete',
  confirmLabel = 'Really delete?',
  caption,
  compact = false,
  'aria-label': ariaLabel,
}: Props) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function arm() {
    setArmed(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setArmed(false), 4000);
  }
  function disarm() {
    window.clearTimeout(timer.current);
    setArmed(false);
  }

  if (compact) {
    return armed ? (
      <div className={styles.row}>
        <button type="button" className={styles.confirm} onClick={() => void onConfirm()}>
          {confirmLabel}
        </button>
        <button type="button" className={styles.cancel} onClick={disarm}>
          Cancel
        </button>
      </div>
    ) : (
      <button
        type="button"
        className={styles.compact}
        aria-label={ariaLabel ?? label}
        onClick={arm}
      >
        <Icon name="plus" size={15} style={{ transform: 'rotate(45deg)' }} />
      </button>
    );
  }

  return (
    <div className={styles.wrap}>
      {armed && caption && <span className={styles.caption}>{caption}</span>}
      {armed ? (
        <div className={styles.row}>
          <button
            type="button"
            className={styles.confirm}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </button>
          <button type="button" className={styles.cancel} onClick={disarm}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" className={styles.trigger} onClick={arm}>
          {label}
        </button>
      )}
    </div>
  );
}
