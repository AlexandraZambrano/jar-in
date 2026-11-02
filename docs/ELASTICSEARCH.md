# Elasticsearch connector — findings and setup

Companion to [spec 0016](features/0016-elasticsearch-connector.md) and
[ADR 0006](decisions/0006-elasticsearch-as-optional-source-of-truth.md).
This page records what was **measured** (task 1, issue #12) and grows with
the stack guide (#13) and the Kibana guide (#18).

## Verdict (spike, 2026-10-22)

**Go, with one supported path per browser.** A browser can talk to a local
Elasticsearch directly. Whether it can do so from the **public** site
(`https://jars.alexzambrano.com`) depends on the engine; from a page served
on **localhost** it works everywhere.

| Engine (Playwright build) | Page served on `http://localhost:5173` (dev server, or Jars in Docker) | Public page `https://jars.alexzambrano.com` |
|---|---|---|
| Chromium 153 | ✅ works | ❌ blocked **until the user allows "local network access"** (one prompt, remembered per site) — then ✅ |
| Firefox 155 | ✅ works | ✅ works, no prompt |
| WebKit 26.6 (Safari's engine) | ✅ works | ❌ blocked |

*Not yet verified in real Safari* — Playwright's WebKit is the same engine,
not the Safari product. Check it by hand once the connector UI (#17) exists.

Why: a page on a public address calling `localhost` is a "public → loopback"
request. Chromium gates it behind a permission (*Local Network Access*:
"Permission was denied for this request to access the `loopback` address
space"). WebKit refuses an `https` page calling plain `http://localhost`.
A page that is itself on localhost is in the loopback address space, so the
request is ordinary CORS.

### What this means for the design

- **Supported path for everyone: serve Jars from localhost.** The Docker
  stack (#13) will include the app container (the repo's existing
  `Dockerfile`) on `http://localhost:5173`, next to Elasticsearch and
  Kibana. That works in all three engines, needs no prompt, and is the
  answer for Safari. (IndexedDB is per origin, so the local copy starts
  empty — which is exactly what *restore from Elasticsearch* (#16) is for.)
- **Also supported: the public site, in Firefox or in Chromium after the
  user clicks Allow.** The connection UI (#17) must say so plainly.
- **The browser can't tell us why a request failed.** CORS, the Chromium
  permission, mixed content and "Elasticsearch is down" all surface as the
  same opaque `TypeError: Failed to fetch`. "Test connection" (#17) must
  therefore show a checklist ("Is Elasticsearch running at this URL? Did you
  allow local network access? Is this site in `http.cors.allow-origin`?"),
  not a single guessed cause.

## Run the stack

One command starts your own Elasticsearch, Kibana and Jars, all on your
machine and bound to `127.0.0.1`. Needs Docker with Compose v2 and about
4 GB of RAM available to Docker (Elasticsearch 2.5 GB, Kibana 1.5 GB).

```bash
cd docker/elasticsearch
cp .env.example .env        # set ELASTIC_PASSWORD, KIBANA_PASSWORD, KIBANA_ENCRYPTION_KEY
docker compose up -d        # first start builds Jars (~1 min); Elasticsearch is ready in ~30 s
```

| What | Where | Sign in |
|---|---|---|
| **Jars** | http://localhost:5173 | — |
| **Kibana** | http://localhost:5601 | user `elastic`, your `ELASTIC_PASSWORD` |
| **Elasticsearch** | http://localhost:9200 | an API key (below) |

Use Jars **from http://localhost:5173**, not from the public site: a page
on localhost is the one origin that reaches a local Elasticsearch in every
browser, with no prompt (see the matrix above). Verified on the stack
itself in Chromium, Firefox and WebKit.

### Create the API key Jars asks for

Scoped to `jarin-*` indices, so it can't read anything else on the cluster:

```bash
curl -s -u elastic:YOUR_ELASTIC_PASSWORD -X POST localhost:9200/_security/api_key \
  -H 'Content-Type: application/json' -d '{
    "name": "jars",
    "role_descriptors": { "jarin": {
      "cluster": ["manage_index_templates", "monitor"],
      "indices": [{ "names": ["jarin-*"], "privileges": ["all"] }]
    } }
  }'
```

Copy the `encoded` value from the reply: that is what you paste into Jars
(Settings → Elasticsearch, task #17). It is shown once.

### Your data and the volume

Elasticsearch writes to the named volume **`jarin-es_esdata`**. Removing the
container does not remove it:

| You do | Containers | Your data |
|---|---|---|
| `docker compose stop` / `down` | stopped / removed | **kept** |
| `docker compose up -d` again | recreated | back, as you left it |
| `docker compose down -v` | removed | **deleted**, and the snapshots volume too |
| `docker volume prune`, `docker system prune --volumes` **after a `down`** | — | **deleted**: no container uses the volume, so Docker treats it as garbage |

So: never prune volumes while the stack is down. Volume names carry the
compose project name (`jarin-es`), which is also why `npm run es:check`
(project `jarin-es-check`) can never touch yours.

### Backups: daily snapshots

While the stack is running, a policy snapshots every `jarin-*` index at
**01:30** into the second volume (`jarin-es_essnapshots`), keeping 30 days
(at least 5, at most 60 snapshots). This protects you from deleting or
corrupting the data volume. It does **not** protect you from losing Docker's
disk, so copy the snapshots out now and then:

```bash
docker run --rm -v jarin-es_essnapshots:/s -v "$PWD":/out alpine \
  tar czf /out/jarin-snapshots-$(date +%F).tgz -C /s .
```

Take one by hand, list them, and restore an index:

```bash
AUTH='-u elastic:YOUR_ELASTIC_PASSWORD'
curl -s $AUTH -X PUT "localhost:9200/_snapshot/jarin-local/manual-$(date +%F)?wait_for_completion=true"
curl -s $AUTH "localhost:9200/_snapshot/jarin-local/_all?filter_path=snapshots.snapshot,snapshots.state"
# restore: delete the damaged index first, then
curl -s $AUTH -X DELETE localhost:9200/jarin-transactions
curl -s $AUTH -X POST "localhost:9200/_snapshot/jarin-local/SNAPSHOT_NAME/_restore?wait_for_completion=true" \
  -H 'Content-Type: application/json' -d '{"indices":"jarin-transactions"}'
```

### Ports and common problems

Everything is configurable in `.env` (`ES_PORT`, `KIBANA_PORT`, `APP_PORT`).
If you change `APP_PORT`, CORS follows it.

| Symptom | Cause / fix |
|---|---|
| `port is already allocated` | Another service owns 9200 / 5601 / 5173 (another Elasticsearch, or `npm run dev`). Set a free port in `.env` |
| Elasticsearch never gets healthy | Docker has too little memory. Give Docker Desktop ≥ 4 GB (the heap alone is 1 GB; 512 MB does not start 9.x) |
| `variable is not set` on `up` | A secret is missing in `.env`; there are no default passwords on purpose |
| Kibana says "not ready" | It waits for Elasticsearch and for the one-shot `setup` job; give it a minute, then `docker compose logs setup kibana` |
| Browser says the request was blocked | You opened Jars from another origin. Use `http://localhost:APP_PORT`, or add the origin to `http.cors.allow-origin` |
| `401` / `403` from Jars | Wrong key / a key without the privileges above |

`npm run es:check` runs an isolated copy of this stack and asserts all of
the above (valid compose, green cluster, Kibana, app served, CORS, data
surviving `down`/`up`, snapshot + restore, `down -v` really deleting). It
takes about 4 minutes the first time.

## Settings that work

Elasticsearch (set as environment variables in Docker, or in
`elasticsearch.yml`):

```yaml
xpack.security.enabled: true            # keep it on; the key is the credential
http.cors.enabled: true
http.cors.allow-origin: "http://localhost:5173,https://jars.alexzambrano.com"
http.cors.allow-headers: "X-Requested-With,Content-Type,Content-Length,Authorization"
```

- `Authorization` is **not** in Elasticsearch's default `allow-headers`;
  without it the preflight for every authenticated request fails.
- `allow-origin` accepts a comma-separated list, or a `/regex/`. Do not use
  `*`: the spec asserts a non-listed origin is blocked.
- Methods already include `GET, POST, PUT, DELETE, OPTIONS, HEAD`.

## API key

The spike created the key the connector will ask users for. Minimum
privileges that passed every flow:

```json
{
  "role_descriptors": {
    "jarin": {
      "cluster": ["manage_index_templates", "monitor"],
      "indices": [{ "names": ["jarin-*"], "privileges": ["all"] }]
    }
  }
}
```

`monitor` is needed for `GET /` (action `cluster:monitor/main`) — the
"test connection" call; without it the browser reaches Elasticsearch and
gets a `403`. `manage_index_templates` is for `PUT _index_template`. Scoping
to `jarin-*` means the key can't read other indices on the same cluster.

## Server-side last-write-wins is confirmed

In every reachable cell, `POST _bulk` with `version` + `version_type:
external` behaves as ADR 0006 assumes: a write with a **lower** version is
rejected per item with **409**, and the stored document (and `_version`)
stay at the newer one. So conflict resolution is enforced by Elasticsearch,
not only by the client.

## Operational notes (from the spike, applied in the stack)

- **Memory:** Elasticsearch 9.5.1 with `-Xms512m -Xmx512m` and a 1.5 GB
  container limit did not finish starting in 3.5 minutes. With `-Xms1g
  -Xmx1g` and a 2.5 GB limit it starts in ~30 s. → the stack uses 1 GB / 2.5 GB.
- **Ports:** many dev machines already run an Elasticsearch on `9200`
  (this one did). → host ports are configurable in `.env`, and the checks
  use their own (19200 / 15601 / 15173).
- **Version:** the spike and the stack run 9.5.1 (the 8.x line is also
  current, 8.19). Nothing used here is 9-specific.

## Reproduce

```bash
npm run es:check   # the user-facing stack (docker/elasticsearch), isolated, 9 checks
```

The spike's own throwaway node and browser matrix:

```bash
npm run es:up      # isolated stack: project jarin-es-spike, host port 19200, own volume
npm run test:es    # 4 projects: chromium, chromium-no-permission, firefox, webkit
npm run es:down    # removes the stack and its volume
```

Stop `npm run dev` first: the specs serve a blank "real local page" on
`:5173`. Needs `npx playwright install firefox webkit` once. The spike
stack listens on **19200**, deliberately not 9200, because the specs create
and delete indices.
