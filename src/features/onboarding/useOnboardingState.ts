import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import { usePreferences } from '@/lib/preferences';
import type { Jar } from '@/db/schemas';
import { firstRunDecision, type FirstRunDecision } from './onboardingState';

export function useOnboardingState(): FirstRunDecision & { ready: boolean } {
  const db = useDb();
  const prefs = usePreferences();
  const { data: jars, loading } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const decision = firstRunDecision({
    ready: !loading,
    jarCount: jars.length,
    onboarding: prefs.onboarding,
    tourDone: prefs.tourDone,
  });
  return { ...decision, ready: !loading };
}
