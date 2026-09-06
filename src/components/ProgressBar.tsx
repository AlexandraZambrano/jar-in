import type { CSSProperties } from 'react';
import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  /** 0..1 (values above 1 are clamped for the bar but `over` should be set) */
  value: number;
  fill?: string;
  trackColor?: string;
  height?: number;
  bordered?: boolean;
  over?: boolean;
  /** accessible description, e.g. "€180 of €400 spent" */
  label: string;
}

export function ProgressBar({
  value,
  fill,
  trackColor,
  height,
  bordered = false,
  over = false,
  label,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const vars = {
    '--_fill': fill,
    '--_track': trackColor,
    '--_h': height ? `${height}px` : undefined,
    '--_border': bordered ? '2px' : undefined,
  } as CSSProperties;

  return (
    <div
      className={styles.track}
      style={vars}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <div
        className={`${styles.fill} ${over ? styles.over : ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
