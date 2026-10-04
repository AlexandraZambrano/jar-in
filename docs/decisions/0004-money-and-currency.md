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
- All computed rollups run in one **home currency** — the jars' currency.
  Foreign-currency income converts into it at a cached ECB rate
  (Frankfurter, refreshed at most daily, only when foreign income
  exists). A currency with no rate is left out and called out in the UI —
  never summed raw and never guessed. *(Amended 2026-09-30, feature 0014;
  was "compute per-currency and show a notice until Phase 2".)*
- The ledger is never converted on write: income sources keep their own
  currency. The allocation ledger (0013) freezes each month's converted
  amount when it posts, which is what keeps history stable as rates move.
- Currency decimal digits: default 2; a small override table for known
  exceptions (JPY 0, etc.) lives in `money.ts`. Extend as needed.
- **The UI is English-only.** All money and date formatting uses a fixed
  `APP_LOCALE = 'en-GB'` (`src/lib/locale.ts`), never `navigator.language`
  — otherwise a Spanish device would render "2.100,00 € · abril de 2027"
  next to hard-coded English copy. The device locale is used *only* to
  guess a default currency for a new wallet/income source
  (`deviceLocale()` → `defaultCurrencyForLocale`), since currency ≠
  language. When app localisation is added later, `APP_LOCALE` becomes a
  setting.

## Consequences

- No rounding drift; totals are exact.
- Genuinely multi-currency users get a correct-but-limited v1 and a
  clear upgrade path.
- Every money value in the UI must pass through `formatMoney` — enforced
  by review + a lint note, not yet by a custom rule.
