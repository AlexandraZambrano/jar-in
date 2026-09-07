import type { OnboardingState } from '@/lib/preferences';

export interface FirstRunInput {
  ready: boolean; // the jars query has resolved at least once
  jarCount: number;
  onboarding: OnboardingState;
  tourDone: boolean;
}

export interface FirstRunDecision {
  /** send the user to /welcome */
  welcome: boolean;
  /** run the coach-mark tour over the app */
  tour: boolean;
  /** an existing user (jars, but onboarding never recorded) — mark it done */
  migrate: boolean;
}

export function firstRunDecision(i: FirstRunInput): FirstRunDecision {
  if (!i.ready) return { welcome: false, tour: false, migrate: false };
  const empty = i.jarCount === 0;
  return {
    welcome: empty && i.onboarding === 'pending',
    tour: !empty && i.onboarding !== 'pending' && !i.tourDone,
    migrate: !empty && i.onboarding === 'pending',
  };
}
