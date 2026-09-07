import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type {
  IncomeSource,
  Jar,
  SubCategory,
  Transaction,
  WithdrawalEvent,
} from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { ProgressBar } from '@/components/ProgressBar';
import { Icon, type IconName } from '@/components/icons';
import { formatMoney, parseAmountInput, toMinor } from '@/lib/money';
import { isSameMonth, nowISO, todayISO } from '@/lib/date';
import { computeJar, jarPlannedMinor, monthlyIncome } from '@/features/dashboard/compute';
import { ConfirmButton } from '@/components/ConfirmButton';
import {
  methodLabel,
  monthlyBalanceSeries,
  projectGoalDate,
  type ProjectionMethod,
} from '@/features/projections/project';
import { monthLabel } from '@/lib/date';
import { resolveJarColors } from './jarPalette';
import { buildBalanceTimeline } from './timeline';
import { BalanceTimeline } from './BalanceTimeline';
import { createWithdrawal, deleteWithdrawal } from './withdrawalsRepo';
import styles from './JarDetailPage.module.css';

export function JarDetailPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { id } = useParams();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  const a11y = usePreferences().a11y;
  const cvd = a11y.includes('cvd');
  const calm = a11y.includes('calm');

  const { data: jars } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const { data: income } = useRxQuery<IncomeSource>(() => db.incomeSources.find(), [db]);
  const { data: txns } = useRxQuery<Transaction>(() => db.transactions.find(), [db]);
  const { data: withdrawals } = useRxQuery<WithdrawalEvent>(
    () => db.withdrawalEvents.find(),
    [db],
  );
  const { data: subs } = useRxQuery<SubCategory>(() => db.subCategories.find(), [db]);

  const jar = jars.find((j) => j.id === id);

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  // null = let projectGoalDate pick (regression once there's ≥4 months of history)
  const [projMethod, setProjMethod] = useState<ProjectionMethod | null>(null);

  const inc = useMemo(() => monthlyIncome(income), [income]);

  if (!jar) {
    return (
      <div className="screen">
        <h1 className="screen-title">Jar not found</h1>
        <Link className="link-btn" to="/jars">
          Back to jars
        </Link>
      </div>
    );
  }

  const { fill, on } = resolveJarColors(jar.color, { cvd, calm });
  const money = (m: number) => formatMoney(m, jar.currency, locale);
  const c = computeJar(jar, inc.minor, txns, withdrawals);
  const planned = jarPlannedMinor(jar, inc.minor);

  const jarWithdrawals = withdrawals
    .filter((w) => w.jarId === jar.id)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const jarTxns = txns.filter((t) => t.jarId === jar.id);
  const timelinePoints =
    jar.type === 'accumulation'
      ? buildBalanceTimeline(
          jar,
          planned,
          jarWithdrawals.map((w) => ({
            amountMinor: w.amountMinor,
            date: w.date,
            label: w.reason || 'Withdrawal',
          })),
        )
      : buildBalanceTimeline(
          jar,
          planned,
          jarTxns.map((t) => ({
            amountMinor: t.amountMinor,
            date: t.date,
            label: t.note || 'Spent',
          })),
        );

  async function submitWithdrawal() {
    const parsed = parseAmountInput(amount);
    if (parsed == null || parsed <= 0) {
      setFormError('Enter an amount greater than 0.');
      return;
    }
    await createWithdrawal(db, {
      jarId: jar!.id,
      amountMinor: toMinor(parsed, jar!.currency),
      currency: jar!.currency,
      date,
      reason: reason || null,
    });
    setAmount('');
    setReason('');
    setDate(todayISO());
    setFormError('');
    setShowForm(false);
  }

  return (
    <div className="screen">
      <Sticker gloss fill={fill} on={on} tiltSeed={1} className={styles.head}>
        <span className={styles.headIcon}>
          <Icon name={jar.icon as IconName} size={19} />
        </span>
        <span className={styles.headName}>{jar.name}</span>
        <span style={{ fontWeight: 700 }}>{jar.percentage}%</span>
        <Link to={`/jars/${jar.id}/edit`} className={styles.headEdit}>
          Edit
        </Link>
      </Sticker>

      {jar.type === 'flow' ? (
        <>
          <div className={styles.big}>
            <div className={styles.bigValue}>
              {money(c.actualMinor)}{' '}
              <span style={{ color: 'var(--ink-soft)', fontSize: 18 }}>
                / {money(c.plannedMinor)}
              </span>
            </div>
            <div className={styles.bigSub}>
              spent this month{c.over ? ' · over cap' : ''}
            </div>
          </div>
          <ProgressBar
            value={c.ratio}
            fill={fill}
            over={c.over}
            height={12}
            bordered
            label={`${money(c.actualMinor)} of ${money(c.plannedMinor)} spent`}
          />

          <Sticker tiltSeed={2} className={styles.chartCard} style={{ color: fill }}>
            <div className="muted" style={{ fontSize: 'var(--step-caption)', marginBottom: 4 }}>
              Running balance · +{money(planned)}/mo credited, spending drawn down
            </div>
            <BalanceTimeline
              points={timelinePoints}
              targetMinor={null}
              currency={jar.currency}
              locale={locale}
            />
          </Sticker>

          <h2 className="screen-title" style={{ fontSize: 'var(--step-title)' }}>
            This month
          </h2>
          <div className="stack">
            {txns
              .filter((t) => t.jarId === jar.id && isSameMonth(t.date, nowISO()))
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((t, i) => (
                <Sticker key={t.id} tiltSeed={i + 1} style={{ padding: 0 }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    className={styles.wrow}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    <span className={styles.wrowMain}>
                      <span className={styles.wrowReason}>{t.note || jar.name}</span>
                      <span className={styles.wrowDate}>
                        {t.date}
                        {t.subCategoryId
                          ? ` · ${subs.find((s) => s.id === t.subCategoryId)?.name ?? ''}`
                          : ''}
                      </span>
                    </span>
                    <span className={styles.wrowAmt}>−{money(t.amountMinor)}</span>
                  </button>
                </Sticker>
              ))}
            {txns.filter((t) => t.jarId === jar.id && isSameMonth(t.date, nowISO()))
              .length === 0 && <p className="muted">No spending this month yet.</p>}
          </div>
        </>
      ) : (
        <>
          <div className={styles.big}>
            <div className={styles.bigValue}>
              {money(c.actualMinor)}{' '}
              <span style={{ color: 'var(--ink-soft)', fontSize: 18 }}>
                / {money(c.targetMinor ?? 0)}
              </span>
            </div>
            <div className={styles.bigSub}>
              {Math.round(c.ratio * 100)}% to goal · +{money(planned)}/mo
              {c.goalMet ? ' · goal reached' : ''}
            </div>
          </div>
          <ProgressBar
            value={c.ratio}
            fill={fill}
            height={12}
            bordered
            label={`${money(c.actualMinor)} of ${money(c.targetMinor ?? 0)} saved`}
          />

          <Sticker tiltSeed={2} className={styles.chartCard} style={{ color: fill }}>
            <BalanceTimeline
              points={timelinePoints}
              targetMinor={jar.targetAmountMinor}
              currency={jar.currency}
              locale={locale}
            />
          </Sticker>

          {(() => {
            const series = monthlyBalanceSeries(jar, planned, withdrawals);
            const p = projectGoalDate(
              jar,
              series,
              planned,
              projMethod ? { method: projMethod } : undefined,
            );
            if (c.goalMet) return null;
            return (
              <Sticker tiltSeed={4} style={{ padding: 14 }}>
                {p ? (
                  <div className="stack" style={{ gap: 6 }}>
                    <span>
                      On track to reach {money(jar.targetAmountMinor ?? 0)} around{' '}
                      <strong>{monthLabel(p.date, locale)}</strong> —{' '}
                      {Math.max(1, Math.ceil(p.monthsRemaining))} months away.
                    </span>
                    <span className="muted" style={{ fontSize: 'var(--step-caption)' }}>
                      via {methodLabel(p.method)} · {p.confidence} confidence ·{' '}
                      {money(p.ratePerMonthMinor)}/mo
                    </span>
                    <div className="picker-row" style={{ marginTop: 2 }}>
                      {(['ema', 'regression'] as ProjectionMethod[]).map((m) => {
                        const active = (projMethod ?? p.method) === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            className="chip"
                            aria-pressed={active}
                            style={
                              active
                                ? { background: 'var(--ink)', color: 'var(--bg)' }
                                : undefined
                            }
                            onClick={() => setProjMethod(m)}
                          >
                            {methodLabel(m)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <span className="muted">
                    Not growing right now — add income or ease off withdrawals to get a
                    goal date.
                  </span>
                )}
              </Sticker>
            );
          })()}

          {!showForm ? (
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => setShowForm(true)}
            >
              Withdraw from this jar
            </button>
          ) : (
            <Sticker tiltSeed={3} style={{ padding: 16 }}>
              <div className="stack">
                <label className="field">
                  Amount ({jar.currency})
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="300"
                  />
                  {formError && <span className="error">{formError}</span>}
                </label>
                <label className="field">
                  Date
                  <input
                    type="date"
                    value={date}
                    max={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="field">
                  Reason (optional)
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. car repair"
                  />
                </label>
                <button className="btn" type="button" onClick={submitWithdrawal}>
                  Record withdrawal
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </Sticker>
          )}

          {jarWithdrawals.length > 0 && (
            <>
              <h2 className="screen-title" style={{ fontSize: 'var(--step-title)' }}>
                Withdrawals
              </h2>
              <div className="stack">
                {jarWithdrawals.map((w, i) => (
                  <Sticker key={w.id} tiltSeed={i + 1} className={styles.wrow}>
                    <span className={styles.wrowMain}>
                      <span className={styles.wrowReason}>{w.reason || 'Withdrawal'}</span>
                      <span className={styles.wrowDate}>{w.date}</span>
                    </span>
                    <span className={styles.wrowAmt}>−{money(w.amountMinor)}</span>
                    <ConfirmButton
                      compact
                      aria-label={`Delete withdrawal of ${money(w.amountMinor)} on ${w.date}`}
                      confirmLabel="Delete"
                      onConfirm={() => deleteWithdrawal(db, w.id)}
                    />
                  </Sticker>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
