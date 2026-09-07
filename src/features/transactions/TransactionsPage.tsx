import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type { Jar, SubCategory, Transaction } from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { Icon, type IconName } from '@/components/icons';
import { formatMoney } from '@/lib/money';
import { resolveJarColors } from '@/features/jars/jarPalette';
import { filterByJar, groupByDay, isUnassigned } from './compute';
import { reassignTransaction } from './transactionsRepo';
import styles from './TransactionsPage.module.css';

export function TransactionsPage() {
  const db = useDb();
  const navigate = useNavigate();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const a11y = usePreferences().a11y;
  const cvd = a11y.includes('cvd');
  const calm = a11y.includes('calm');

  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const jars = useMemo(() => [...jarsRaw].sort((a, b) => a.order - b.order), [jarsRaw]);
  const { data: subs } = useRxQuery<SubCategory>(() => db.subCategories.find(), [db]);
  const { data: txns } = useRxQuery<Transaction>(() => db.transactions.find(), [db]);

  const [jarFilter, setJarFilter] = useState<string | null>(null);
  const activeJarIds = useMemo(() => new Set(jars.map((j) => j.id)), [jars]);
  const jarById = useMemo(() => new Map(jars.map((j) => [j.id, j])), [jars]);
  const subName = (sid: string | null) =>
    sid ? (subs.find((s) => s.id === sid)?.name ?? null) : null;

  const groups = useMemo(
    () => groupByDay(filterByJar(txns, jarFilter), locale),
    [txns, jarFilter, locale],
  );

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="screen-title">Transactions</h1>
        <Link className="link-btn" to="/transactions/import">
          Import CSV
        </Link>
      </div>

      <div className={styles.filters}>
        <button
          type="button"
          className={styles.filter}
          aria-pressed={jarFilter === null}
          onClick={() => setJarFilter(null)}
        >
          All
        </button>
        {jars.map((j) => (
          <button
            key={j.id}
            type="button"
            className={styles.filter}
            aria-pressed={jarFilter === j.id}
            onClick={() => setJarFilter(j.id)}
          >
            {j.name}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="muted">
          Nothing here yet. Tap the <strong>+</strong> button to add a transaction.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.date} className={styles.day}>
          <div className={styles.dayHead}>
            <span>{g.label}</span>
            <span>{formatMoney(g.totalMinor, txns[0]?.currency ?? 'EUR', locale)}</span>
          </div>
          <div className="stack">
            {g.items.map((t, i) => {
              const jar = jarById.get(t.jarId);
              const orphan = isUnassigned(t, activeJarIds);
              const { fill } = jar
                ? resolveJarColors(jar.color, { cvd, calm })
                : { fill: 'var(--ink-soft)' };
              return (
                <Sticker key={t.id} tiltSeed={i + 1} style={{ padding: 0 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    className={styles.row}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    <span className={styles.icon} style={{ background: fill }}>
                      <Icon
                        name={(jar?.icon as IconName) ?? 'tag'}
                        size={16}
                      />
                    </span>
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>
                        {t.note || jar?.name || 'Unassigned'}
                      </span>
                      <span className={styles.rowSub}>
                        {orphan ? 'Unassigned' : jar?.name}
                        {subName(t.subCategoryId) ? ` · ${subName(t.subCategoryId)}` : ''}
                      </span>
                    </span>
                    <span className={styles.amt}>
                      −{formatMoney(t.amountMinor, t.currency, locale)}
                    </span>
                  </button>
                  {orphan && (
                    <div style={{ padding: '0 12px 10px' }}>
                      <label className="field">
                        Move to
                        <select
                          className={styles.reassign}
                          defaultValue=""
                          onChange={(e) =>
                            e.target.value && reassignTransaction(db, t.id, e.target.value)
                          }
                        >
                          <option value="" disabled>
                            Choose a jar…
                          </option>
                          {jars.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </Sticker>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
