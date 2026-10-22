/** Creates an API key scoped like the one a real user would create (only
 *  `jarin-*` indices, plus the cluster privilege needed for index templates)
 *  and hands it to the specs through the environment.
 *
 *  The default port is 19200, not 9200: another stack on a dev machine often
 *  already owns 9200, and these specs create and delete indices. */
export const ES_URL = process.env.ES_URL ?? 'http://localhost:19200';
const PASSWORD = process.env.ES_PASSWORD ?? 'spike-only-change-me';

export default async function globalSetup(): Promise<void> {
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
            cluster: ['manage_index_templates'],
            indices: [{ names: ['jarin-*'], privileges: ['all'] }],
          },
        },
      }),
    });
  } catch {
    throw new Error(`Elasticsearch is not reachable at ${ES_URL}. Start it with: npm run es:up`);
  }
  if (!res.ok) {
    throw new Error(`Could not create an API key (${res.status}): ${await res.text()}`);
  }
  process.env.ES_API_KEY = ((await res.json()) as { encoded: string }).encoded;
}
