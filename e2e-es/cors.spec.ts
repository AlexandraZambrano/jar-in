import { expect, test, type Page } from '@playwright/test';
import { ES_URL } from './global-setup';

/**
 * Spike (issue #12): can a Jars page talk to a local Elasticsearch from the
 * browser, in each engine, from each origin the app is served from?
 *
 * The page itself is stubbed with `page.route` — nothing is served on these
 * origins — so the only thing exercised is how the engine treats the request.
 * Every call sends `Authorization` and/or a JSON/NDJSON body, so each one is
 * CORS-preflighted, like the real connector's requests will be.
 */

const INDEX = 'jarin-spike';
const ORIGINS = {
  'dev server (http://localhost:5173)': 'http://localhost:5173',
  'production (https://jars.alexzambrano.com)': 'https://jars.alexzambrano.com',
};

interface Reply {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
}

async function openAs(page: Page, origin: string): Promise<void> {
  await page.route(`${origin}/**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>probe</title>' }),
  );
  await page.goto(`${origin}/`);
}

/** `fetch` run inside the page, so the engine's CORS / mixed-content rules apply. */
function es(page: Page, method: string, path: string, body?: string, contentType = 'application/json') {
  return page.evaluate(
    async ({ url, method, body, contentType, key }): Promise<Reply> => {
      try {
        const res = await fetch(url, {
          method,
          headers: { Authorization: `ApiKey ${key}`, ...(body ? { 'Content-Type': contentType } : {}) },
          body,
        });
        const text = await res.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          /* not JSON */
        }
        return { ok: res.ok, status: res.status, body: parsed };
      } catch (e) {
        return { ok: false, status: 0, body: null, error: String(e) };
      }
    },
    { url: `${ES_URL}${path}`, method, body, contentType, key: process.env.ES_API_KEY ?? '' },
  );
}

const bulk = (id: string, version: number, amountMinor: number) =>
  `${JSON.stringify({ index: { _index: INDEX, _id: id, version, version_type: 'external' } })}\n` +
  `${JSON.stringify({ updatedAt: version, amountMinor })}\n`;

for (const [label, origin] of Object.entries(ORIGINS)) {
  test.describe(`page on ${label}`, () => {
    test.describe.configure({ mode: 'serial' });
    const id = `spike-${origin.replace(/\W+/g, '-')}-${Date.now()}`;

    test('reads the cluster root', async ({ page }) => {
      await openAs(page, origin);
      const r = await es(page, 'GET', '/');
      expect(r.error, 'request was blocked by the browser').toBeUndefined();
      expect(r.status).toBe(200);
      expect((r.body as { version: { number: string } }).version.number).toMatch(/^\d+\./);
    });

    test('creates an index template (JSON body, preflighted)', async ({ page }) => {
      await openAs(page, origin);
      const r = await es(
        page,
        'PUT',
        '/_index_template/jarin-spike',
        JSON.stringify({
          index_patterns: [`${INDEX}*`],
          template: { mappings: { properties: { amountMinor: { type: 'long' }, updatedAt: { type: 'long' } } } },
        }),
      );
      expect(r.error, 'request was blocked by the browser').toBeUndefined();
      expect(r.status).toBe(200);
      expect((r.body as { acknowledged: boolean }).acknowledged).toBe(true);
    });

    test('bulk-indexes NDJSON with an external version', async ({ page }) => {
      await openAs(page, origin);
      const r = await es(page, 'POST', '/_bulk?refresh=wait_for', bulk(id, 2, 1250), 'application/x-ndjson');
      expect(r.error, 'request was blocked by the browser').toBeUndefined();
      expect(r.status).toBe(200);
      expect((r.body as { errors: boolean }).errors).toBe(false);
    });

    test('a stale external version is rejected by the server (409) and the newer one stays', async ({ page }) => {
      await openAs(page, origin);
      const stale = await es(page, 'POST', '/_bulk?refresh=wait_for', bulk(id, 1, 999), 'application/x-ndjson');
      const item = (stale.body as { items: { index: { status: number } }[] }).items[0].index;
      expect(item.status).toBe(409);

      const found = await es(
        page,
        'POST',
        `/${INDEX}/_search`,
        JSON.stringify({ query: { ids: { values: [id] } }, version: true }),
      );
      const hit = (found.body as { hits: { hits: { _version: number; _source: { amountMinor: number } }[] } }).hits.hits[0];
      expect(hit._source.amountMinor).toBe(1250);
      expect(hit._version).toBe(2);
    });
  });
}

test('an origin that is not allow-listed is blocked by CORS', async ({ page }) => {
  await openAs(page, 'https://evil.example');
  const r = await es(page, 'GET', '/');
  expect(r.status, 'CORS must be enforced, not wide open').toBe(0);
  expect(r.error).toBeDefined();
});

test.afterAll(async () => {
  // Node-side (no CORS involved): drop the spike index and template.
  const headers = { Authorization: `ApiKey ${process.env.ES_API_KEY}` };
  await fetch(`${ES_URL}/${INDEX}`, { method: 'DELETE', headers }).catch(() => undefined);
  await fetch(`${ES_URL}/_index_template/jarin-spike`, { method: 'DELETE', headers }).catch(() => undefined);
});
