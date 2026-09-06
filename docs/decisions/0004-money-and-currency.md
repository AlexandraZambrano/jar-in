# ADR 0004 — Money & currency representation

- **Date:** 2026-09-06
- **Status:** accepted

## Context

`SPEC.md` §6 requires ledger entries stored in their original currency
and never destructively converted on write; display-currency rollup uses
a cached FX table (Phase 2).

## Decision

- Store money as an **integer `*Minor` field** (smallest currency unit,
  e.g. cents) plus an ISO-4217 `currency` string. No floating point in
  storage or math.
- All parsing/formatting goes through `src/lib/money.ts`
  (`toMinor`, `fromMinor`, `formatMoney`, `addMinor`) using
  `Intl.NumberFormat`.
- v1 assumes **one currency** across a user's data for computed rollups.
  If income sources or transactions mix currencies, compute per-currency
  and show a "mixed currencies — conversion arrives in Phase 2" notice
  rather than guessing a rate.
- `fxRates` schema exists from v0 but is unused in v1.
- Currency decimal digits: default 2; a small override table for known
  exceptions (JPY 0, etc.) lives in `money.ts`. Extend as needed.

## Consequences

- No rounding drift; totals are exact.
- Genuinely multi-currency users get a correct-but-limited v1 and a
  clear upgrade path.
- Every money value in the UI must pass through `formatMoney` — enforced
  by review + a lint note, not yet by a custom rule.
