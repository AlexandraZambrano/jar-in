# 0007 — Accumulation jars: target, progress, withdrawals

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §4
- **Depends on:** 0002, 0006

## Goal

Accumulation jars get a real goal experience: a target amount, a
balance-over-time view, and a first-class **withdrawal event** that is
not a normal expense — it carries a reason, shows as a marker on the
chart, and triggers an immediate re-projection.

## User stories

- As a user, I can open an accumulation jar and see balance vs. target
  with a timeline.
- As a user, I can record a withdrawal with an optional reason and see
  its effect on the goal.

## Acceptance criteria

1. `/jars/:id` for an accumulation jar shows: current balance, target,
   % to goal, and a balance-over-time chart with withdrawal markers.
2. "Withdraw" writes a `withdrawalEvents` doc (`amountMinor`, `date`,
   `reason?`); balance recomputes immediately everywhere.
3. Withdrawals appear on the timeline as labelled markers, distinct from
   contributions, and never as a `transactions` row.
4. A withdrawal fires the same "immediate re-projection" hook as an
   income change (feature 0009 consumes it).
5. Flow jars route `/jars/:id` to a simpler spent-vs-cap view (no
   withdrawal action).

## Data touched

`withdrawalEvents` (create/list/delete). Reads `jars`,
`transactions`.

## Screens / components

`features/jars/JarDetailPage.tsx` (routes: `/jars/:id` detail,
`/jars/:id/edit` editor), `BalanceTimeline.tsx` (inline SVG),
`timeline.ts` (pure series builder), `withdrawalsRepo.ts`. The withdraw
form is inline on the detail page rather than a separate sheet.

## Out of scope

Recurring-withdrawal pattern detection (Phase 3), editing a past
withdrawal's amount retroactively re-basing history.

## Test notes

Unit: balance with withdrawals, months-elapsed math, timeline series
builder. Hand-verified: withdraw flow + re-projection hook.

## Changelog

- **2026-09-07** — All criteria met.
  - **Routing changed:** `/jars/:id` is now the **detail** page;
    `/jars/:id/edit` is the editor. Jar list rows and dashboard jar cards
    go to detail.
  - Accumulation detail: balance / target headline, % to goal,
    goal-reached flag, a `BalanceTimeline` SVG (contribution accrual line
    + dashed target + red withdrawal markers with `<title>` tooltips),
    an inline withdraw form, and a deletable withdrawals list.
  - Flow detail (criterion 5): spent / cap headline + progress + a
    "This month" transaction list; no withdraw action.
  - `withdrawalsRepo` create/delete each call `emitReprojection('withdrawal')`.
  - `timeline.ts` (`buildBalanceTimeline`) is pure and unit-tested (4
    cases incl. "final point == `accumulationBalanceMinor`" and 0-clamp);
    `addMonths` added to `lib/date.ts` with tests.
  - Seed change: the two accumulation jars are back-dated 5 months with
    opening balances so the demo shows real progress (see
    `jarTemplate.ts` `openingMajor` / `startedMonthsAgo`).
  - Verified end-to-end (Playwright): open Safe fund → €2,600 / €5,000,
    52%; record €300 "Car repair" → €2,300, 46%, marker on chart,
    persists across reload; Essentials detail has no withdraw button.
