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

## Operational notes (feed into #13)

- **Memory:** Elasticsearch 9.5.1 with `-Xms512m -Xmx512m` and a 1.5 GB
  container limit did not finish starting in 3.5 minutes. With `-Xms1g
  -Xmx1g` and a 2.5 GB limit it starts in ~30 s. Budget ≥ 1 GB heap.
- **Ports:** many dev machines already run an Elasticsearch on `9200`
  (this one did). The user-facing stack must not assume 9200 is free: make
  the host port configurable.
- **Version:** the spike ran on 9.5.1 (the 8.x line is also current, 8.19).
  Nothing used here is 9-specific.

## Reproduce

```bash
npm run es:up      # isolated stack: project jarin-es-spike, host port 19200, own volume
npm run test:es    # 4 projects: chromium, chromium-no-permission, firefox, webkit
npm run es:down    # removes the stack and its volume
```

Stop `npm run dev` first: the specs serve a blank "real local page" on
`:5173`. Needs `npx playwright install firefox webkit` once. The spike
stack listens on **19200**, deliberately not 9200, because the specs create
and delete indices.
