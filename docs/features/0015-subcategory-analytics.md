# 0015 — Sub-category analytics

- **Status:** 🟡 in review — [#4](https://github.com/AlexandraZambrano/jar-in/issues/4)
- **Phase:** 2
- **Spec refs:** SPEC.md §4 (sub-categories: "analytics … can report at
  either level"), §8.2 (narration uses "sub-category breakdowns")
- **Depends on:** 0002 (sub-categories), 0005 (transactions)

## Goal

Transactions have carried an optional sub-category since 0005, but
nothing reads it back beyond a label in the list. Show where a jar's
money went this month, by sub-category, next to last month — the
breakdown the Phase 3 narration will also consume.

## Acceptance criteria

1. Pure `subCategoryBreakdown(jarId, subs, txns, ref?)` in
   `transactions/compute.ts` → rows `{ subCategoryId, name, minor, share,
   prevMinor }`: this month's spend per sub-category, its share of the
   jar's month, and last month's figure.
2. Transactions with no sub-category — or one that isn't this jar's —
   roll up as **Uncategorised**. Rows empty in both months are dropped.
   Largest first.
3. The flow jar detail shows a **Where it went** card above the "This
   month" list when the jar has at least one sub-category and there's
   spend this month or last: one row per sub-category with amount, share
   bar and "€X last month".
4. Deterministic and unit-tested (month boundaries, uncategorised,
   foreign sub-ids, empty rows dropped, shares sum to 1).

## Data touched

Read-only: `transactions`, `subCategories`. No schema change.

## Screens / components

`JarDetailPage` (flow branch) — new card, reuses `Sticker` and
`ProgressBar`.

## Out of scope

- Trends beyond last month / charts over time — the two-month
  comparison answers "what changed", the question the coach will ask.
- An Insights-page rollup across jars — sub-categories are per jar, and
  the jar detail is where you manage them.
- Accumulation jars — their outflows are withdrawal events, which have a
  reason, not a sub-category.

## Test notes

Unit: `subCategoryBreakdown`. Hand-verified on the preview build.

## Changelog

- **2026-09-30** — spec drafted and built in the same pass. All 4
  acceptance criteria met: 4 unit tests for `subCategoryBreakdown` (103
  total). Hand-verified on the preview build with tagged spend this month
  and last: Rent €450 (75%) / Groceries €120 (20%) / Uncategorised €30
  (5%), and Energy shown at €0 with "€65.00 last month". New
  `jar-detail-breakdown.png` screenshot in the README; `shots.mjs` now
  tags the seeded Essentials spend with sub-categories.
