import { formatMoney } from '@/lib/money';
import type { TimelinePoint } from './timeline';
import styles from './BalanceTimeline.module.css';

interface Props {
  points: TimelinePoint[];
  targetMinor: number | null;
  currency: string;
  locale?: string;
}

const W = 320;
const H = 120;
const PAD = { l: 6, r: 14, t: 10, b: 16 };

export function BalanceTimeline({ points, targetMinor, currency, locale }: Props) {
  const t = (iso: string) => new Date(iso + 'T00:00:00Z').getTime();
  const minT = t(points[0].date);
  const maxT = t(points[points.length - 1].date);

  if (maxT <= minT) {
    return (
      <p className={styles.empty}>
        The timeline fills in as months pass. First contribution posts next cycle.
      </p>
    );
  }

  const maxBal = Math.max(
    ...points.map((p) => p.balanceMinor),
    targetMinor ?? 0,
    1,
  );
  const yMax = maxBal * 1.12;

  const x = (iso: string) =>
    PAD.l + ((t(iso) - minT) / (maxT - minT)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / yMax) * (H - PAD.t - PAD.b);

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.balanceMinor).toFixed(1)}`).join(' ');
  const areaPath =
    `${path} L${x(points[points.length - 1].date).toFixed(1)} ${y(0).toFixed(1)}` +
    ` L${x(points[0].date).toFixed(1)} ${y(0).toFixed(1)} Z`;

  const marks = points.filter((p) => p.kind === 'debit');
  const targetY = targetMinor ? y(targetMinor) : null;

  return (
    <div className={styles.wrap}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Balance over time. Now ${formatMoney(points[points.length - 1].balanceMinor, currency, locale)}${
          targetMinor ? ` of ${formatMoney(targetMinor, currency, locale)}` : ''
        }. ${marks.length} marker${marks.length === 1 ? '' : 's'}.`}
      >
        <path className={styles.area} d={areaPath} />
        <path className={styles.line} d={path} />

        {targetY != null && (
          <>
            <line className={styles.target} x1={PAD.l} x2={W - PAD.r} y1={targetY} y2={targetY} />
            <text className={styles.targetLabel} x={W - PAD.r} y={targetY - 4} textAnchor="end">
              target
            </text>
          </>
        )}

        {marks.map((p, i) => (
          <circle
            key={`${p.date}-${i}`}
            className={styles.wdot}
            cx={x(p.date)}
            cy={y(p.balanceMinor)}
            r={4}
          >
            <title>
              {p.label} · −{formatMoney(-p.deltaMinor, currency, locale)} · {p.date}
            </title>
          </circle>
        ))}

        <text className={styles.axisLabel} x={PAD.l} y={H - 3}>
          {points[0].date}
        </text>
        <text className={styles.axisLabel} x={W - PAD.r} y={H - 3} textAnchor="end">
          {points[points.length - 1].date}
        </text>
      </svg>
    </div>
  );
}
