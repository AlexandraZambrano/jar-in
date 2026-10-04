import type { AllocationEvent, IncomeSource, Jar, Transaction, WithdrawalEvent } from '@/db/schemas';
import type { IncomeFrequency } from '@/db/schemas';
import { isSameMonth, nowISO } from '@/lib/date';
import { convertMinor } from '@/lib/money';

function sumForJar(jarId: string, events: { jarId: string; amountMinor: number }[]): number {
  return events.filter((e) => e.jarId === jarId).reduce((s, e) => s + e.amountMinor, 0);
}

const MONTHLY_FACTOR: Record<IncomeFrequency, number> = {
  monthly: 1,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  yearly: 1 / 12,
  once: 0,
};

export interface MonthlyIncome {
  /** In the home currency. */
  minor: number;
  /** Foreign currencies included via an FX rate. */
  converted: string[];
  /** Foreign currencies with no rate yet — left out of `minor`. */
  unconverted: string[];
  hasOnce: boolean;
}

/** Active recurring income per month, in `home`. Foreign sources convert at
 *  `rates` (home-based, see `convertMinor`); ones with no rate are left out
 *  and listed in `unconverted` rather than summed raw. */
export function monthlyIncome(
  sources: IncomeSource[],
  home: string,
  rates: Record<string, number>,
): MonthlyIncome {
  const active = sources.filter((s) => s.active);
  const converted = new Set<string>();
  const unconverted = new Set<string>();
  let minor = 0;
  for (const s of active) {
    if (s.frequency === 'once') continue;
    const inHome = convertMinor(
      Math.round(s.amountMinor * MONTHLY_FACTOR[s.frequency]),
      s.currency,
      home,
      rates,
    );
    if (inHome == null) {
      unconverted.add(s.currency);
      continue;
    }
    minor += inHome;
    if (s.currency !== home) converted.add(s.currency);
  }
  return {
    minor,
    converted: [...converted],
    unconverted: [...unconverted],
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
  allocations: AllocationEvent[],
  withdrawals: WithdrawalEvent[],
): number {
  const contributed = jar.openingBalanceMinor + sumForJar(jar.id, allocations);
  const withdrawn = sumForJar(jar.id, withdrawals);
  return Math.max(0, contributed - withdrawn);
}

/** Flow jar treated as a running account: opening + every posted allocation
 *  credited, every transaction debited. How far ahead/behind you are over
 *  time. */
export function flowRunningBalanceMinor(
  jar: Jar,
  allocations: AllocationEvent[],
  transactions: Transaction[],
): number {
  const credited = jar.openingBalanceMinor + sumForJar(jar.id, allocations);
  const spent = sumForJar(jar.id, transactions);
  return Math.max(0, credited - spent);
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
  allocations: AllocationEvent[] = [],
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
  const actualMinor = accumulationBalanceMinor(jar, allocations, withdrawals);
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

/** One line on how foreign income was handled, or null when there was none. */
export function fxNote(inc: MonthlyIncome): string | null {
  const parts: string[] = [];
  if (inc.converted.length) {
    parts.push(`Includes ${inc.converted.join(', ')} income at today’s ECB rate.`);
  }
  if (inc.unconverted.length) {
    parts.push(
      `No exchange rate yet for ${inc.unconverted.join(', ')} — that income is left out of the total until you’re online.`,
    );
  }
  return parts.length ? parts.join(' ') : null;
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
