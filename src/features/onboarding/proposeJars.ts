import type { JarPattern, JarType } from '@/db/schemas';
import { JAR_PALETTE } from '@/features/jars/jarPalette';

export type SavesAlready = 'yes-a-lot' | 'yes-a-bit' | 'not-yet';

export interface OnboardingAnswers {
  incomeMajor: number | null;
  currency: string;
  rentMajor: number | null;
  utilitiesMajor: number | null;
  groceriesMajor: number | null;
  debtMajor: number | null;
  savesAlready: SavesAlready | null;
}

export interface ProposedJar {
  key: string;
  name: string;
  type: JarType;
  percentage: number;
  color: string;
  pattern: JarPattern;
  icon: string;
  /** major units */
  targetMajor?: number;
  subCategories?: string[];
}

const P = Object.fromEntries(JAR_PALETTE.map((e) => [e.key, e]));

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round5 = (n: number) => Math.round(n / 5) * 5;
const round100 = (n: number) => Math.round(n / 100) * 100;

/** Deterministic starting jar set. Always sums to exactly 100%. Rule-based in
 *  v1; the Groq agent (Phase 3) reuses this as its fallback + validator. */
export function proposeJars(a: OnboardingAnswers): ProposedJar[] {
  const income = Math.max(0, a.incomeMajor ?? 0);
  const essSpend =
    Math.max(0, a.rentMajor ?? 0) +
    Math.max(0, a.utilitiesMajor ?? 0) +
    Math.max(0, a.groceriesMajor ?? 0);
  const debt = Math.max(0, a.debtMajor ?? 0);
  const saves = a.savesAlready ?? 'not-yet';

  let essentials =
    income > 0 ? clamp(round5((essSpend / income) * 100), 35, 60) : 50;

  let debtPct = 0;
  if (debt > 0) {
    debtPct = income > 0 ? clamp(round5((debt / income) * 100), 5, 20) : 10;
  }

  const safePct = saves === 'yes-a-lot' ? 5 : saves === 'yes-a-bit' ? 10 : 15;
  let investPct = saves === 'yes-a-lot' ? 20 : saves === 'yes-a-bit' ? 10 : 0;

  let safe = safePct;
  let joy = 100 - (essentials + debtPct + safe + investPct);

  // Joy-jar floored at 5%: claw back from essentials (to a 25% floor), then
  // investment, then the safe fund.
  if (joy < 5) {
    let need = 5 - joy;
    const fromEss = Math.min(need, Math.max(0, essentials - 25));
    essentials -= fromEss;
    need -= fromEss;
    const fromInv = Math.min(need, investPct);
    investPct -= fromInv;
    need -= fromInv;
    safe = Math.max(0, safe - need);
    joy = 100 - (essentials + debtPct + safe + investPct);
  }
  joy = Math.max(5, joy);

  // Coaching: don't propose a huge "fun money" jar — steer the surplus into the
  // safe fund instead (people can still bump Joy up in the review).
  const JOY_SOFT_CAP = 20;
  if (joy > JOY_SOFT_CAP) {
    safe += joy - JOY_SOFT_CAP;
    joy = JOY_SOFT_CAP;
  }

  // Absorb any rounding drift into Joy so the total is exactly 100.
  const drift = 100 - (essentials + debtPct + safe + investPct + joy);
  joy += drift;

  const essBasis = essSpend > 0 ? essSpend : (income * essentials) / 100;
  const safeTarget = round100(3 * (essBasis || income * 0.5 || 1000)) || 1000;

  const jars: ProposedJar[] = [
    {
      key: 'essentials',
      name: 'Essentials',
      type: 'flow',
      percentage: essentials,
      color: P.essentials.candy,
      pattern: P.essentials.pattern,
      icon: P.essentials.icon,
      subCategories: ['Rent', 'Energy', 'Water', 'Groceries'],
    },
  ];

  if (debtPct > 0) {
    jars.push({
      key: 'debt',
      name: 'Debt',
      type: 'flow',
      percentage: debtPct,
      color: P.other.candy,
      pattern: P.other.pattern,
      icon: P.other.icon,
    });
  }

  jars.push({
    key: 'safe',
    name: 'Safe fund',
    type: 'accumulation',
    percentage: safe,
    color: P.safe.candy,
    pattern: P.safe.pattern,
    icon: P.safe.icon,
    targetMajor: safeTarget,
  });

  if (investPct > 0) {
    const monthlyInvest = (income * investPct) / 100;
    jars.push({
      key: 'investment',
      name: 'Investment',
      type: 'accumulation',
      percentage: investPct,
      color: P.investment.candy,
      pattern: P.investment.pattern,
      icon: P.investment.icon,
      targetMajor: round100(Math.max(1000, monthlyInvest * 24)),
    });
  }

  jars.push({
    key: 'joy',
    name: 'Joy-jar',
    type: 'flow',
    percentage: joy,
    color: P.joy.candy,
    pattern: P.joy.pattern,
    icon: P.joy.icon,
  });

  return jars;
}

export function proposalTotal(jars: ProposedJar[]): number {
  return Math.round(jars.reduce((s, j) => s + j.percentage, 0) * 10) / 10;
}
