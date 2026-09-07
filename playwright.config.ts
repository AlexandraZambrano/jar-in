import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config — runs the specs in `e2e/` against a production build served by
 * `vite preview` (the service worker is disabled under `npm run dev`, so the
 * preview build is the honest target). See docs/DEPLOYMENT.md.
 */
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['github'], ['html', { open: 'never' }], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // The app is a portrait-phone PWA; test it at that size.
    viewport: { width: 390, height: 844 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } }],

  webServer: {
    // Self-contained: build then serve, so `npm run e2e` works with no preamble.
    command: 'npm run build && npm run preview',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
