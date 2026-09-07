import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { Tour, type TourStep } from '@/components/Tour';
import { setPreferences } from '@/lib/preferences';
import { useOnboardingState } from '@/features/onboarding/useOnboardingState';
import { OfflineBadge } from './OfflineBadge';
import { InstallPrompt } from './InstallPrompt';

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="add"]',
    title: 'Add spending here',
    body: 'A few taps — amount, which jar, done. It updates your dashboard straight away.',
  },
  {
    selector: '[data-tour="jars"]',
    title: 'Your jars live here',
    body: 'Rename them, change the split, add sub-categories, or make new ones.',
  },
  {
    selector: '[data-tour="insights"]',
    title: 'Insights',
    body: 'Projects when your growth jars reach their goals from how they’re filling up.',
  },
  {
    selector: '[data-tour="more"]',
    title: 'Everything else',
    body: 'Dark mode, calm mode, wallets, income sources and CSV import are under here.',
  },
];

export function AppShell() {
  const { ready, welcome, tour, migrate } = useOnboardingState();

  useEffect(() => {
    if (migrate) setPreferences({ onboarding: 'done' });
  }, [migrate]);

  if (ready && welcome) return <Navigate to="/welcome" replace />;

  return (
    <div className="app-root">
      <main className="app-main">
        <OfflineBadge />
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
      {tour && (
        <Tour steps={TOUR_STEPS} onDone={() => setPreferences({ tourDone: true })} />
      )}
    </div>
  );
}
