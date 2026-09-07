import { describe, expect, it } from 'vitest';
import { proposeJars, proposalTotal, type OnboardingAnswers } from './proposeJars';

const answers = (p: Partial<OnboardingAnswers>): OnboardingAnswers => ({
  incomeMajor: null,
  currency: 'EUR',
  rentMajor: null,
  utilitiesMajor: null,
  groceriesMajor: null,
  debtMajor: null,
  savesAlready: null,
  ...p,
});

describe('proposeJars', () => {
  const cases: [string, Partial<OnboardingAnswers>][] = [
    ['no answers at all', {}],
    ['income only', { incomeMajor: 2000 }],
    ['typical', { incomeMajor: 2400, rentMajor: 800, utilitiesMajor: 150, groceriesMajor: 300 }],
    ['very high rent', { incomeMajor: 2000, rentMajor: 1400, utilitiesMajor: 200, groceriesMajor: 350 }],
    ['has debt', { incomeMajor: 2400, rentMajor: 700, utilitiesMajor: 120, groceriesMajor: 280, debtMajor: 300 }],
    ['already saves a lot', { incomeMajor: 3000, rentMajor: 600, utilitiesMajor: 100, groceriesMajor: 250, savesAlready: 'yes-a-lot' }],
    ['saves a bit + debt', { incomeMajor: 2200, rentMajor: 750, utilitiesMajor: 130, groceriesMajor: 260, debtMajor: 180, savesAlready: 'yes-a-bit' }],
    ['zero income, has spend + debt', { incomeMajor: 0, rentMajor: 500, debtMajor: 100 }],
  ];

  it.each(cases)('sums to exactly 100 — %s', (_label, a) => {
    expect(proposalTotal(proposeJars(answers(a)))).toBe(100);
  });

  it('always includes Essentials, Safe fund and Joy-jar', () => {
    const keys = proposeJars(answers({})).map((j) => j.key);
    expect(keys).toEqual(expect.arrayContaining(['essentials', 'safe', 'joy']));
  });

  it('adds a Debt jar only when there are debt repayments', () => {
    expect(proposeJars(answers({ debtMajor: 0 })).some((j) => j.key === 'debt')).toBe(false);
    expect(proposeJars(answers({ debtMajor: 200, incomeMajor: 2000 })).some((j) => j.key === 'debt')).toBe(true);
  });

  it('adds an Investment jar only when the user already saves', () => {
    expect(proposeJars(answers({ savesAlready: 'not-yet' })).some((j) => j.key === 'investment')).toBe(false);
    expect(proposeJars(answers({ savesAlready: 'yes-a-lot' })).some((j) => j.key === 'investment')).toBe(true);
  });

  it('keeps Essentials within 35–60% and honours the 5% Joy floor', () => {
    const ess = proposeJars(
      answers({ incomeMajor: 2000, rentMajor: 1500, utilitiesMajor: 300, groceriesMajor: 400 }),
    ).find((j) => j.key === 'essentials')!;
    expect(ess.percentage).toBeLessThanOrEqual(60);
    expect(ess.percentage).toBeGreaterThanOrEqual(25); // 35 unless clawed back for Joy

    const joy = proposeJars(
      answers({ incomeMajor: 2000, rentMajor: 1500, utilitiesMajor: 300, groceriesMajor: 400, savesAlready: 'yes-a-lot' }),
    ).find((j) => j.key === 'joy')!;
    expect(joy.percentage).toBeGreaterThanOrEqual(5);
  });

  it('caps the proposed Joy-jar and steers the surplus into the safe fund', () => {
    const jars = proposeJars(
      answers({ incomeMajor: 2400, rentMajor: 700, utilitiesMajor: 100, groceriesMajor: 250 }),
    );
    const joy = jars.find((j) => j.key === 'joy')!;
    const safe = jars.find((j) => j.key === 'safe')!;
    expect(joy.percentage).toBeLessThanOrEqual(20);
    expect(safe.percentage).toBeGreaterThan(15); // got the surplus
  });

  it('gives every accumulation jar a positive target', () => {
    for (const a of cases) {
      for (const j of proposeJars(answers(a[1]))) {
        if (j.type === 'accumulation') expect(j.targetMajor ?? 0).toBeGreaterThan(0);
      }
    }
  });
});
