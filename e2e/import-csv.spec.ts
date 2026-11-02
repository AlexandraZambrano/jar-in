import { expect, test, type Page } from '@playwright/test';
import { seedStarter } from './helpers';

// Feature 0008 — CSV import: pick a file → check the columns → preview → import.
// Parsing happens on the device; nothing is uploaded.

const CSV = [
  'Booking Date;Description;Amount',
  '01/06/2026;Tesco groceries;-42,10',
  '03/06/2026;Coffee shop;-3,80',
  '05/06/2026;Salary June;1500,00', // positive = income → skipped
  'not-a-date;Broken row;-9,99', // unreadable
].join('\n');

async function chooseFile(page: Page) {
  await page.locator('input[type=file]').setInputFiles({
    name: 'june.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV),
  });
}

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
  await page.goto('/transactions/import');
});

test('imports the expenses, skips income and unreadable rows', async ({ page }) => {
  await chooseFile(page);
  await expect(page.getByText('june.csv · 4 rows')).toBeVisible();

  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(
    page.getByText('2 to import · 1 look like income, skipped · 1 unreadable'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Import 2 transactions' }).click();
  await expect(page.getByText('Imported 2 transactions.')).toBeVisible();

  await page.getByRole('button', { name: 'See transactions' }).click();
  await expect(page.getByRole('button', { name: /Tesco groceries.*€42\.10/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Coffee shop.*€3\.80/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Salary June/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Broken row/ })).toHaveCount(0);
});

test('importing the same file again adds nothing', async ({ page }) => {
  await chooseFile(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await page.getByRole('button', { name: 'Import 2 transactions' }).click();
  await expect(page.getByText('Imported 2 transactions.')).toBeVisible();

  await page.getByRole('button', { name: 'Import another file' }).click();
  await chooseFile(page);
  await page.getByRole('button', { name: 'Preview', exact: true }).click();
  await expect(page.getByText(/0 to import · 2 already imported this session/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Import 0 transactions$/ })).toBeDisabled();
});
