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
| 0002 | Jars — default template, create/edit (name, %, type, colour, icon, pattern, sub-categories) | [features/0002-jars.md](features/0002-jars.md) | ✅ |
| 0003 | Wallets — personal wallets with currency | [features/0003-wallets.md](features/0003-wallets.md) | ✅ |
| 0004 | Income sources — multiple, editable, drive jar funding | [features/0004-income-sources.md](features/0004-income-sources.md) | ✅ |
| 0005 | Transactions — manual entry + list, tagged to jar/sub-category | [features/0005-transactions.md](features/0005-transactions.md) | ✅ |
| 0006 | Dashboard — allocation donut, jar cards, computed coach note | [features/0006-dashboard.md](features/0006-dashboard.md) | ✅ |
| 0007 | Accumulation jars — target, progress, withdrawal events | [features/0007-accumulation-and-withdrawals.md](features/0007-accumulation-and-withdrawals.md) | ✅ |
| 0008 | CSV import of transactions | [features/0008-csv-import.md](features/0008-csv-import.md) | ✅ |
| 0009 | Deterministic projections (goal date for accumulation jars) | [features/0009-projections.md](features/0009-projections.md) | ✅ |
| 0010 | PWA polish — install prompt, offline UX, iOS storage nudge | [features/0010-pwa-polish.md](features/0010-pwa-polish.md) | ✅ |
| 0011 | First-run onboarding (questionnaire → proposed jars) & app tour | [features/0011-first-run-onboarding.md](features/0011-first-run-onboarding.md) | ✅ |
| 0012 | Fix pack — inline delete confirm, growth-jar monthly figure, Calm/CVD colour behaviour, flow-jar opening balance | [features/0012-fix-pack.md](features/0012-fix-pack.md) | ✅ |
| — | CI/CD pipeline — lint + typecheck + tests gate before deploy | [DEPLOYMENT.md](DEPLOYMENT.md) | ⬜ (proposed) |

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
- **2026-09-07** — **0002 ✅ complete** — sub-category editor (add/rename/reorder/remove) on the jar screen, working for both existing and not-yet-created jars. 23 unit tests green. **Phase 1 status: 0001–0006 all ✅; remaining 0007–0010.**
- **2026-09-07** — **0007 ✅ accumulation jars & withdrawals** — new jar detail page (`/jars/:id`; editor moved to `/jars/:id/edit`) with balance/target, an SVG balance-over-time chart, inline withdraw form + withdrawals list; flow jars get a simpler spent-vs-cap detail. `emitReprojection('withdrawal')` wired for 0009. 28 tests green. **Remaining: 0008 CSV import, 0009 projections, 0010 PWA polish.**
- **2026-09-07** — **0009 ✅ deterministic projections** — `projectGoalDate` (EMA + least-squares, confidence, null cases), a projection card on the accumulation jar detail with a method toggle, a real `/insights` page, and a coach-note that calls out the biggest goal-date shift after a change. 43 tests green. **Remaining: 0008 CSV import, 0010 PWA polish.**
- **2026-09-07** — **0008 ✅ CSV import** — client-side parser (quotes / delimiters / BOM), a 3-step wizard (file → column mapping with auto-guess → preview with per-row jar), `sourceType: "csv_import"`, and session dedupe on a content hash. 56 tests green. **Only 0010 PWA polish left for Phase 1.**
- **2026-09-07** — **0010 ✅ PWA polish** — rasterised icon set (192/512/maskable/apple), full manifest, Workbox precache + font runtime-cache, an offline bar, a `beforeinstallprompt` card + iOS "Add to Home Screen" nudge, and `navigator.storage.persist()` on boot surfaced in Settings. Storage-eviction spike documented. **Phase 1 (core ledger, single user) is complete — all of 0001–0010 done.**
- **2026-09-07** — Post-review: drafted **0011** (first-run onboarding & tour) and a **DEPLOYMENT.md** CI proposal. Shipped **0012 ✅ fix pack** — the P0 "delete does nothing" (`window.confirm` was being suppressed → `ConfirmButton`), growth jars now show `€Z/mo` on Home, Calm mode mutes jar colours, colour-blind mode no longer forces patterns (now a separate "Add patterns to jars" toggle), flow jars can take an opening balance and get a running-balance chart. 60 tests green.
- **2026-09-07** — Fixed money/date formatting to a fixed English `APP_LOCALE` (was following the device locale). 61 tests.
- **2026-09-07** — **0011 ✅ first-run onboarding & tour** — the automatic seed is gone; a new user gets a 6-question flow → a deterministic jar proposal (`proposeJars`, always 100%) → an editable review that creates their wallet/income/jars, then a 4-step coach-mark tour. "Skip — use a starter set" seeds the old example data. 79 tests green. **Next: CI pipeline from DEPLOYMENT.md.**
