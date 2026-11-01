# 0016 — Elasticsearch connector (opt-in, user-hosted)

- **Status:** 🟡 in progress — task 1 (#12) done; umbrella for issues #12–#18 (see *Tasks*)
- **Phase:** 2b (self-hosted data store)
- **Spec refs:** SPEC.md §10 (local-first, sync boundary), ADR 0002, ADR 0006
- **Depends on:** 0013 (deterministic allocation ids make multi-writer safe)
- **Method:** **TDD** — every task writes its failing tests first (see
  [`WORKFLOW.md`](../WORKFLOW.md)).

## Goal

A user can run Elasticsearch + Kibana in Docker on their own machine,
point Jars at it, and have **their data live in Elasticsearch** (on a
Docker volume, so removing the container loses nothing) and be explorable
in Kibana — while the app keeps working offline and nothing leaves their
computer unless they point it somewhere else.

## Design in one paragraph

**Elasticsearch becomes the source of truth when connected; RxDB stays as
the on-device cache that feeds every screen.** Nothing in the UI changes:
14 files read through `useRxQuery` and 22 touch collections directly, and
they keep doing so. A *connector* uses RxDB's built-in
[replication protocol](https://rxdb.info/replication.html)
(`rxdb/plugins/replication`) with a custom `push` and `pull` handler over
Elasticsearch's REST API, so checkpoints, retries, offline queueing and
conflict detection come from RxDB rather than being re-invented. The
cache is rebuildable from Elasticsearch at any time.

```
 screens ──reads/writes──▶ RxDB (cache, IndexedDB) ◀──replication──▶ Elasticsearch (Docker volume) ◀── Kibana
                                                       push / pull          user-hosted, localhost
```

Why not remove RxDB / write a custom RxStorage: see ADR 0006.

## Decisions this spec fixes

| Topic | Decision |
|---|---|
| Opt-in | Off by default. No connection → the app behaves exactly as today |
| Config | `{ url, apiKey, enabled }` in `localStorage` key `jarin.elasticsearch`. Never in RxDB, never replicated |
| Auth | Elasticsearch **API key** (`Authorization: ApiKey …`), created by the user, scoped to `jarin-*` indices |
| Indices | `jarin-<collection>` (`jarin-jars`, `jarin-transactions`, …); document `_id` = RxDB primary key |
| Collections replicated | All except `fxRates` (derived, refetchable) |
| Deletes | **Soft**: documents carry `_deleted: true` (RxDB `deletedField`). Kibana data views filter `_deleted: false`. Hard deletes would leave the pull side blind |
| Conflicts | Last-write-wins on `updatedAt`; tie → Elasticsearch (master) wins. Push uses Elasticsearch **external versioning** (`version` = `updatedAt` in ms, `version_type: external`), so a stale write is rejected by the server, not just by the client |
| Direction of edits | Edits made directly in Elasticsearch flow back to the app (it is the master) |
| Offline / ES down | The app keeps reading and writing the cache; the connector retries (`retryTime`) and drains the queue on reconnect. The status indicator says so |
| First connect | See task 5 |
| Multi-device | Works as a side effect (two browsers, same ES), but is **not** a goal and not tested beyond LWW |

## Tasks (one GitHub issue each, in dependency order)

Every task lists the tests to write **first**.

### 1. Spike: can a browser talk to a local Elasticsearch?  ✅ *(issue #12 — result in [ELASTICSEARCH.md](../ELASTICSEARCH.md))*

Elasticsearch needs CORS enabled, and a page on `https://jars.alexzambrano.com`
calling `http://localhost:9200` hits mixed-content and (Chrome) local-network
rules that differ per browser. Establish what works before building on it.

- **Deliverable:** a compatibility matrix in `docs/ELASTICSEARCH.md`
  (Chromium / Firefox / WebKit × page origin `http://localhost:5173` and
  `https://…` × ES on `http://localhost:9200`), the CORS settings that work,
  and a go / no-go with the fallback (a tiny local relay, or serve the app
  from localhost) if it fails.
- **Tests first:** a Playwright spec `e2e-es/cors.spec.ts` that, against a
  real Elasticsearch, performs `GET /`, `PUT` an index template and `POST
  _bulk` from a page on a different origin, per browser engine, asserting
  success or the documented failure. The matrix is the spec's output.
- **Result: go, with one supported path per browser.** A page served on
  localhost reaches Elasticsearch in every engine; the *public* site does in
  Firefox, and in Chromium only after the user allows "local network
  access"; WebKit blocks it. Also confirmed: external-version 409s
  (server-side LWW) and the API-key privileges the connector needs.

### 2. Docker stack with a persistent volume and snapshots

- `docker/elasticsearch/docker-compose.yml`: Elasticsearch 9.x single node
  (spike ran on 9.5.1; heap ≥ 1 GB, it won't start in 512 MB) + Kibana +
  **the Jars app** (this repo's `Dockerfile`) on `http://localhost:5173`, so
  Jars is served from localhost — the one path that works in every browser
  (spike). Host ports configurable (many machines already own 9200). Security **on** (password from `.env`, `.env.example` committed),
  CORS for the app origins, a **named volume** (`jarin-esdata`) for data and
  a second one (`jarin-essnapshots`) for snapshots, healthchecks, memory
  limits.
- A snapshot repository + a daily SLM policy so a lost volume is not a lost
  ledger.
- **Tests first:** `scripts/es-stack-check.sh` (run in CI against the compose
  file): `docker compose config` is valid; stack reaches `green/yellow`;
  write a document → `docker compose down` (no `-v`) → `up` → the document
  is still there; `down -v` removes it (documented as the destructive path);
  a snapshot can be taken and restored.

### 3. Elasticsearch client + config

`src/features/elastic/`: `config.ts` (load/save/validate the localStorage
config), `client.ts` (thin `fetch` wrapper: `ping`, `ensureTemplates`,
`bulk`, `search`), `templates.ts` (explicit mappings: ids/enums `keyword`,
`*Minor` `long`, dates `date`, `_deleted` `boolean`, `updatedAt` also as
`long` for versioning).

- **Tests first** (unit, `fetch` stubbed like `fxRepo.test.ts`): config
  round-trips and rejects a non-URL; every request carries the `ApiKey`
  header; `ping` (`GET /`, needs the `monitor` cluster privilege) maps 401/403/network errors to distinct typed errors;
  `ensureTemplates` is idempotent; `bulk` builds correct NDJSON with
  `_id`, external `version` and per-item error reporting; `search` pages
  with `search_after`.
- **Integration** (real ES, CI `services:`): templates apply; mappings
  reject a `date` that isn't one.

### 4. Replication: push and pull handlers

`src/features/elastic/replication.ts`: `startElasticReplication(db, config)`
wires `replicateRxCollection` per collection (identifier
`jarin-es-<collection>-<host>`), `live: true`, `waitForLeadership: true`
(one tab pushes), with:

- **pull** — `search` ordered by `(updatedAt, _id)` after the checkpoint,
  batch size 100, returns RxDB documents incl. `_deleted`.
- **push** — `bulk` with external version; for each row compares
  `assumedMasterState`; version conflicts come back as the master's current
  document so RxDB resolves them.
- **conflictHandler** — LWW on `updatedAt`, tie → master.
- **Tests first:** against an **in-memory fake Elasticsearch** (a test
  double implementing only `_bulk`, `_search`, `PUT _index_template`, with
  external-version semantics) and a real in-memory RxDB: a local insert
  appears in the fake ES; an ES-side edit appears in the cache; a delete
  becomes a tombstone both ways; a stale write loses; two concurrent
  writers converge; an ES outage queues writes and a later reconnect drains
  them exactly once; `syncAllocationEvents` run on two "devices" produces
  one set of `<jarId>_<date>` documents (the 0013 deterministic ids).
- **Integration** (real ES): the same scenarios on a real node.

### 5. First-connect and restore flow

What happens when connection is switched on:

| Local cache | Elasticsearch | Action |
|---|---|---|
| has data | empty | initial **push** of everything |
| empty | has data | **restore** (also what a fresh `localhost:5173` origin needs — IndexedDB is per origin): pull everything; the app must not route to `/welcome` while hydrating (the first-run gate waits for the initial pull) |
| has data | has data | merge by `updatedAt` (LWW); show a one-time summary ("12 from Elasticsearch, 3 pushed") |
| empty | empty | nothing, normal onboarding |

Disconnecting stops replication and keeps the local data; Elasticsearch is
untouched. Clearing the browser then reconnecting restores everything.

- **Tests first:** the four rows above as unit tests over the fake ES;
  `firstRunDecision` is not reached before hydration finishes (component
  test on `RxdbProvider`); disconnect leaves both sides intact; reconnect
  after a cleared cache restores the exact documents.

### 6. Settings UI: connect, test, status, disconnect

Settings → "Elasticsearch": URL + API key fields, **Test connection**,
Connect / Disconnect, and a status chip (Off · Connecting · Synced ·
Offline — retrying · Error: …). Copy states plainly that the key is stored
in this browser and that data goes to the URL the user entered.

- A failed `fetch` is opaque (CORS, the Chromium permission, mixed content
  and "Elasticsearch is down" all look the same), so a network failure shows
  a **checklist**, not one guessed cause; 401/403 are distinguishable and
  get their own messages. Copy points Safari/Chromium users at the
  served-from-localhost path.
- **Tests first:** component tests (Testing Library) for each status and
  error message (401, 403, network → checklist); an e2e spec (Playwright
  `page.route` standing in for Elasticsearch) that connects, creates a
  transaction and sees the `_bulk` request; the connect button is disabled
  until the test passes; a11y: fields labelled, status announced
  (`role="status"`).

### 7. Kibana: data views, dashboards, guide

- `docker/elasticsearch/kibana/jarin.ndjson` — saved objects: data views
  for each index (filter `_deleted: false`) and a dashboard: spend by jar,
  by sub-category, by month; allocation ledger; plan-vs-actual.
- `scripts/kibana-import.sh` to load it; `docs/ELASTICSEARCH.md` step-by-step
  (start Docker → create the API key → connect → open Kibana).
- **Tests first:** a script check that the ndjson parses and every saved
  object references an index pattern that exists in the templates (task 3),
  and that the import endpoint returns `success: true` against the compose
  stack in CI.

## Out of scope

- **Elasticsearch as the only store / a custom `RxStorage`** (ADR 0006).
- Hosted Elasticsearch hardening (Elastic Cloud, TLS termination, role
  design beyond a scoped API key). The URL is user-supplied, so it works,
  but only the localhost setup is supported and documented.
- Two-way schema evolution: a schema version bump needs a coordinated
  template update (tracked when the first bump happens).
- Encrypting the API key at rest in the browser.

## Test strategy

| Layer | Tooling | Runs in CI |
|---|---|---|
| Unit — client, config, handlers | Vitest, `fetch` stub + in-memory fake ES + in-memory RxDB | `check` job |
| Component — settings, status | Vitest + Testing Library | `check` job |
| e2e — connect flow | Playwright with `page.route` as ES | `e2e` job |
| Integration — real Elasticsearch | Vitest/Playwright against a GitHub Actions `services:` container (`npm run test:es`) | new `es-integration` job |
| Stack — persistence, snapshots | `scripts/es-stack-check.sh` | `es-integration` job |

## Changelog

- **2026-10-22** — task 1 (spike, #12) done, TDD: red (no stack) → red
  (stack, no CORS) → red (Chromium's Local Network Access, which a stubbed
  page can't distinguish from a real local one) → red (403: key lacked
  `monitor`) → green, 30 passed / 10 skipped across chromium,
  chromium-no-permission, firefox, webkit. Verdict and matrix in
  [ELASTICSEARCH.md](../ELASTICSEARCH.md); it changes #13 (add the app
  container, memory, ports), #16 and #17 (above).
- **2026-10-22** — spec drafted after the "keep my data in my own
  Elasticsearch" request; design chosen over a custom `RxStorage` (ADR 0006).
