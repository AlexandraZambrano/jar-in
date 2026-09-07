import { useCallback, useEffect, useState } from 'react';
import styles from './Tour.module.css';

export interface TourStep {
  selector: string;
  title: string;
  body: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  steps: TourStep[];
  onDone: () => void;
}

const PAD = 8;

export function Tour({ steps, onDone }: Props) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(steps[i]?.selector);
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [i, steps]);

  useEffect(() => {
    measure();
    const t = window.setTimeout(measure, 60); // after any scroll settles
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const step = steps[i];
  if (!step) return null;

  const last = i === steps.length - 1;
  const next = () => (last ? onDone() : setI((n) => n + 1));

  // Place the tooltip above the target if it sits in the lower half, else below.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const below = rect ? rect.top + rect.height / 2 < vh / 2 : true;
  const tipStyle: React.CSSProperties = rect
    ? below
      ? { top: rect.top + rect.height + 10, left: Math.max(12, Math.min(rect.left, vh)) }
      : { bottom: vh - rect.top + 10, left: 12, right: 12, marginInline: 'auto' }
    : { top: '40%', left: 12, right: 12, marginInline: 'auto' };

  return (
    <div className={styles.layer} role="dialog" aria-label="App tour">
      <button
        type="button"
        className={styles.scrim}
        aria-label="Skip tour"
        onClick={onDone}
      />
      {rect && (
        <div
          className={styles.spot}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      )}
      <div className={styles.tip} style={tipStyle}>
        <span className={styles.title}>{step.title}</span>
        <span className={styles.body}>{step.body}</span>
        <div className={styles.row}>
          <span className={styles.count}>
            {i + 1} / {steps.length}
          </span>
          <div className={styles.actions}>
            {!last && (
              <button type="button" className={styles.skip} onClick={onDone}>
                Skip
              </button>
            )}
            <button type="button" className={styles.next} onClick={next}>
              {last ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
