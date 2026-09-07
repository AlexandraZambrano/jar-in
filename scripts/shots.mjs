#!/usr/bin/env node
// Capture app screenshots for the README / feature specs.
// Assumes the dev server is running (npm run dev). Usage: npm run shots
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const OUT = 'docs/screenshots';
const LOCALE = 'en-IE'; // English + euro, matches the EUR seed

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

function ctxOpts(pref) {
  return {
    viewport: { width: 390, height: 1600 },
    deviceScaleFactor: 2,
    locale: LOCALE,
    ...(pref
      ? {
          storageState: {
            cookies: [],
            origins: [
              {
                origin: BASE,
                localStorage: [
                  { name: 'jarin.preferences', value: JSON.stringify(pref) },
                ],
              },
            ],
          },
        }
      : {}),
  };
}

// ── Per-mode dashboard (seed data only) ──
const MODES = [
  { name: 'dashboard-light', path: '/', pref: { theme: 'light', a11y: [] } },
  { name: 'dashboard-dark', path: '/', pref: { theme: 'dark', a11y: [] } },
  { name: 'dashboard-cvd', path: '/', pref: { theme: 'light', a11y: ['cvd'] } },
  { name: 'dashboard-calm', path: '/', pref: { theme: 'light', a11y: ['calm'] } },
  { name: 'jars-light', path: '/jars', pref: { theme: 'light', a11y: [] } },
  {
    name: 'jar-edit-light',
    path: '/jars',
    open: 'Essentials', // click into a seeded jar so the sub-category editor is populated
    pref: { theme: 'light', a11y: [] },
  },
  { name: 'settings-light', path: '/settings', pref: { theme: 'light', a11y: [] } },
];

for (const s of MODES) {
  const ctx = await browser.newContext(ctxOpts(s.pref));
  const page = await ctx.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (s.open) {
    await page.getByRole('link', { name: new RegExp(s.open) }).click();
    await page.waitForURL(/\/jars\/[^/]+$/);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log('  ✓', s.name);
  await ctx.close();
}

// ── Populated context: add a couple of transactions, then shoot the money screens ──
{
  const ctx = await browser.newContext(ctxOpts(null));
  const page = await ctx.newPage();

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

await browser.close();
console.log(`\nDone — screenshots in ${OUT}/`);
