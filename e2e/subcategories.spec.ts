import { expect, test } from '@playwright/test';
import { addSpend, seedStarter } from './helpers';

// Feature 0015 — "Where it went": a flow jar's spend by sub-category, this
// month against last month.

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const THIS_MONTH = iso(today);
const LAST_MONTH = iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 15)));

test.beforeEach(async ({ page }) => {
  await seedStarter(page);
});

test('splits this month by sub-category, with last month alongside', async ({ page }) => {
  await addSpend(page, { amount: '450', note: 'Rent', subCategory: 'Rent', date: THIS_MONTH });
  await addSpend(page, { amount: '120', note: 'Supermarket', subCategory: 'Groceries', date: THIS_MONTH });
  await addSpend(page, { amount: '30', note: 'Pharmacy', date: THIS_MONTH }); // untagged
  await addSpend(page, { amount: '450', note: 'Rent', subCategory: 'Rent', date: LAST_MONTH });
  await addSpend(page, { amount: '90', note: 'Supermarket', subCategory: 'Groceries', date: LAST_MONTH });
  await addSpend(page, { amount: '65', note: 'Power bill', subCategory: 'Energy', date: LAST_MONTH });

  await page.goto('/jars');
  await page.getByRole('link', { name: /Essentials/ }).click();

  const main = page.locator('main');
  await expect(main).toContainText('Where it went');
  await expect(main).toContainText('€450.00 · 75%'); // Rent
  await expect(main).toContainText('€120.00 · 20%'); // Groceries
  await expect(main).toContainText('€30.00 · 5%'); // Uncategorised
  await expect(main).toContainText('Uncategorised');
  await expect(main).toContainText('€90.00 last month'); // Groceries
  await expect(main).toContainText('€65.00 last month'); // Energy: nothing this month…
  await expect(main).toContainText('€0.00 · 0%'); // …but it still shows
});

test('a jar with no sub-categories gets no breakdown card', async ({ page }) => {
  await addSpend(page, { amount: '20', note: 'Cinema', date: THIS_MONTH }); // goes to the first jar
  await page.goto('/jars');
  await page.getByRole('link', { name: /Joy-jar/ }).click();
  await expect(page.getByRole('heading', { name: 'This month' })).toBeVisible();
  await expect(page.getByText('Where it went')).toHaveCount(0);
});
