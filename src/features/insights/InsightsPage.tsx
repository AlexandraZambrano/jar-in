import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type { IncomeSource, Jar, Transaction, WithdrawalEvent } from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { Icon, type IconName } from '@/components/icons';
import { formatMoney } from '@/lib/money';
import { monthLabel } from '@/lib/date';
import { computeJar, monthlyIncome } from '@/features/dashboard/compute';
import { resolveJarColors } from '@/features/jars/jarPalette';
import {
  methodLabel,
  monthlyBalanceSeries,
  projectGoalDate,
} from '@/features/projections/project';

export function InsightsPage() {
  const db = useDb();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const a11y = usePreferences().a11y;
  const cvd = a11y.includes('cvd');
  const calm = a11y.includes('calm');

  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const { data: income } = useRxQuery<IncomeSource>(() => db.incomeSources.find(), [db]);
  const { data: txns } = useRxQuery<Transaction>(() => db.transactions.find(), [db]);
  const { data: withdrawals } = useRxQuery<WithdrawalEvent>(
    () => db.withdrawalEvents.find(),
    [db],
  );

  const jars = useMemo(
    () => [...jarsRaw].sort((a, b) => a.order - b.order),
    [jarsRaw],
  );
  const inc = monthlyIncome(income);
  const accumulation = jars.filter((j) => j.type === 'accumulation');

  return (
    <div className="screen">
      <h1 className="screen-title">Insights</h1>
      <p className="muted">
        Deterministic goal-date estimates from each jar’s own growth so far. Numbers
        only — the plain-language coaching comes with the AI layer.
      </p>

      <div className="stack">
        {accumulation.map((jar, i) => {
          const c = computeJar(jar, inc.minor, txns, withdrawals);
          const series = monthlyBalanceSeries(jar, c.plannedMinor, withdrawals);
          const p = projectGoalDate(jar, series, c.plannedMinor);
          const { fill, on } = resolveJarColors(jar.color, { cvd, calm });
          return (
            <Sticker key={jar.id} gloss fill={fill} on={on} tiltSeed={i + 1} style={{ padding: 13 }}>
              <Link
                to={`/jars/${jar.id}`}
                style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Icon name={jar.icon as IconName} size={18} />
                  <strong style={{ fontFamily: 'var(--font-display)', flexGrow: 1 }}>
                    {jar.name}
                  </strong>
                  <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {formatMoney(c.actualMinor, jar.currency, locale)} /{' '}
                    {formatMoney(jar.targetAmountMinor ?? 0, jar.currency, locale)}
                  </span>
                </div>
                {c.goalMet ? (
                  <span>Goal reached.</span>
                ) : p ? (
                  <span style={{ fontSize: 'var(--step-caption)' }}>
                    Reaches goal around <strong>{monthLabel(p.date, locale)}</strong> —{' '}
                    {Math.max(1, Math.ceil(p.monthsRemaining))} months · {methodLabel(p.method)} ·{' '}
                    {p.confidence} confidence
                  </span>
                ) : (
                  <span style={{ fontSize: 'var(--step-caption)' }}>
                    No projection yet — not growing.
                  </span>
                )}
              </Link>
            </Sticker>
          );
        })}
        {accumulation.length === 0 && (
          <p className="muted">
            No growth jars yet. Set a jar’s type to “Growth” to get a projection.
          </p>
        )}
      </div>
    </div>
  );
}
