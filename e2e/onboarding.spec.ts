import { expect, test } from '@playwright/test';

// Feature 0011 — first-run onboarding. A fresh context has an empty DB, so the
// app must route to /welcome and only leave it once jars exist.

test('a new user is sent to the welcome flow', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByText('Welcome to Jars')).toBeVisible();
});

test('skip path seeds a starter set and lands on the dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip — use a starter set' }).click();

  await expect(page).toHaveURL((u) => new URL(u).pathname === '/');
  await expect(page.getByRole('heading', { name: 'Your jars' })).toBeVisible();
  await expect(page.getByText(/balanced at 100%/i)).toBeVisible();

  // Reopening the app no longer bounces to /welcome.
  await page.goto('/');
  await expect(page).toHaveURL((u) => new URL(u).pathname === '/');
});

test('questionnaire builds a jar split that sums to 100%', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Answer a few questions' }).click();

  await page.getByLabel('What’s your monthly take-home pay?').fill('2500');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Roughly, rent or mortgage each month?').fill('900');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('And monthly utilities?').fill('180');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Monthly groceries?').fill('320');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Skip this one' }).click(); // debt
  await page.getByRole('button', { name: 'A little' }).click();
  await page.getByRole('button', { name: 'See my jars' }).click();

  const confirm = page.getByRole('button', { name: 'Looks good, start' });
  await expect(confirm).toBeVisible();
  await confirm.click();

  await expect(page).toHaveURL((u) => new URL(u).pathname === '/');
  await page.goto('/jars');
  await expect(page.getByText('100%', { exact: true })).toBeVisible();
});
