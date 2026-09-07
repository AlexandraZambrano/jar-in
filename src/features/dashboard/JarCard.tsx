import { useNavigate } from 'react-router-dom';
import { Sticker } from '@/components/Sticker';
import { ProgressBar } from '@/components/ProgressBar';
import { Icon, type IconName } from '@/components/icons';
import { formatMoney } from '@/lib/money';
import { resolveJarColors, PATTERN_CSS, PATTERN_BG_SIZE } from '@/features/jars/jarPalette';
import type { JarComputed } from './compute';
import styles from './JarCard.module.css';

interface Props {
  computed: JarComputed;
  cvd: boolean;
  calm: boolean;
  patterns: boolean;
  locale?: string;
  tiltSeed: number;
}

export function JarCard({ computed, cvd, calm, patterns, locale, tiltSeed }: Props) {
  const { jar, plannedMinor, actualMinor, targetMinor, ratio, over, goalMet } = computed;
  const navigate = useNavigate();
  const { fill, on } = resolveJarColors(jar.color, { cvd, calm });

  const money = (m: number) => formatMoney(m, jar.currency, locale);
  const line =
    jar.type === 'flow'
      ? `Flow · ${money(actualMinor)} of ${money(plannedMinor)} spent`
      : `Growth · ${money(actualMinor)} of ${money(targetMinor ?? 0)} · ${money(plannedMinor)}/mo`;

  return (
    <Sticker
      as="button"
      gloss
      fill={fill}
      on={on}
      tiltSeed={tiltSeed}
      className={styles.card}
      onClick={() => navigate(`/jars/${jar.id}`)}
      aria-label={`${jar.name}, ${jar.percentage}% ${jar.type === 'flow' ? 'flow jar' : 'growth jar'}. ${line}`}
    >
      {patterns && jar.pattern !== 'solid' && (
        <span
          className={styles.pattern}
          aria-hidden="true"
          style={{
            backgroundImage: PATTERN_CSS[jar.pattern],
            backgroundSize: PATTERN_BG_SIZE[jar.pattern],
          }}
        />
      )}

      <span className={styles.chip} style={{ color: on }}>
        <Icon name={jar.icon as IconName} size={19} />
      </span>

      <span className={styles.body}>
        <span className={styles.top}>
          <span className={styles.name}>{jar.name}</span>
          <span className={styles.pct}>{jar.percentage}%</span>
        </span>
        <span className={styles.meta}>
          <span>{line}</span>
          {over && (
            <span className={styles.flag}>
              <Icon name="warn" size={13} /> over
            </span>
          )}
          {goalMet && (
            <span className={styles.flag}>
              <Icon name="check" size={13} /> goal met
            </span>
          )}
        </span>
        <ProgressBar
          value={ratio}
          fill={on}
          trackColor="color-mix(in srgb, currentColor 26%, transparent)"
          over={over}
          label={line}
        />
      </span>
    </Sticker>
  );
}
