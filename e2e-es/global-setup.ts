import http from 'node:http';

/** Port the dev server uses; also an origin in the stack's CORS allow-list. */
const APP_PORT = 5173;
export const APP_ORIGIN = `http://localhost:${APP_PORT}`;

/** The default port is 19200, not 9200: another stack on a dev machine often
 *  already owns 9200, and these specs create and delete indices. */
export const ES_URL = process.env.ES_URL ?? 'http://localhost:19200';
const PASSWORD = process.env.ES_PASSWORD ?? 'spike-only-change-me';

/**
 * 1. Serves a blank page on http://localhost:5173 — a *real* local page (its
 *    address space is loopback), unlike a `page.route`-stubbed one, which the
 *    engine treats as public. Stop `npm run dev` first if it holds the port.
 * 2. Creates an API key scoped like the one a real user would create (only
 *    `jarin-*` indices, plus the cluster privileges the connector needs) and
 *    hands it to the specs through the environment.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<!doctype html><title>jars (local page)</title>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: NodeJS.ErrnoException) =>
      reject(
        e.code === 'EADDRINUSE'
          ? new Error(`Port ${APP_PORT} is busy — stop your dev server (npm run dev) and retry.`)
          : e,
      ),
    );
    server.listen(APP_PORT, resolve);
  });

  const basic = 'Basic ' + Buffer.from(`elastic:${PASSWORD}`).toString('base64');
  let res: Response;
  try {
    res = await fetch(`${ES_URL}/_security/api_key`, {
      method: 'POST',
      headers: { Authorization: basic, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `jarin-spike-${Date.now()}`,
        expiration: '1h',
        role_descriptors: {
          jarin: {
            // manage_index_templates: PUT _index_template. monitor: `GET /`
            // (action cluster:monitor/main), which the connector's "test
            // connection" and version display use.
            cluster: ['manage_index_templates', 'monitor'],
            indices: [{ names: ['jarin-*'], privileges: ['all'] }],
          },
        },
      }),
    });
  } catch {
    server.close();
    throw new Error(`Elasticsearch is not reachable at ${ES_URL}. Start it with: npm run es:up`);
  }
  if (!res.ok) {
    server.close();
    throw new Error(`Could not create an API key (${res.status}): ${await res.text()}`);
  }
  process.env.ES_API_KEY = ((await res.json()) as { encoded: string }).encoded;

  return () => new Promise((resolve) => server.close(() => resolve()));
}
