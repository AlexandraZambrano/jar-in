import { expect, test, type Page } from '@playwright/test';
import { seedStarter } from './helpers';

// Feature 0014 — foreign-currency income is converted into the jars' currency
// at a cached ECB rate (Frankfurter). The network is stubbed, so it is
// deterministic: €1 = $1.25, hence $1,000 = €800.

async function addUsdIncome(page: Page) {
  await page.goto('/income/new');
  await page.getByLabel('Name').fill('Freelance');
  await page.getByLabel('Amount').fill('1000');
  await page.getByLabel('Currency').selectOption('USD');
  await page.getByRole('button', { name: 'Create income source' }).click();
  await expect(page).toHaveURL(/\/income$/);
}

test('foreign income is converted at the rate, and fetched only when needed', async ({ page }) => {
  const rateRequests: string[] = [];
  await page.route('https://api.frankfurter.dev/**', (route) => {
    rateRequests.push(route.request().url());
    return route.fulfill({ json: { base: 'EUR', rates: { USD: 1.25 } } });
  });

  await seedStarter(page);
  expect(rateRequests, 'an all-EUR setup must not call the rate API').toHaveLength(0);

  await addUsdIncome(page);
  await expect(page.getByText('€3,200.00 / mo')).toBeVisible(); // €2,400 + $1,000 → €800
  await expect(page.getByText('Includes USD income at today’s ECB rate.')).toBeVisible();

  await page.goto('/'); // a fresh app open: the cached rate is under a day old
  await expect(page.getByText('Includes USD income at today’s ECB rate.')).toBeVisible();
  expect(rateRequests).toEqual(['https://api.frankfurter.dev/v1/latest?base=EUR']);
});

test('without a rate the foreign income is left out, and the app says so', async ({ page }) => {
  await page.route('https://api.frankfurter.dev/**', (route) => route.abort());

  await seedStarter(page);
  await addUsdIncome(page);

  await expect(page.getByText('€2,400.00 / mo', { exact: true })).toBeVisible(); // not summed raw
  await expect(page.getByText(/No exchange rate yet for USD/)).toBeVisible();
});
