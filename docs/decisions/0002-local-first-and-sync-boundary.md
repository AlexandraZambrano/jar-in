# ADR 0002 — Local-first, and where sync stops for v1

- **Date:** 2026-09-06
- **Status:** accepted

## Context

`SPEC.md` §10 wants a local-first PWA where the on-device DB is the
source of truth and Supabase is a passive replication endpoint, with
household sharing gated by RLS.

## Decision

- v1 is **device-only**. RxDB is the single source of truth; there is no
  network dependency for any read or write.
- No Supabase, no auth, no replication code in v1. The `RxdbProvider`
  init is the "unlock" seam — PIN/biometric and replication plug in
  there later without touching feature code.
- Schemas already carry `updatedAt` (LWW tiebreaker) and `transactions`
  carries `sourceType` + `externalAccountId` + `externalTransactionId`
  so Phase 5 sync and Phase 6 bank sync need **no migration**.
- Conflict strategy (documented now, implemented Phase 5):
  last-write-wins per field + a visible change history. No CRDTs.

## Consequences

- Fastest possible UX; fully offline from day one.
- Multi-device / household is explicitly deferred — users are told v1 is
  single-device.
- We must keep all business logic in pure functions over documents so it
  stays correct once replication introduces out-of-order writes.
