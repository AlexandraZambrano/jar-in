#!/usr/bin/env node
// Scaffold a new feature spec from docs/features/_TEMPLATE.md
// Usage: npm run feature <slug> ["one-line goal"]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [slugRaw, ...goalParts] = process.argv.slice(2);
if (!slugRaw) {
  console.error('Usage: npm run feature <slug> ["one-line goal"]');
  process.exit(1);
}

const slug = slugRaw
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const goal = goalParts.join(' ').trim();

const dir = join(process.cwd(), 'docs', 'features');
const nums = readdirSync(dir)
  .map((f) => /^(\d{4})-/.exec(f))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const next = String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0');
const filename = `${next}-${slug}.md`;
const path = join(dir, filename);

if (existsSync(path)) {
  console.error(`Already exists: docs/features/${filename}`);
  process.exit(1);
}

const template = readFileSync(join(dir, '_TEMPLATE.md'), 'utf8');
const title = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const today = new Date().toISOString().slice(0, 10);

const doc = template
  .replace('# NNNN — <Feature name>', `# ${next} — ${title}`)
  .replace('- **Status:** ⬜ not started · 🟡 in progress · ✅ done · ⏸ paused', '- **Status:** ⬜ not started')
  .replace(
    '## Goal\n\nOne paragraph: what the user can do after this ships, and why it matters.',
    `## Goal\n\n${goal || 'One paragraph: what the user can do after this ships, and why it matters.'}`,
  )
  .replace('- **YYYY-MM-DD** — <change>', `- **${today}** — spec created`);

writeFileSync(path, doc);

console.log(`\nCreated docs/features/${filename}\n`);
console.log('Next steps (see docs/WORKFLOW.md):');
console.log('  1. Fill in acceptance criteria, data touched, screens');
console.log('  2. Add the row to docs/ROADMAP.md');
console.log(`  3. git add docs && git commit -m "docs: spec ${slug}"`);
console.log('  4. Implement, then `npm run check`\n');
