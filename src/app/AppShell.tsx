import { Outlet } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';

export function AppShell() {
  return (
    <div className="app-root">
      <main className="app-main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
