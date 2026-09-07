import { expect, test } from '@playwright/test';
import { seedStarter, trackNativeDialogs } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
});

async function addTransaction(page: import('@playwright/test').Page, note: string) {
  await page.goto('/add');
  // Keypad: 1, 2, ., 5, 0  ->  12.50
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('button', { name: 'Decimal point' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await page.getByLabel('Note (optional)').fill(note);
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page).toHaveURL((u) => new URL(u).pathname === '/');
}

test('add a transaction with the keypad — it shows in the history', async ({ page }) => {
  await addTransaction(page, 'Coffee run');

  await page.goto('/transactions');
  await expect(
    page.getByRole('button', { name: /Coffee run.*€12\.50/ }),
  ).toBeVisible();
});

test('deleting a transaction never opens a native dialog', async ({ page }) => {
  const dialogs = trackNativeDialogs(page);
  await addTransaction(page, 'Bus ticket');

  await page.goto('/transactions');
  await page.getByRole('button', { name: /Bus ticket/ }).click();
  await expect(page).toHaveURL(/\/transactions\/[\w-]+$/);

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Really delete?' }).click();

  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole('button', { name: /Bus ticket/ })).toHaveCount(0);
  expect(dialogs.count, `native dialog shown: ${dialogs.last}`).toBe(0);
});
