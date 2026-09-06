# 0006 — Dashboard (Home)

- **Status:** ✅ done (numbers become fully real once 0004 income + 0005 transactions land)
- **Phase:** 1
- **Spec refs:** SPEC.md §4, §7, §8.2; DESIGN-STICKER-SHEET.md §3
- **Depends on:** 0001, 0002 (0004 income, 0005 transactions make the numbers real)

## Goal

The Home screen from the Sticker Sheet design: the month's allocated
total, a plan-vs-actual allocation donut, a jar card per jar with its
computed planned / spent / balance and progress, and a coach note. Every
number is computed deterministically from the raw documents.

## User stories

- As a user, I open the app and immediately see how this month's income
  is split across jars and how each one is tracking.
- As a user, I get one plain-language nudge (the coach note) about the
  most useful thing to act on.

## Acceptance criteria

1. Header shows the current month and **monthly income** (Σ active
   income sources normalised to monthly — see DATA-MODEL.md compute
   model). With no income sources it shows `€0` and a hint to add one.
2. Allocation donut: inner ring = planned split from jar percentages,
   outer ring = actual (flow: spent this month; accumulation:
   contributed-so-far). Centre shows the monthly total. One icon-bubble
   per jar on the ring.
3. One `JarCard` per jar (ordered by `order`): icon chip, name, type
   badge, percentage, a computed line
   (`Flow · €X of €Y spent` / `Growth · €X of €Y`), and a `ProgressBar`
   at the correct ratio. Flow over cap and accumulation goal-met each
   get a distinct treatment + text/glyph (not colour alone).
4. Coach note (Paper Ledger style per design §3.3): rule-based in v1 —
   if `Σ percentage ≠ 100`, say by how much and suggest the fix; else a
   neutral status line. Rendered with the hard-offset paper treatment;
   swaps to a legible face under `calm` / `cvd`.
5. All values come from `features/dashboard/compute.ts` pure functions,
   unit-tested. Nothing pre-computed is stored; the AI layer is not
   involved.
6. Renders correctly in light, dark, `calm`, `cvd`, and combinations;
   no horizontal scroll at 360px width.

## Data touched

Reads `jars`, `incomeSources`, `transactions`, `withdrawalEvents`. No
writes.

## Screens / components

`features/dashboard/DashboardPage.tsx`, `JarCard.tsx`, `compute.ts`.
Reuses `AllocationDonut`, `CoachNote`, `ProgressBar`, `Sticker`, `icons`.

## Out of scope

Tapping a jar → jar detail screen (feature 0007 area), the "+" add flow
(0005), AI-worded coaching (Phase 3), multi-currency rollup (Phase 2).

## Test notes

Unit: `monthlyIncome`, `jarPlanned`, `flowSpentThisMonth`,
`accumulationBalance`, `planHealth`, coach-note selection — with
fixture documents. Hand-verified: donut proportions, all theme/a11y
combinations.

## Changelog

- **2026-09-06** — Donut, jar cards, computed lines, rule-based coach
  note implemented against seed data. Compute functions unit-tested (11
  cases). Verified in light / dark / cvd / calm — screenshots in
  `docs/screenshots/`. Follow-up: dark-mode jar cards still use candy
  fills rather than the spec's raised-dark-surface + hue-edge treatment.
