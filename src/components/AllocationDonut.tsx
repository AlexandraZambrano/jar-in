import type { CSSProperties } from 'react';
import { Icon, type IconName } from './icons';
import styles from './AllocationDonut.module.css';

export interface DonutSegment {
  id: string;
  label: string;
  icon: IconName;
  color: string;
  on: string;
  plannedPct: number;
  actualPct: number;
}

interface Props {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel?: string;
  centerSub?: string;
  size?: number;
  /** show 3px dividers between segments (colour-blind-safe mode) */
  dividers?: boolean;
}

function conic(parts: { color: string; pct: number }[]): string {
  const total = parts.reduce((s, p) => s + p.pct, 0) || 1;
  let acc = 0;
  const stops = parts.map((p) => {
    const start = (acc / total) * 100;
    acc += p.pct;
    const end = (acc / total) * 100;
    return `${p.color} ${start}% ${end}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function AllocationDonut({
  segments,
  centerValue,
  centerLabel = 'planned',
  centerSub,
  size = 240,
  dividers = false,
}: Props) {
  const outer = conic(segments.map((s) => ({ color: s.color, pct: Math.max(s.actualPct, 0.001) })));
  const inner = conic(segments.map((s) => ({ color: s.color, pct: Math.max(s.plannedPct, 0.001) })));

  const totalPlanned = segments.reduce((s, x) => s + x.plannedPct, 0) || 1;
  let acc = 0;
  const bubbles = segments.map((s, i) => {
    const mid = (acc + s.plannedPct / 2) / totalPlanned;
    acc += s.plannedPct;
    const angle = mid * 2 * Math.PI;
    const r = 0.5; // fraction of size, on the outer ring
    const left = 50 + Math.sin(angle) * r * 100 * 0.86;
    const top = 50 - Math.cos(angle) * r * 100 * 0.86;
    return { seg: s, left, top, tilt: (i % 3) - 1 };
  });

  const dividerEls = dividers
    ? (() => {
        let a = 0;
        return segments.map((s) => {
          const deg = (a / totalPlanned) * 360;
          a += s.plannedPct;
          return (
            <span
              key={`d-${s.id}`}
              className={styles.divider}
              style={{ transform: `translateX(-50%) rotate(${deg}deg)` }}
            />
          );
        });
      })()
    : null;

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <div className={`${styles.ring} ${styles.ringOuter}`} style={{ background: outer }} />
      <div className={`${styles.ring} ${styles.ringInner}`} style={{ background: inner }} />
      {dividerEls}
      <div className={styles.hole}>
        <span className={styles.holeLabel}>{centerLabel}</span>
        <span className={styles.holeValue}>{centerValue}</span>
        {centerSub && <span className={styles.holeSub}>{centerSub}</span>}
      </div>
      {bubbles.map(({ seg, left, top, tilt }) => (
        <span
          key={seg.id}
          className={styles.bubble}
          style={
            {
              left: `${left}%`,
              top: `${top}%`,
              background: seg.color,
              color: seg.on,
              '--_b': tilt,
            } as CSSProperties
          }
          title={`${seg.label} ${Math.round(seg.plannedPct)}%`}
        >
          <Icon name={seg.icon} size={20} />
        </span>
      ))}
    </div>
  );
}
