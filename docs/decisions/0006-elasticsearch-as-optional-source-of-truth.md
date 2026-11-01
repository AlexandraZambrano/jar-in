# ADR 0006 — Elasticsearch as an optional, user-hosted source of truth

- **Date:** 2026-10-22
- **Status:** proposed

## Context

A user wants to keep their Jars data in **their own** Elasticsearch (run
in Docker on their machine, with a volume so removing the container
doesn't lose data) and explore it in Kibana, with nothing leaving their
computer.

ADR 0002 made RxDB (IndexedDB, on-device) the single source of truth and
deferred all replication to Phase 5. The code today is built around it:
14 files read through `useRxQuery`, 22 touch collections directly, 9
collections in total.

Constraints that shaped the decision:

- A browser page can't safely hold a *shared* secret, but here the user
  owns both ends — their key, their Elasticsearch — so a client-side
  credential is acceptable.
- Elasticsearch is a search/analytics engine: near-real-time (a write is
  visible after the next refresh, ~1 s), no multi-document transactions,
  no referential integrity.
- The product promise is local-first and offline-capable (ADR 0002).

## Decision

- **Elasticsearch is the source of truth when the user connects it; RxDB
  stays as the on-device cache** that feeds every screen. They are kept
  in step by RxDB's **built-in replication protocol** with a custom
  `push`/`pull` over Elasticsearch's REST API. The cache can be rebuilt
  from Elasticsearch at any time.
- **Opt-in and local by default.** Not connected = today's behaviour.
  Config (`url`, API key) lives in `localStorage`, is never replicated, and
  the API key is scoped to `jarin-*` indices.
- **Soft deletes** (`_deleted: true`) and **last-write-wins on
  `updatedAt`** enforced with Elasticsearch **external versioning**, so
  the server — not only the client — rejects stale writes. This is the
  LWW strategy ADR 0002 already documented for Phase 5; this feature is
  the first consumer.
- Persistence is the user's Docker **named volume**, plus a snapshot
  repository and daily snapshot policy in the provided compose file.

This amends ADR 0002: "RxDB is the single source of truth, no replication
code" becomes "RxDB is the source of truth **unless an Elasticsearch
connector is enabled**, in which case it is the cache of record for
reads". Replication code now exists, but only runs when opted in; the
Supabase path in Phase 5 reuses the same protocol.

## Alternatives considered

- **Custom `RxStorage` backed by Elasticsearch** (RxDB writes straight to
  ES, IndexedDB unused). Cleanest on paper — screens unchanged and no
  second copy — but the storage interface is large (Mango query
  evaluation, revision handling, change streams, cleanup), Elasticsearch's
  refresh delay breaks read-after-write, and the app would stop working
  with Docker off. Far more work for an outcome the cache design already
  delivers.
- **Replace RxDB with an Elasticsearch data layer.** Rewrites 36 files,
  forces a second code path for users who don't connect Elasticsearch,
  and drops offline.
- **One-way mirror (export only).** Cheapest, but then Elasticsearch is a
  copy, not where the data lives, and a cleared browser loses data the
  user believed was in their stack.
- **Backend relay with accounts** (Supabase/Postgres, Phase 5). Right for
  multi-user sharing; unnecessary for a user running their own stack, and
  it needs infrastructure this project doesn't have yet.

## Consequences

- **Good:** screens, repos and compute are untouched; offline still works;
  data survives a cleared browser; Kibana works on real data; the
  replication plumbing is reusable for Phase 5.
- **Cost:** a second copy of the data exists (the cache) — acceptable
  because it is rebuildable and RxDB owns its consistency.
- **Risks, each with a task in spec 0016:** browser↔localhost behaviour
  varies by engine — **measured by the spike (#12)**: it works from a page
  served on localhost in every engine, and from the public site only in
  Firefox and in Chromium after a user permission, so the supported path is
  serving Jars from localhost next to Elasticsearch (see
  `docs/ELASTICSEARCH.md`); an Elasticsearch outage degrades to offline mode; a lost
  volume loses the ledger unless the snapshot policy is working; deleted
  documents are tombstones, so dashboards must filter them.
- Single-device is the supported mode; two browsers on one Elasticsearch
  converge by LWW but aren't a headline feature.
- The user's data is only as safe as their Docker host — documented, not
  mitigated by the app.
