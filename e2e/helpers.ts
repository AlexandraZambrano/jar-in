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
