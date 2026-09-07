import type { IncomeSource, Jar, Transaction, WithdrawalEvent } from '@/db/schemas';
import type { IncomeFrequency } from '@/db/schemas';
import { isSameMonth, nowISO, wholeMonthsBetween } from '@/lib/date';

const MONTHLY_FACTOR: Record<IncomeFrequency, number> = {
  monthly: 1,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  yearly: 1 / 12,
  once: 0,
};

export interface MonthlyIncome {
  minor: number;
  currencies: string[];
  mixedCurrency: boolean;
  hasOnce: boolean;
}

export function monthlyIncome(sources: IncomeSource[]): MonthlyIncome {
  const active = sources.filter((s) => s.active);
  const recurring = active.filter((s) => s.frequency !== 'once');
  const currencies = [...new Set(recurring.map((s) => s.currency))];
  const minor = recurring.reduce(
    (sum, s) => sum + Math.round(s.amountMinor * MONTHLY_FACTOR[s.frequency]),
    0,
  );
  return {
    minor,
    currencies,
    mixedCurrency: currencies.length > 1,
    hasOnce: active.some((s) => s.frequency === 'once'),
  };
}

export function jarPlannedMinor(jar: Jar, monthlyIncomeMinor: number): number {
  return Math.round((monthlyIncomeMinor * jar.percentage) / 100);
}

export function flowSpentThisMonthMinor(
  jarId: string,
  transactions: Transaction[],
  ref: string = nowISO(),
): number {
  return transactions
    .filter((t) => t.jarId === jarId && isSameMonth(t.date, ref))
    .reduce((s, t) => s + t.amountMinor, 0);
}

export function accumulationBalanceMinor(
  jar: Jar,
  plannedPerMonthMinor: number,
  withdrawals: WithdrawalEvent[],
  ref: string = nowISO(),
): number {
  const months = wholeMonthsBetween(jar.startedAt, ref);
  const contributed = jar.openingBalanceMinor + months * plannedPerMonthMinor;
  const withdrawn = withdrawals
    .filter((w) => w.jarId === jar.id)
    .reduce((s, w) => s + w.amountMinor, 0);
  return Math.max(0, contributed - withdrawn);
}

export interface PlanHealth {
  total: number;
  delta: number;
  balanced: boolean;
}

export function planHealth(jars: Jar[]): PlanHealth {
  const total = Math.round(jars.reduce((s, j) => s + j.percentage, 0) * 10) / 10;
  return { total, delta: Math.round((total - 100) * 10) / 10, balanced: total === 100 };
}

export interface JarComputed {
  jar: Jar;
  plannedMinor: number;
  actualMinor: number;
  targetMinor: number | null;
  ratio: number;
  over: boolean;
  goalMet: boolean;
}

export function computeJar(
  jar: Jar,
  monthlyIncomeMinor: number,
  transactions: Transaction[],
  withdrawals: WithdrawalEvent[],
  ref: string = nowISO(),
): JarComputed {
  const plannedMinor = jarPlannedMinor(jar, monthlyIncomeMinor);
  if (jar.type === 'flow') {
    const actualMinor = flowSpentThisMonthMinor(jar.id, transactions, ref);
    const ratio = plannedMinor > 0 ? actualMinor / plannedMinor : 0;
    return {
      jar,
      plannedMinor,
      actualMinor,
      targetMinor: plannedMinor,
      ratio,
      over: actualMinor > plannedMinor && plannedMinor > 0,
      goalMet: false,
    };
  }
  const actualMinor = accumulationBalanceMinor(jar, plannedMinor, withdrawals, ref);
  const targetMinor = jar.targetAmountMinor;
  const ratio = targetMinor && targetMinor > 0 ? actualMinor / targetMinor : 0;
  return {
    jar,
    plannedMinor,
    actualMinor,
    targetMinor,
    ratio,
    over: false,
    goalMet: !!targetMinor && actualMinor >= targetMinor,
  };
}

export interface CoachNotable {
  jarName: string;
  deltaMonths: number;
  direction: 'sooner' | 'later';
}

export function coachMessage(health: PlanHealth, notable?: CoachNotable | null): string {
  if (notable) {
    const m = `${notable.deltaMonths} month${notable.deltaMonths === 1 ? '' : 's'}`;
    return `${notable.jarName} now reaches its goal ${m} ${notable.direction} than before.`;
  }
  if (health.balanced) return 'Your plan is balanced at 100%. Nice.';
  if (health.delta > 0) {
    return `Your jars add up to ${health.total}% — that's ${health.delta}% over. Trim a jar, or the extra won't be funded.`;
  }
  return `Your jars use ${health.total}% of income. ${-health.delta}% is unallocated — send it to a jar or grow your Safe fund.`;
}
