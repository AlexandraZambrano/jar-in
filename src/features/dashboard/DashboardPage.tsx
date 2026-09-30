import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { APP_LOCALE } from '@/lib/locale';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import { formatMoney } from '@/lib/money';
import { monthLabel } from '@/lib/date';
import type { AllocationEvent, Jar, Transaction, WithdrawalEvent } from '@/db/schemas';
import { CoachNote } from '@/components/CoachNote';
import { AllocationDonut, type DonutSegment } from '@/components/AllocationDonut';
import { resolveJarColors } from '@/features/jars/jarPalette';
import { monthlyBalanceSeries, projectGoalDate } from '@/features/projections/project';
import {
  getNotableChange,
  recordProjections,
  type NotableChange,
} from '@/features/projections/tracker';
import type { IconName } from '@/components/icons';
import { JarCard } from './JarCard';
import { useMonthlyIncome } from '@/features/income/useMonthlyIncome';
import { coachMessage, computeJar, fxNote, planHealth } from './compute';

export function DashboardPage() {
  const db = useDb();
  const prefs = usePreferences();
  const cvd = prefs.a11y.includes('cvd');
  const calm = prefs.a11y.includes('calm');
  const patterns = prefs.a11y.includes('patterns');
  const locale = APP_LOCALE;

  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const { inc, home: currency } = useMonthlyIncome();
  const { data: txns } = useRxQuery<Transaction>(() => db.transactions.find(), [db]);
  const { data: withdrawals } = useRxQuery<WithdrawalEvent>(
    () => db.withdrawalEvents.find(),
    [db],
  );
  const { data: allocations } = useRxQuery<AllocationEvent>(
    () => db.allocationEvents.find(),
    [db],
  );

  const jars = useMemo(
    () => [...jarsRaw].sort((a, b) => a.order - b.order),
    [jarsRaw],
  );

  const health = useMemo(() => planHealth(jars), [jars]);
  const incomeNote = fxNote(inc);

  const computed = useMemo(
    () => jars.map((jar) => computeJar(jar, inc.minor, txns, withdrawals, allocations)),
    [jars, inc.minor, txns, withdrawals, allocations],
  );

  // Deterministic goal-date projections for accumulation jars. Recomputed
  // synchronously whenever the underlying data changes (income / percentage /
  // withdrawal edits all flow through here via RxDB + emitReprojection) — no
  // scheduled job. The tracker remembers the previous run so the coach note can
  // call out a notable shift.
  const projSnaps = useMemo(
    () =>
      computed
        .filter((c) => c.jar.type === 'accumulation')
        .map((c) => {
          const series = monthlyBalanceSeries(c.jar, allocations, withdrawals);
          const p = projectGoalDate(c.jar, series, c.plannedMinor);
          return {
            jarId: c.jar.id,
            jarName: c.jar.name,
            monthsRemaining: p ? p.monthsRemaining : null,
          };
        }),
    [computed, withdrawals, allocations],
  );

  const [notable, setNotable] = useState<NotableChange | null>(() => getNotableChange());
  useEffect(() => {
    recordProjections(projSnaps);
    setNotable(getNotableChange());
  }, [projSnaps]);

  const segments: DonutSegment[] = computed.map((c) => {
    const { fill, on } = resolveJarColors(c.jar.color, { cvd, calm });
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
          No income yet. <Link to="/income/new">Add an income source</Link> to see your
          jars fill up.
        </p>
      )}
      {incomeNote && <p className="muted">{incomeNote}</p>}

      {segments.length > 0 && (
        <AllocationDonut
          segments={segments}
          centerValue={formatMoney(inc.minor, currency, locale)}
          centerLabel="planned"
          centerSub={`${jars.length} jars`}
          dividers={cvd}
        />
      )}

      <CoachNote>{coachMessage(health, notable)}</CoachNote>

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
          <JarCard
            key={c.jar.id}
            computed={c}
            cvd={cvd}
            calm={calm}
            patterns={patterns}
            locale={locale}
            tiltSeed={i + 1}
          />
        ))}
      </div>

      <Link className="link-btn" to="/transactions" style={{ alignSelf: 'center' }}>
        All transactions
      </Link>
    </div>
  );
}
