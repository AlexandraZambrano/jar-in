import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type { Jar } from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { Icon, type IconName } from '@/components/icons';
import { planHealth } from '@/features/dashboard/compute';
import { resolveJarColors } from './jarPalette';
import styles from './JarsPage.module.css';

export function JarsPage() {
  const db = useDb();
  const cvd = usePreferences().a11y.includes('cvd');
  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const jars = useMemo(() => [...jarsRaw].sort((a, b) => a.order - b.order), [jarsRaw]);
  const health = planHealth(jars);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Your jars</h1>
        <span className={`chip ${health.balanced ? 'chip--ok' : 'chip--warn'}`}>
          {health.total}%
        </span>
      </header>

      {!health.balanced && (
        <p className="muted">
          Your percentages {health.delta > 0 ? 'exceed' : 'fall short of'} 100% by{' '}
          {Math.abs(health.delta)}%.
        </p>
      )}

      <div className="stack">
        {jars.map((jar, i) => {
          const { fill, on } = resolveJarColors(jar.color, cvd);
          return (
            <Sticker key={jar.id} gloss fill={fill} on={on} tiltSeed={i + 1}>
              <Link to={`/jars/${jar.id}`} className={styles.row}>
                <span className={styles.chip}>
                  <Icon name={jar.icon as IconName} size={19} />
                </span>
                <span className={styles.info}>
                  <span className={styles.name}>{jar.name}</span>
                  <span className={styles.sub}>
                    {jar.type === 'flow' ? 'Flow' : 'Growth'}
                  </span>
                </span>
                <span className={styles.pct}>{jar.percentage}%</span>
                <Icon name="chevron" size={18} />
              </Link>
            </Sticker>
          );
        })}
      </div>

      <Link className="btn" to="/jars/new" style={{ textAlign: 'center' }}>
        New jar
      </Link>
    </div>
  );
}
