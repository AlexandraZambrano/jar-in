#!/usr/bin/env node
// Rasterise the app icons from the jar mark. Run when the mark changes:
//   npm run icons
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const CREAM = '#FFF6E9';
const INK = '#2B2440';
const CHERRY = '#E8384F';

// The jar mark on a 64-unit grid (same shapes as public/favicon.svg).
const JAR = `
  <g fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 12h24" />
    <path d="M23 12v6c-4 3-6 8-6 13v14a5 5 0 0 0 5 5h20a5 5 0 0 0 5-5V31c0-5-2-10-6-13v-6" />
  </g>
  <path d="M18 34h28v13a5 5 0 0 1-5 5H23a5 5 0 0 1-5-5z" fill="${CHERRY}" />
`;

/** full-bleed cream square, jar centred at `scale` of the canvas */
function page(size, scale) {
  const inner = size * scale;
  const off = (size - inner) / 2;
  return `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:${CREAM}">
      <svg xmlns="http://www.w3.org/2000/svg" width="${inner}" height="${inner}"
           viewBox="10 8 44 48" style="position:absolute;left:${off}px;top:${off}px">${JAR}</svg>
    </div></body></html>`;
}

const TARGETS = [
  { file: 'icon-192.png', size: 192, scale: 0.82 },
  { file: 'icon-512.png', size: 512, scale: 0.82 },
  { file: 'icon-512-maskable.png', size: 512, scale: 0.6 }, // content inside the safe zone
  { file: 'apple-touch-icon.png', size: 180, scale: 0.7 },
];

const browser = await chromium.launch();
for (const t of TARGETS) {
  const p = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  await p.setContent(page(t.size, t.scale), { waitUntil: 'networkidle' });
  const buf = await p.screenshot({ clip: { x: 0, y: 0, width: t.size, height: t.size } });
  await writeFile(new URL(`../public/${t.file}`, import.meta.url), buf);
  console.log('  ✓', t.file, `${t.size}x${t.size}`);
  await p.close();
}
await browser.close();
console.log('\nWrote 4 icons to public/');
