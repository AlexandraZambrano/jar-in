import { expect, test, type Page } from '@playwright/test';
import { APP_ORIGIN, ES_URL } from './global-setup';

/**
 * Spike (issue #12): can a Jars page talk to a local Elasticsearch from the
 * browser, in each engine, from each place the app can be served from?
 *
 * Two kinds of page matter, and engines treat them very differently:
 *  - a REAL local page (http://localhost:5173 — a dev server, or the app
 *    served from Docker): its address space is loopback, so reaching
 *    localhost is ordinary CORS;
 *  - the PUBLIC https page (https://jars.alexzambrano.com), stubbed with
 *    `page.route` since nothing is served there: reaching localhost is a
 *    "public -> loopback" request, which Chromium gates behind a user
 *    permission and WebKit blocks as mixed content.
 *
 * Every call carries `Authorization` and/or a JSON/NDJSON body, so each one
 * is CORS-preflighted, like the real connector's requests will be.
 */

const INDEX = 'jarin-spike';
const PUBLIC_ORIGIN = 'https://jars.alexzambrano.com';

/** Projects (engine + permission state) where a public https page cannot
 *  reach localhost. Measured, not assumed — see docs/ELASTICSEARCH.md. */
const PUBLIC_BLOCKED = ['chromium-no-permission', 'webkit'];
const publicIsBlocked = () => PUBLIC_BLOCKED.includes(test.info().project.name);

interface Reply {
  ok: boolean;
  status: number;
  body: unknown;
  error?: string;
}

async function openPublicPage(page: Page, origin = PUBLIC_ORIGIN): Promise<void> {
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

/** The four things the connector does, from whatever page `open` provides. */
function connectorFlows(open: (page: Page) => Promise<void>, skip: () => boolean) {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(() => test.skip(skip(), 'this page cannot reach localhost in this engine'));
  // One document per describe (each call of this function), shared by its serial tests.
  const id = `spike-${Math.random().toString(36).slice(2)}`;

  test('reads the cluster root', async ({ page }) => {
    await open(page);
    const r = await es(page, 'GET', '/');
    expect(r.error, 'request was blocked by the browser').toBeUndefined();
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body as { version: { number: string } }).version.number).toMatch(/^\d+\./);
  });

  test('creates an index template (JSON body, preflighted)', async ({ page }) => {
    await open(page);
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
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body as { acknowledged: boolean }).acknowledged).toBe(true);
  });

  test('bulk-indexes NDJSON with an external version', async ({ page }) => {
    await open(page);
    const r = await es(page, 'POST', '/_bulk?refresh=wait_for', bulk(id, 2, 1250), 'application/x-ndjson');
    expect(r.error, 'request was blocked by the browser').toBeUndefined();
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body as { errors: boolean }).errors).toBe(false);
  });

  test('a stale external version is rejected by the server (409) and the newer one stays', async ({ page }) => {
    await open(page);
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
}

test.describe(`a real local page (${APP_ORIGIN})`, () => {
  connectorFlows(
    (page) => page.goto(`${APP_ORIGIN}/`).then(() => undefined),
    () => false,
  );
});

test.describe(`the public page (${PUBLIC_ORIGIN})`, () => {
  connectorFlows((page) => openPublicPage(page), publicIsBlocked);
});

test('the public page is blocked where the engine forbids public -> localhost', async ({ page }) => {
  test.skip(!publicIsBlocked(), 'this engine lets the public page reach localhost');
  await openPublicPage(page);
  const r = await es(page, 'GET', '/');
  expect(r.status).toBe(0);
  expect(r.error).toBeDefined();
});

test('an origin that is not allow-listed is blocked by CORS', async ({ page }) => {
  await openPublicPage(page, 'https://evil.example');
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
