import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import { formatMoney } from '@/lib/money';
import { monthLabel } from '@/lib/date';
import type { IncomeSource, Jar, Transaction, WithdrawalEvent } from '@/db/schemas';
import { CoachNote } from '@/components/CoachNote';
import { AllocationDonut, type DonutSegment } from '@/components/AllocationDonut';
import { resolveJarColors } from '@/features/jars/jarPalette';
import type { IconName } from '@/components/icons';
import { JarCard } from './JarCard';
import {
  coachMessage,
  computeJar,
  monthlyIncome,
  planHealth,
} from './compute';

export function DashboardPage() {
  const db = useDb();
  const prefs = usePreferences();
  const cvd = prefs.a11y.includes('cvd');
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';

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

  const inc = useMemo(() => monthlyIncome(income), [income]);
  const health = useMemo(() => planHealth(jars), [jars]);
  const currency = jars[0]?.currency ?? 'EUR';

  const computed = useMemo(
    () => jars.map((jar) => computeJar(jar, inc.minor, txns, withdrawals)),
    [jars, inc.minor, txns, withdrawals],
  );

  const segments: DonutSegment[] = computed.map((c) => {
    const { fill, on } = resolveJarColors(c.jar.color, cvd);
    const planned = c.jar.percentage;
    const actual =
      c.jar.type === 'flow'
        ? c.plannedMinor > 0
          ? (c.actualMinor / c.plannedMinor) * planned
          : 0
        : c.targetMinor && c.targetMinor > 0
          ? Math.min(1, c.actualMinor / c.targetMinor) * planned
          : 0;
    return {
      id: c.jar.id,
      label: c.jar.name,
      icon: c.jar.icon as IconName,
      color: fill,
      on,
      plannedPct: planned,
      actualPct: Math.max(actual, 0.4),
    };
  });

  return (
    <div className="screen">
      <header className="screen-head">
        <div>
          <span className="eyebrow">{monthLabel()}</span>
          <div className="screen-title">{formatMoney(inc.minor, currency, locale)}</div>
        </div>
        <span className="chip chip--ok">planned / month</span>
      </header>

      {inc.minor === 0 && (
        <p className="muted">
          No income yet. <Link to="/settings">Add an income source</Link> to see your
          jars fill up.
        </p>
      )}
      {inc.mixedCurrency && (
        <p className="muted">
          Income is in more than one currency — conversion arrives in Phase 2, so the
          total above only adds up matching currencies.
        </p>
      )}

      {segments.length > 0 && (
        <AllocationDonut
          segments={segments}
          centerValue={formatMoney(inc.minor, currency, locale)}
          centerLabel="planned"
          centerSub={`${jars.length} jars`}
          dividers={cvd}
        />
      )}

      <CoachNote>{coachMessage(health)}</CoachNote>

      <div className="screen-head">
        <h2 className="screen-title" style={{ fontSize: 'var(--step-title)' }}>
          Your jars
        </h2>
        <Link className="link-btn" to="/jars">
          Edit
        </Link>
      </div>

      <div className="stack">
        {computed.map((c, i) => (
          <JarCard key={c.jar.id} computed={c} cvd={cvd} locale={locale} tiltSeed={i + 1} />
        ))}
      </div>
    </div>
  );
}
