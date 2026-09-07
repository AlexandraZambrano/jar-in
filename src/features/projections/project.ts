import type { Jar, WithdrawalEvent } from '@/db/schemas';
import { addMonths, todayISO, wholeMonthsBetween } from '@/lib/date';

export type ProjectionMethod = 'ema' | 'regression';
export type Confidence = 'low' | 'medium' | 'high';

export interface Projection {
  method: ProjectionMethod;
  ratePerMonthMinor: number;
  monthsRemaining: number;
  /** YYYY-MM-DD — the ref date plus ceil(monthsRemaining), min 1 month out */
  date: string;
  confidence: Confidence;
}

/** Month-end balance at each whole month from `startedAt` to `ref` (oldest → newest).
 *  series[0] = opening balance; series.at(-1) = current balance (matches
 *  accumulationBalanceMinor in dashboard/compute.ts). */
export function monthlyBalanceSeries(
  jar: Jar,
  plannedPerMonthMinor: number,
  withdrawals: WithdrawalEvent[],
  ref: string = todayISO(),
): number[] {
  const start = jar.startedAt.slice(0, 10);
  const n = wholeMonthsBetween(start, ref);
  const jw = withdrawals.filter((w) => w.jarId === jar.id);
  const series: number[] = [];
  for (let k = 0; k <= n; k++) {
    const asOf = addMonths(start, k);
    const contributed = jar.openingBalanceMinor + k * plannedPerMonthMinor;
    const withdrawn = jw
      .filter((w) => w.date.slice(0, 10) <= asOf)
      .reduce((s, w) => s + w.amountMinor, 0);
    series.push(Math.max(0, contributed - withdrawn));
  }
  return series;
}

function leastSquaresSlope(ys: number[]): number {
  const n = ys.length;
  const sx = (n * (n - 1)) / 2;
  const sxx = ((n - 1) * n * (2 * n - 1)) / 6;
  const sy = ys.reduce((a, b) => a + b, 0);
  const sxy = ys.reduce((a, y, i) => a + i * y, 0);
  const denom = n * sxx - sx * sx;
  return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

function ema(values: number[], alpha: number): number {
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = alpha * values[i] + (1 - alpha) * e;
  return e;
}

function confidenceFor(deltas: number[]): Confidence {
  if (deltas.length < 2) return 'low';
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  if (mean <= 0) return 'low';
  const variance =
    deltas.reduce((a, d) => a + (d - mean) ** 2, 0) / deltas.length;
  const cv = Math.sqrt(variance) / Math.abs(mean);
  if (deltas.length >= 4 && cv < 0.35) return 'high';
  if (cv < 0.75) return 'medium';
  return 'low';
}

/** Estimate when an accumulation jar reaches its target.
 *  Returns null when there is no target, it is already met, or the jar is not
 *  growing (estimated rate ≤ 0). */
export function projectGoalDate(
  jar: Jar,
  monthlyBalances: number[],
  plannedContributionMinor: number,
  opts?: { method?: ProjectionMethod; ref?: string },
): Projection | null {
  const target = jar.targetAmountMinor;
  if (!target || target <= 0) return null;

  const current = monthlyBalances.at(-1) ?? jar.openingBalanceMinor;
  if (current >= target) return null;

  const deltas: number[] = [];
  for (let i = 1; i < monthlyBalances.length; i++) {
    deltas.push(monthlyBalances[i] - monthlyBalances[i - 1]);
  }

  const enoughHistory = deltas.length >= 2;
  const method: ProjectionMethod =
    opts?.method ?? (deltas.length >= 4 ? 'regression' : 'ema');

  let rate: number;
  if (enoughHistory) {
    rate =
      method === 'regression'
        ? leastSquaresSlope(monthlyBalances)
        : ema(deltas, 0.5);
  } else {
    rate = plannedContributionMinor;
  }
  rate = Math.round(rate);
  if (rate <= 0) return null;

  const monthsRemaining = (target - current) / rate;
  const ref = opts?.ref ?? todayISO();
  const date = addMonths(ref, Math.max(1, Math.ceil(monthsRemaining)));

  return {
    method: enoughHistory ? method : 'ema',
    ratePerMonthMinor: rate,
    monthsRemaining,
    date,
    confidence: confidenceFor(deltas),
  };
}

export function methodLabel(m: ProjectionMethod): string {
  return m === 'ema' ? 'moving average' : 'trend line';
}
