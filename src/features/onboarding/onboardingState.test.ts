import { describe, expect, it } from 'vitest';
import { firstRunDecision } from './onboardingState';

const base = { ready: true, jarCount: 4, onboarding: 'done' as const, tourDone: true };

describe('firstRunDecision', () => {
  it('does nothing until the query is ready', () => {
    expect(firstRunDecision({ ...base, ready: false, jarCount: 0, onboarding: 'pending' })).toEqual(
      { welcome: false, tour: false, migrate: false },
    );
  });

  it('welcomes a brand-new user (no jars, onboarding pending)', () => {
    const d = firstRunDecision({ ...base, jarCount: 0, onboarding: 'pending', tourDone: false });
    expect(d.welcome).toBe(true);
    expect(d.tour).toBe(false);
  });

  it('runs the tour once after onboarding is recorded', () => {
    expect(firstRunDecision({ ...base, onboarding: 'done', tourDone: false }).tour).toBe(true);
    expect(firstRunDecision({ ...base, onboarding: 'skipped', tourDone: false }).tour).toBe(true);
    expect(firstRunDecision({ ...base, onboarding: 'done', tourDone: true }).tour).toBe(false);
  });

  it('migrates a pre-existing user (has jars, onboarding pending)', () => {
    const d = firstRunDecision({ ...base, onboarding: 'pending' });
    expect(d.migrate).toBe(true);
    expect(d.welcome).toBe(false);
  });
});
