import { expect, type Page } from '@playwright/test';

/**
 * Walk the first-run "Skip — use a starter set" path so the on-device DB holds
 * the example jar set, then suppress the app tour that would otherwise open.
 * Every context starts with an empty IndexedDB, so call this in `beforeEach`
 * for any spec that needs data.
 */
export async function seedStarter(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip — use a starter set' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('jarin.preferences') || '{}');
    localStorage.setItem(
      'jarin.preferences',
      JSON.stringify({ ...p, tourDone: true }),
    );
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your jars' })).toBeVisible();
}

/**
 * Records any native `alert` / `confirm` / `prompt` the page opens. Destructive
 * actions use `<ConfirmButton>` precisely so none ever appear — assert
 * `dialogs.count === 0` after exercising a delete.
 */
export function trackNativeDialogs(page: Page): { count: number; last: string } {
  const state = { count: 0, last: '' };
  page.on('dialog', (d) => {
    state.count += 1;
    state.last = `${d.type()}: ${d.message()}`;
    void d.dismiss().catch(() => {});
  });
  return state;
}

/** Record a spend through the keypad, like a person would. `amount` is typed
 *  digit by digit ("12.50"); `date` is YYYY-MM-DD (defaults to today). */
export async function addSpend(
  page: Page,
  o: { amount: string; note: string; subCategory?: string; date?: string },
): Promise<void> {
  await page.goto('/add');
  for (const ch of o.amount) {
    await page
      .getByRole('button', ch === '.' ? { name: 'Decimal point' } : { name: ch, exact: true })
      .click();
  }
  if (o.subCategory) {
    await page.getByLabel('Sub-category (optional)').selectOption({ label: o.subCategory });
  }
  if (o.date) await page.getByLabel('Date').fill(o.date);
  await page.getByLabel('Note (optional)').fill(o.note);
  await page.getByRole('button', { name: 'Save transaction' }).click();
  await expect(page).toHaveURL((u) => new URL(u).pathname === '/');
}
