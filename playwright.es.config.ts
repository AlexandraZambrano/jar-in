import { defineConfig, devices } from '@playwright/test';

/**
 * Real-Elasticsearch specs (`e2e-es/`), separate from the app e2e suite: they
 * need a running node (`npm run es:up`) and run once per browser engine, since
 * the thing under test is how each engine treats a page calling localhost.
 * See docs/ELASTICSEARCH.md and docs/features/0016-elasticsearch-connector.md.
 */
export default defineConfig({
  testDir: './e2e-es',
  workers: 1, // one shared index; engines run one after another
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  globalSetup: './e2e-es/global-setup.ts',
  projects: [
    // Chromium gates "public page -> localhost" behind a one-time user
    // permission (Local Network Access). This project is the user who said yes…
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['local-network-access'] },
    },
    // …and this one is the user who hasn't been asked / said no.
    { name: 'chromium-no-permission', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
