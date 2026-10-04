# 0013 — Period-allocation engine

- **Status:** 🟡 in review — [#2](https://github.com/AlexandraZambrano/jar-in/issues/2)
- **Phase:** 2
- **Spec refs:** DATA-MODEL.md §v1 computation model, ROADMAP.md Phase 2
- **Depends on:** 0007 (accumulation jars), 0009 (projections)

## Goal

Every jar balance today is `opening + wholeMonthsSince(startedAt) × currentPlannedPerMonth`
— a synthetic multiplier recomputed on every read. Change the percentage or
the income and the entire history silently reprices itself, which is wrong:
money that already "arrived" in a past month shouldn't move when this
month's split changes. Replace the multiplier with a real ledger: one
`allocationEvent` per jar per whole month elapsed, valued at whatever the
jar's planned amount was **at the moment it posted**, never rewritten
afterwards.

## User stories

- As a user, when I change a jar's percentage, I want past months' balances
  to stay what they were, so my history reflects what actually happened.
- As a user, I want a jar's balance-over-time chart to show real posting
  dates and amounts, not a straight synthetic line.

## Acceptance criteria

1. New `allocationEvents` collection: `{ id, jarId, amountMinor, currency,
   date, createdAt, updatedAt }`.
2. `syncAllocationEvents(db, ref?)` posts exactly one event per jar per
   whole month elapsed since `startedAt` that hasn't been posted yet, valued
   at `jarPlannedMinor` **as of the call**. Idempotent — safe to call every
   app open. No-ops when there's no income or the jar's planned amount is 0.
3. Runs once per session in `RxdbProvider`, before the app renders, so
   every screen reads caught-up data. Also runs at the end of
   `seedExampleData` (the only path that can insert an already-aged jar).
4. `accumulationBalanceMinor` / `flowRunningBalanceMinor` become
   `opening + Σ posted allocations − Σ debits` — no more month arithmetic,
   no `ref` param.
5. `buildBalanceTimeline` plots real allocation events instead of a
   synthetic monthly loop; `monthlyBalanceSeries` samples the real ledger
   at each month boundary instead of `k × plannedPerMonth`.
6. Editing a jar's percentage or income does not change already-posted
   allocation amounts — only events posted after the change use the new
   figure.
7. `wipeForRestart` (onboarding "start over") also clears
   `allocationEvents`, matching `withdrawalEvents`.

## Data touched

New collection `allocationEvents` (schemas/allocationEvent.ts, registered in
database.ts). No changes to existing schemas. DATA-MODEL.md updated.

## Screens / components

No new screens. Dashboard, jar detail (chart + headline), Insights
(projections) all read through the same compute functions — updated call
sites pass the jar's allocation events through.

## Out of scope

- No UI to view/edit individual allocation events (a future ledger view).
- No retroactive backfill/migration for a DB that already has jars aged
  past their `startedAt` from *before* this feature — `syncAllocationEvents`
  simply catches up on next open, same as any other jar.
- Manual/off-cycle allocations (a "post now" button) — the cadence stays
  calendar-monthly, matching `jarPlannedMinor`.

## Test notes

- Unit: `allocationsRepo.syncAllocationEvents` (idempotency, catch-up count,
  no-op on zero income/percentage, values frozen at posting time).
  `accumulationBalanceMinor`, `flowRunningBalanceMinor`,
  `buildBalanceTimeline`, `monthlyBalanceSeries` — signatures now take real
  events, existing test coverage adapted.
- Hand-verified: dashboard/jar-detail/insights render unchanged for the
  existing seed data (back-dated jars still show the same numbers, since
  income/percentage never change in the seed).

## Changelog

- **2026-09-29** — spec drafted and built in the same pass (issue
  [#2](https://github.com/AlexandraZambrano/jar-in/issues/2)).
  - All 7 acceptance criteria met. `compute.ts` lost its month
    arithmetic entirely (balances are now plain sums over the ledger);
    `timeline.ts` lost its synthetic accrual loop.
  - `allocationsRepo.test.ts` runs the engine against a real in-memory
    RxDB: catch-up count, idempotency, **frozen amounts across a
    percentage change**, and no-ops for young jars / zero income.
    88 unit tests (was 81), 9/9 e2e.
  - Hand-verified on the preview build: skip-seed shows Investment
    €4,200 / Safe fund €2,600 with no reload (same as before — seed.ts's
    own sync call works); bumping Investment 25% → 50% moves its rate to
    €1,200/mo but keeps the balance at €4,200 (the old model would have
    jumped to €7,200); a full reload posts nothing new (10 ledger rows =
    5 × €600 + 5 × €360).
- **2026-09-29** — race fix (before merge). Two concurrent syncs — React
  StrictMode's double effect in `npm run dev`, or two open tabs
  (`multiInstance`) — each read "0 posted" and double-posted any month
  that was due. Allocation ids are now deterministic (`<jarId>_<date>`)
  and written with `bulkInsert`, so a second writer collides on the
  primary key (reported in `.error`, not thrown; first writer wins, a
  posted amount is never overwritten). New test runs two syncs in
  parallel: 6 rows before the fix, 3 after. 89 unit tests.
