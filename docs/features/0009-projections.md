# 0009 — Deterministic projections

- **Status:** ⬜ not started
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

`features/projections/project.ts`, surfaced in `JarDetailPage` and the
dashboard `CoachNote`.

## Out of scope

AI narration of the projection (Phase 3), Monte-Carlo / variance bands,
seasonality modelling.

## Test notes

Unit-heavy: fixtures for steady, accelerating, decelerating and
withdrawal-punctuated histories; assert monotonic sensible outputs.

## Changelog

- _none yet_
