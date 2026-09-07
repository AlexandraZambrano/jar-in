import { expect, test } from '@playwright/test';
import { seedStarter } from './helpers';

// Feature 0006 / 0012 — theme + accessibility toggles are mirrored onto <html>
// and persisted to localStorage.

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
});

test('theme and a11y toggles reflect on <html> and persist', async ({ page }) => {
  const html = page.locator('html');
  await page.goto('/settings');

  await page.getByLabel('Dark', { exact: true }).check();
  await expect(html).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('checkbox', { name: /^Calm mode/ }).check();
  await expect(html).toHaveAttribute('data-a11y', /calm/);

  await page.getByRole('checkbox', { name: /^Colour-blind safe/ }).check();
  await expect(html).toHaveAttribute('data-a11y', /cvd/);

  // Survives a reload.
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-a11y', /calm/);
  await expect(html).toHaveAttribute('data-a11y', /cvd/);
});
