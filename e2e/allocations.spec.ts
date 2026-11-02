import { expect, test } from '@playwright/test';
import { seedStarter } from './helpers';

// Feature 0013 — the allocation ledger. A jar's balance is what really posted
// each month, so changing its percentage must not reprice the past.
// Starter set: Investment holds €4,200.00 (opening €1,200 + 5 × €600).

test('changing a jar’s percentage changes the rate, not the balance already built', async ({ page }) => {
  await seedStarter(page);
  await expect(page.getByText('Growth · €4,200.00 of €10,000.00 · €600.00/mo')).toBeVisible();

  await page.goto('/jars');
  await page.getByRole('link', { name: /Investment/ }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByLabel('Percentage of income').fill('50');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/jars$/);

  // A fresh app open is when the engine runs — it must catch up, not rewrite.
  await page.goto('/');
  await expect(page.getByText('Growth · €4,200.00 of €10,000.00 · €1,200.00/mo')).toBeVisible();
  await expect(page.getByText(/€7,200\.00/), 'the old months × rate model would show this').toHaveCount(0);

  await page.reload();
  await expect(page.getByText('Growth · €4,200.00 of €10,000.00 · €1,200.00/mo')).toBeVisible();
});
