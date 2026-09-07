import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { JarsPage } from '@/features/jars/JarsPage';
import { JarEditPage } from '@/features/jars/JarEditPage';
import { JarDetailPage } from '@/features/jars/JarDetailPage';
import { WalletsPage } from '@/features/wallets/WalletsPage';
import { WalletEditPage } from '@/features/wallets/WalletEditPage';
import { IncomePage } from '@/features/income/IncomePage';
import { IncomeEditPage } from '@/features/income/IncomeEditPage';
import { TransactionFormPage } from '@/features/transactions/TransactionFormPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { InsightsPage } from '@/features/insights/InsightsPage';
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
      { path: 'jars/:id', element: <JarDetailPage /> },
      { path: 'jars/:id/edit', element: <JarEditPage /> },
      { path: 'wallets', element: <WalletsPage /> },
      { path: 'wallets/new', element: <WalletEditPage /> },
      { path: 'wallets/:id', element: <WalletEditPage /> },
      { path: 'income', element: <IncomePage /> },
      { path: 'income/new', element: <IncomeEditPage /> },
      { path: 'income/:id', element: <IncomeEditPage /> },
      { path: 'add', element: <TransactionFormPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'transactions/:id', element: <TransactionFormPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      {
        path: '*',
        element: <PlaceholderPage title="Not found" feature="the roadmap" />,
      },
    ],
  },
]);
