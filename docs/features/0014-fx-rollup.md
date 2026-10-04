# 0014 — Multi-currency rollup (cached FX)

- **Status:** 🟡 in review — [#3](https://github.com/AlexandraZambrano/jar-in/issues/3)
- **Phase:** 2
- **Spec refs:** SPEC.md §6 Multi-Currency, ADR 0004 (money & currency)
- **Depends on:** 0013 (allocation engine reads monthly income)

## Goal

Income sources can be in any currency (the income editor has a currency
picker), but `monthlyIncome` summed their minor units raw — USD 1,000 +
EUR 1,000 came out as "2,000", labelled with whichever currency the first
source used, and every jar's planned amount was built on that number.
Convert foreign income into the **home currency** (the jars' currency)
at a cached ECB rate before summing, so the income total, every jar's
planned amount and the allocation ledger are right.

## Where currencies actually mix (why the scope is income)

Jars all share one currency (new jars copy the first jar's; there's no
picker). Transactions, withdrawals and CSV imports take the jar's
currency. Wallets have their own currency but no computation reads them.
So income sources are the only place foreign money enters any number
today.

## Acceptance criteria

1. `convertMinor(minor, from, to, rates)` in `lib/money.ts` — identity for
   the same currency, converts through major units (so JPY's 0 decimals vs
   EUR's 2 are right), `null` when there's no rate.
2. `syncFxRates(db)` fetches `api.frankfurter.dev/v1/latest?base=<home>`
   and upserts the `fxRates` rows (`<home>_<quote>`). **No request** when
   no active income is foreign, or a row for the home base is < 24 h
   old. Offline / HTTP error → keep the cached rates, never throw.
3. `monthlyIncome(sources, home, rates)` converts each recurring source
   into the home currency. Result: `minor` (home), `converted` (foreign
   currencies included via FX), `unconverted` (foreign currencies with no
   rate — left out of the total).
4. `syncAllocationEvents` **defers** (posts nothing) while any active
   income is unconverted, so a month is never frozen at a total that's
   missing income. It catches up once rates arrive.
5. Rates refresh on app open (after render — network never blocks the
   UI; allocations re-sync if rates were fetched) and after any income
   create/update.
6. Dashboard and Income page show the total in the home currency, with
   one muted line saying which currencies were converted (and that rates
   are ECB, via Frankfurter), or which couldn't be converted yet.

## Data touched

`fxRates` (existing collection, previously unused) — written for the
first time. No schema change.

## Screens / components

Dashboard notice, Income page total + notice. New hook
`income/useMonthlyIncome.ts` replaces the per-page
`useRxQuery(incomeSources) + monthlyIncome()` pair on Dashboard, Income,
jar detail and Insights.

## Out of scope

- **A separate display-currency switch** (view everything in another
  currency). All jar-denominated data shares one currency, so there's
  nothing to roll up yet — revisit when jars can differ in currency
  (Phase 4 households).
- **Historical rates.** Income converts at today's rate; the allocation
  ledger freezes each month's converted amount when it posts, which is
  what keeps history stable.
- Currencies Frankfurter doesn't publish (it's the ECB set, ~30) stay
  `unconverted` and are called out in the notice.

## Test notes

- Unit: `convertMinor`; `monthlyIncome` conversion + unconverted;
  `syncFxRates` against in-memory RxDB with a stubbed `fetch` (no call
  when all-home or fresh, writes rows, survives a network error);
  allocation deferral.
- Hand-verified: add a USD income on the preview build → total converts,
  notice shows.

## Changelog

- **2026-09-29** — spec drafted and built in the same pass.
- **2026-09-30** — all 6 acceptance criteria met.
  - New `useMonthlyIncome()` hook replaced the per-page income query +
    `monthlyIncome()` call on Dashboard, Income, jar detail and Insights.
    The Income page total had its own copy of the bug (labelled with the
    first source's currency) — fixed by the same change.
  - Tests: `convertMinor` (identity, JPY decimals, missing rate),
    `monthlyIncome` conversion/unconverted, `fxNote`, `syncFxRates`
    against in-memory RxDB with a stubbed `fetch` (no call when all-home
    or fresh, caches rows, survives offline), allocation deferral then
    catch-up at the converted total. 99 unit tests, 9/9 e2e.
  - Hand-verified on the preview build: starter set (€2,400) makes **no**
    FX request; adding a $1,000/mo income makes exactly one and the
    total becomes €3,280.67 ($1,000 ÷ 1.1355 = €880.67), with the "Includes
    USD income at today's ECB rate" note on Dashboard and Income.
