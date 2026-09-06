# Roadmap & Status

Living status board. Update the **Status** column and the **Log** at the
bottom on every change. Source of truth for *what* to build is
[`SPEC.md`](SPEC.md); *how it looks* is
[`DESIGN-STICKER-SHEET.md`](DESIGN-STICKER-SHEET.md).

Status legend: ⬜ not started · 🟡 in progress · ✅ done · ⏸ paused

---

## Phase 1 — Core ledger, single user

No sharing, no AI, no real bank sync. Goal: a person can define jars and
percentages, record income and spending, and see where they stand — all
offline, on-device.

| # | Feature | Spec | Status |
|---|---|---|---|
| 0001 | Foundation & app shell (Vite/React/TS, PWA, RxDB, tokens, routing, theme + a11y modes) | [features/0001-foundation-and-shell.md](features/0001-foundation-and-shell.md) | ✅ |
| 0002 | Jars — default template, create/edit (name, %, type, colour, icon, pattern, sub-categories) | [features/0002-jars.md](features/0002-jars.md) | 🟡 |
| 0003 | Wallets — personal wallets with currency | [features/0003-wallets.md](features/0003-wallets.md) | ✅ |
| 0004 | Income sources — multiple, editable, drive jar funding | [features/0004-income-sources.md](features/0004-income-sources.md) | ✅ |
| 0005 | Transactions — manual entry + list, tagged to jar/sub-category | [features/0005-transactions.md](features/0005-transactions.md) | ✅ |
| 0006 | Dashboard — allocation donut, jar cards, computed coach note | [features/0006-dashboard.md](features/0006-dashboard.md) | ✅ |
| 0007 | Accumulation jars — target, progress, withdrawal events | [features/0007-accumulation-and-withdrawals.md](features/0007-accumulation-and-withdrawals.md) | ⬜ |
| 0008 | CSV import of transactions | [features/0008-csv-import.md](features/0008-csv-import.md) | ⬜ |
| 0009 | Deterministic projections (goal date for accumulation jars) | [features/0009-projections.md](features/0009-projections.md) | ⬜ |
| 0010 | PWA polish — install prompt, offline UX, iOS storage nudge | [features/0010-pwa-polish.md](features/0010-pwa-polish.md) | ⬜ |

## Phase 2 — Multi-currency & richer jars

- Display-currency rollup with cached FX table (Frankfurter)
- Period-allocation engine (income actually posts to jars each cycle)
- Sub-category analytics

## Phase 3 — AI layer (Groq)

- Onboarding agent, narration/coaching, AI-worded projections & rebalancing

## Phase 4 — Household sharing

- Multi-user sync, contribution rules across wallets, personal-jar privacy, Supabase RLS

## Phase 5 — Sync & platform

- Supabase replication, conflict resolution + change history, install-to-home-screen flows

## Phase 6+

- Bank sync (GoCardless), shared analytics, native packaging

---

## Log

- **2026-09-06** — Repo bootstrapped. Product spec + Sticker Sheet design spec in place. Started Phase 1: foundation scaffold, DB schemas, design tokens, app shell, dashboard + jars first slice, theme/a11y settings.
- **2026-09-06** — First slice landed and verified (`npm run check` green, browser-checked, screenshots captured). **0001 ✅**, **0006 ✅**, 0002 🟡 (sub-category editor + delete-guard still to do). README + `npm run shots` added.
- **2026-09-06** — **0003 ✅ wallets**, **0004 ✅ income sources**, **0005 ✅ transactions** (keypad add flow + grouped list + jar filter + Unassigned/reassign). Shared `CurrencyPicker` + `reprojection` hook added. 0002 delete-guard (crit. 6) done; only its sub-category editor remains. Dashboard "spent" + donut now driven by real transactions. 20 unit tests green; flows verified end-to-end with Playwright.
