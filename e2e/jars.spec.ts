import { expect, test } from '@playwright/test';
import { seedStarter, trackNativeDialogs } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
});

test('create a jar — it appears in the list', async ({ page }) => {
  await page.goto('/jars');
  await page.getByRole('link', { name: 'New jar' }).click();

  await page.getByLabel('Name', { exact: true }).fill('Travel fund');
  await page.getByLabel('Percentage of income').fill('0');
  await page.getByRole('button', { name: 'Create jar' }).click();

  await expect(page).toHaveURL(/\/jars$/);
  await expect(page.getByText('Travel fund')).toBeVisible();
});

test('flow-jar opening balance round-trips through a save (0012 regression)', async ({
  page,
}) => {
  await page.goto('/jars');
  await page.getByRole('link', { name: /Essentials/ }).click();
  await page.getByRole('link', { name: 'Edit' }).click();

  const opening = page.getByLabel(/Opening balance/);
  await expect(opening).toHaveValue('');
  await opening.fill('200');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\/jars$/);

  // Re-open the editor: the value must have persisted.
  await page.getByRole('link', { name: /Essentials/ }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByLabel(/Opening balance/)).toHaveValue('200');
});

test('deleting a jar never opens a native dialog', async ({ page }) => {
  const dialogs = trackNativeDialogs(page);

  await page.goto('/jars');
  await page.getByRole('link', { name: /Joy-jar/ }).click();
  await page.getByRole('link', { name: 'Edit' }).click();

  await page.getByRole('button', { name: 'Delete jar' }).click();
  await page.getByRole('button', { name: 'Really delete this jar?' }).click();

  await expect(page).toHaveURL(/\/jars$/);
  await expect(page.getByText('Joy-jar')).toHaveCount(0);
  expect(dialogs.count, `native dialog shown: ${dialogs.last}`).toBe(0);
});
