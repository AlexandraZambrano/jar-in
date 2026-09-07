import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBadge } from './OfflineBadge';
import { InstallPrompt } from './InstallPrompt';

export function AppShell() {
  return (
    <div className="app-root">
      <main className="app-main">
        <OfflineBadge />
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
