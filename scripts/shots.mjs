#!/usr/bin/env node
// Capture app screenshots for the README / feature specs.
// Assumes the dev server is running (npm run dev). Usage: npm run shots
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SHOT_BASE || 'http://localhost:5173';
const OUT = 'docs/screenshots';

const SHOTS = [
  { name: 'dashboard-light', path: '/', theme: 'light', a11y: [] },
  { name: 'dashboard-dark', path: '/', theme: 'dark', a11y: [] },
  { name: 'dashboard-cvd', path: '/', theme: 'light', a11y: ['cvd'] },
  { name: 'dashboard-calm', path: '/', theme: 'light', a11y: ['calm'] },
  { name: 'jars-light', path: '/jars', theme: 'light', a11y: [] },
  { name: 'jar-edit-light', path: '/jars/new', theme: 'light', a11y: [] },
  { name: 'settings-light', path: '/settings', theme: 'light', a11y: [] },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const s of SHOTS) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 1600 },
    deviceScaleFactor: 2,
    locale: 'en-GB',
  });
  await ctx.addInitScript((pref) => {
    try {
      localStorage.setItem('jarin.preferences', JSON.stringify(pref));
    } catch {
      /* ignore */
    }
  }, { theme: s.theme, a11y: s.a11y });

  const page = await ctx.newPage();
  await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000); // fonts + RxDB init + donut paint
  await page.screenshot({ path: `${OUT}/${s.name}.png` });
  console.log('  ✓', s.name);
  await ctx.close();
}

await browser.close();
console.log(`\nWrote ${SHOTS.length} screenshots to ${OUT}/`);
