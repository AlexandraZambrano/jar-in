# 0004 — Income sources

- **Status:** ⬜ not started
- **Phase:** 1
- **Spec refs:** SPEC.md §7
- **Depends on:** 0001, 0003

## Goal

Income is modelled as multiple named sources, each with an amount,
currency, frequency and destination wallet. Their sum drives every
jar's funded amount on the dashboard.

## User stories

- As a user, I can add several income sources (salary, freelance, …),
  edit them, toggle one active/inactive, and delete them.
- As a user, when I change income, the dashboard's planned amounts
  update immediately.

## Acceptance criteria

1. `/income` lists sources: name, amount + currency, frequency, active
   toggle, destination wallet.
2. Create / edit: name (required), amount (money input > 0), currency,
   frequency (`monthly | weekly | biweekly | yearly | once`),
   destination wallet (from 0003), active (default true).
3. The dashboard's monthly-income figure and every jar's planned amount
   recompute live on any change (add / edit / toggle / delete).
4. Editing an income source is called out as an "immediate
   re-projection" trigger in code comments / event hook, ready for the
   Phase 3 AI explanation — but v1 just recomputes silently.
5. `once` sources are excluded from the recurring monthly figure (shown
   with a note).

## Data touched

`incomeSources` (CRUD). Reads `wallets`.

## Screens / components

`features/income/IncomePage.tsx`, `IncomeEditPage.tsx`,
`incomeRepo.ts`. Reuses `CurrencyPicker`, money input.

## Out of scope

Proportional-to-income contribution rules (Phase 4), FX conversion when
sources are in different currencies (Phase 2 — v1 warns if mixed).

## Test notes

Unit: frequency → monthly normalisation, mixed-currency guard.
Hand-verified: live dashboard recompute.

## Changelog

- _none yet_
