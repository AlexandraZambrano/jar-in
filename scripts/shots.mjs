#!/usr/bin/env node
// Capture app screenshots for the README / feature specs.
// Assumes the dev server is running (npm run dev). Usage: npm run shots
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const OUT = 'docs/screenshots';
const LOCALE = 'en-IE'; // English + euro, matches the EUR seed

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

function ctxOpts(pref) {
  // shots never want the tour popping up (except the dedicated tour shot)
  const stored = pref ? { tourDone: true, ...pref } : null;
  return {
    viewport: { width: 390, height: 1600 },
    deviceScaleFactor: 2,
    locale: LOCALE,
    ...(stored
      ? {
          storageState: {
            cookies: [],
            origins: [
              {
                origin: BASE,
                localStorage: [
                  { name: 'jarin.preferences', value: JSON.stringify(stored) },
                ],
              },
            ],
          },
        }
      : {}),
  };
}

/** The DB no longer auto-seeds — walk the "skip, use a starter set" onboarding
 *  path so a context has data, and suppress the tour that would follow. */
async function seedViaSkip(page) {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const skip = page.getByRole('button', { name: 'Skip — use a starter set' });
  if (await skip.count()) {
    await skip.click();
    await page.waitForURL((u) => u.pathname === '/');
    await page.waitForTimeout(700);
  }
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('jarin.preferences') || '{}');
    localStorage.setItem('jarin.preferences', JSON.stringify({ ...p, tourDone: true }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}

// ── Per-mode dashboard (seed data only) ──
const MODES = [
  { name: 'dashboard-light', path: '/', pref: { theme: 'light', a11y: [] } },
  { name: 'dashboard-dark', path: '/', pref: { theme: 'dark', a11y: [] } },
  { name: 'dashboard-cvd', path: '/', pref: { theme: 'light', a11y: ['cvd'] } },
  { name: 'dashboard-calm', path: '/', pref: { theme: 'light', a11y: ['calm'] } },
  { name: 'jars-light', path: '/jars', pref: { theme: 'light', a11y: [] } },
  // click into a seeded jar (→ detail), screenshot there
  { name: 'jar-detail-flow', open: 'Essentials', pref: { theme: 'light', a11y: [] } },
  { name: 'jar-detail-accumulation', open: 'Safe fund', pref: { theme: 'light', a11y: [] } },
  // from the jar detail, follow Edit → the editor (sub-category section is populated)
  { name: 'jar-edit-light', open: 'Essentials', thenEdit: true, pref: { theme: 'light', a11y: [] } },
  { name: 'insights-light', path: '/insights', pref: { theme: 'light', a11y: [] } },
  { name: 'settings-light', path: '/settings', pref: { theme: 'light', a11y: [] } },
];

for (const s of MODES) {
  const ctx = await browser.newContext(ctxOpts(s.pref));
  const page = await ctx.newPage();
  await seedViaSkip(page);
  await page.goto(BASE + (s.path ?? '/jars'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (s.open) {
    await page.getByRole('link', { name: new RegExp(s.open) }).click();
    await page.waitForURL(/\/jars\/[^/]+$/);
    await page.waitForTimeout(600);
    if (s.thenEdit) {
      await page.getByRole('link', { name: 'Edit' }).click();
      await page.waitForURL(/\/jars\/[^/]+\/edit$/);
      await page.waitForTimeout(500);
    }
  }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log('  ✓', s.name);
  await ctx.close();
}

// ── Onboarding (fresh, un-seeded contexts) ──
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 1600 },
    deviceScaleFactor: 2,
    locale: LOCALE,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/welcome-intro.png` });
  console.log('  ✓ welcome-intro');

  await page.getByRole('button', { name: 'Answer a few questions' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('textbox', { name: /take-home pay/ }).fill('2400');
  await page.screenshot({ path: `${OUT}/welcome-questions.png` });
  console.log('  ✓ welcome-questions');

  const step = async (label, v) => {
    await page.getByRole('button', { name: 'Next' }).click();
    await page.waitForTimeout(150);
    if (v != null) await page.getByRole('textbox', { name: label }).fill(v);
  };
  await step(/rent or mortgage/, '800');
  await step(/utilities/, '150');
  await step(/groceries/, '300');
  await page.getByRole('button', { name: 'Next' }).click(); // -> debt
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Next' }).click(); // -> saves
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: 'Not yet' }).click();
  await page.getByRole('button', { name: 'See my jars' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/welcome-review.png` });
  console.log('  ✓ welcome-review');

  await page.getByRole('button', { name: 'Looks good, start' }).click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/tour.png` });
  console.log('  ✓ tour');
  await ctx.close();
}

// ── Populated context: add a couple of transactions, then shoot the money screens ──
{
  const ctx = await browser.newContext(ctxOpts({ theme: 'light', a11y: [] }));
  const page = await ctx.newPage();
  await seedViaSkip(page);

  await page.goto(`${BASE}/add`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const entries = [
    { jar: 'Essentials', digits: ['1', '8', '0'], note: 'Groceries' },
    { jar: 'Essentials', digits: ['4', '5'], note: 'Energy bill' },
    { jar: 'Joy-jar', digits: ['6', '2'], note: 'Cinema' },
  ];
  for (const e of entries) {
    await page.getByRole('radio', { name: e.jar }).click();
    for (const d of e.digits) await page.getByRole('button', { name: d, exact: true }).click();
    await page.getByLabel('Note (optional)').fill(e.note);
    await page.getByRole('button', { name: 'Save transaction' }).click();
    await page.waitForURL((u) => u.pathname === '/');
    await page.waitForTimeout(400);
    await page.goto(`${BASE}/add`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
  }

  // record a withdrawal on Safe fund so its detail shows a marker + list
  await page.goto(`${BASE}/jars`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.getByRole('link', { name: /Safe fund/ }).click();
  await page.waitForURL(/\/jars\/[^/]+$/);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Withdraw from this jar/ }).click();
  await page.getByLabel(/Amount/).fill('300');
  await page.getByLabel('Reason (optional)').fill('Car repair');
  await page.getByRole('button', { name: 'Record withdrawal' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/jar-detail-withdrawal.png` });
  console.log('  ✓ jar-detail-withdrawal');

  // CSV import wizard: column-mapping + preview steps
  {
    const csv = [
      'Booking Date;Description;Amount',
      '01/06/2026;Tesco groceries;-42,10',
      '03/06/2026;Coffee shop;-3,80',
      '05/06/2026;Salary June;1500,00',
      '07/06/2026;Cinema tickets;-19,00',
      'not-a-date;Broken row;-9,99',
      '10/06/2026;Pharmacy;-8,50',
    ].join('\n');
    await page.goto(`${BASE}/transactions/import`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.setInputFiles('input[type=file]', {
      name: 'june.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/import-csv-map.png` });
    console.log('  ✓ import-csv-map');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/import-csv-preview.png` });
    console.log('  ✓ import-csv-preview');
  }

  for (const [name, path] of [
    ['dashboard-active', '/'],
    ['transactions', '/transactions'],
    ['add-transaction', '/add'],
    ['wallets', '/wallets'],
    ['income', '/income'],
  ]) {
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('  ✓', name);
  }
  await ctx.close();
}

// ── PWA: offline state + iOS install nudge ──
{
  const ctx = await browser.newContext(ctxOpts({ theme: 'light', a11y: [] }));
  const page = await ctx.newPage();
  await seedViaSkip(page);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 15000 });
  await page
    .waitForFunction(() => navigator.serviceWorker?.controller != null, { timeout: 8000 })
    .catch(() => {});
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' }).catch(() => {});
  await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/offline.png` });
  console.log('  ✓ offline');
  await ctx.close();
}
{
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  await seedViaSkip(page);
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2200); // the iOS nudge appears after ~1.5s
  await page.screenshot({ path: `${OUT}/install-ios.png` });
  console.log('  ✓ install-ios');
  await ctx.close();
}

await browser.close();
console.log(`\nDone — screenshots in ${OUT}/`);
