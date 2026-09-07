# 0009 — Deterministic projections

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §8.3
- **Depends on:** 0004, 0007

## Goal

For each accumulation jar, estimate the goal date from its growth rate
using deterministic math (EMA / simple linear regression on
contributions), recomputed immediately on withdrawal, income change or
percentage change. Plain numbers only — the AI wording is Phase 3.

## Acceptance criteria

1. `projectGoalDate(jar, history, monthlyContribution)` returns
   `{ date, monthsRemaining, confidence }` or `null` (target met /
   contribution ≤ 0).
2. Two methods available: EMA of recent monthly deltas, and least-squares
   slope; the jar detail shows the estimate and which method.
3. Recompute is triggered synchronously by the re-projection hook
   (income/percentage/withdrawal change) — no scheduled job.
4. The dashboard coach note can surface the single most notable change
   ("Safe fund now finishes 2 months sooner") from the last recompute.
5. Pure, unit-tested, timezone-safe (whole-month granularity).

## Data touched

Reads `withdrawalEvents`, `incomeSources`, `jars`, `transactions`.
Writes nothing (projection is derived).

## Screens / components

`features/projections/project.ts` (`projectGoalDate`,
`monthlyBalanceSeries`), `features/projections/tracker.ts` (remembers the
last run so the coach note can call out a shift). Surfaced on
`JarDetailPage` (with an EMA / trend-line toggle), the dashboard
`CoachNote`, and a new `/insights` page (`InsightsPage`) listing every
accumulation jar's projected goal date.

## Out of scope

AI narration of the projection (Phase 3), Monte-Carlo / variance bands,
seasonality modelling.

## Test notes

Unit-heavy: fixtures for steady, accelerating, decelerating and
withdrawal-punctuated histories; assert monotonic sensible outputs.

## Changelog

- **2026-09-07** — All criteria met.
  - `projectGoalDate(jar, monthlyBalances, plannedContributionMinor, opts?)`
    → `{ method, ratePerMonthMinor, monthsRemaining, date, confidence }`
    or `null` (no target / met / not growing). Two methods: EMA of
    monthly deltas (α=0.5) and least-squares slope; default is
    regression once ≥4 monthly deltas exist, EMA otherwise. Confidence
    (low/medium/high) from the coefficient of variation of the deltas +
    history length. With <2 deltas it falls back to the planned
    contribution rate at low confidence. Pure, whole-month, tz-safe.
  - `monthlyBalanceSeries` derives the month-end balance series that
    feeds it; `series.at(-1)` equals `accumulationBalanceMinor`.
  - Jar detail (accumulation): a projection card with the estimate,
    method, confidence, rate/mo, and a moving-average / trend-line
    toggle. Consistent default with the dashboard/insights (no
    hard-coded method).
  - `/insights` is now a real page — per accumulation jar: balance /
    target and the projected goal date, method and confidence.
  - `tracker.ts` keeps the previous run's `monthsRemaining` per jar; the
    dashboard records after every recompute and the coach note shows the
    single biggest shift ("Safe fund now reaches its goal 8 months later
    than before"). A transient loading render can't wipe the baseline.
  - Recompute is synchronous with the data change (income / % / withdrawal
    edits flow through RxDB + `emitReprojection`); no scheduled job.
  - 43 unit tests (project ×9, tracker ×6). Verified end-to-end: record a
    €900 withdrawal on Safe fund → jar detail goal moves Apr 2027 → Dec
    2027, EMA view flips to "not growing", and returning to the dashboard
    shows the "8 months later" coach note.
