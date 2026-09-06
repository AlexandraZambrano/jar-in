import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { JarsPage } from '@/features/jars/JarsPage';
import { JarEditPage } from '@/features/jars/JarEditPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PlaceholderPage } from '@/features/misc/PlaceholderPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'jars', element: <JarsPage /> },
      { path: 'jars/new', element: <JarEditPage /> },
      { path: 'jars/:id', element: <JarEditPage /> },
      { path: 'add', element: <PlaceholderPage title="Add a transaction" feature="0005-transactions" /> },
      { path: 'insights', element: <PlaceholderPage title="Insights" feature="0009-projections" /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <PlaceholderPage title="Not found" feature="the roadmap" /> },
    ],
  },
]);
