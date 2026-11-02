import { expect, test } from '@playwright/test';
import { seedStarter, trackNativeDialogs } from './helpers';

// Feature 0007 — withdrawing from a growth jar. The starter set's Safe fund
// holds €2,600.00 of €5,000.00 (opening + 5 monthly allocations).

const BEFORE = /€2,600\.00\s+\/\s+€5,000\.00/;
const AFTER = /€2,300\.00\s+\/\s+€5,000\.00/;

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
  await page.goto('/jars');
  await page.getByRole('link', { name: /Safe fund/ }).click();
  await expect(page.getByText(BEFORE)).toBeVisible();
});

test('a withdrawal lowers the balance and is listed with its reason', async ({ page }) => {
  await page.getByRole('button', { name: 'Withdraw from this jar' }).click();
  await page.getByLabel(/Amount/).fill('300');
  await page.getByLabel('Reason (optional)').fill('Car repair');
  await page.getByRole('button', { name: 'Record withdrawal' }).click();

  await expect(page.getByText(AFTER)).toBeVisible();
  await expect(page.getByText('Car repair', { exact: true })).toBeVisible();
  await expect(page.getByText('−€300.00', { exact: true })).toBeVisible();
});

test('deleting a withdrawal restores the balance, with no native dialog', async ({ page }) => {
  const dialogs = trackNativeDialogs(page);
  await page.getByRole('button', { name: 'Withdraw from this jar' }).click();
  await page.getByLabel(/Amount/).fill('300');
  await page.getByLabel('Reason (optional)').fill('Car repair');
  await page.getByRole('button', { name: 'Record withdrawal' }).click();
  await expect(page.getByText(AFTER)).toBeVisible();

  await page.getByRole('button', { name: /Delete withdrawal of €300\.00/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText(BEFORE)).toBeVisible();
  await expect(page.getByText('Car repair', { exact: true })).toHaveCount(0);
  expect(dialogs.count, `native dialog shown: ${dialogs.last}`).toBe(0);
});
