# Progress log

Newest first. One entry per working session or merged feature. Keep it
factual: what changed, what's verified, what's next.

---

## 2026-09-07 — Feature 0007: accumulation jars & withdrawal events

**Added**

- **Jar detail page** (`JarDetailPage`) at `/jars/:id`; the editor moved
  to `/jars/:id/edit`. Jar-list rows and dashboard jar cards now open
  detail.
  - Accumulation: balance / target headline, % to goal, goal-reached
    flag, `BalanceTimeline` SVG (accrual line + dashed target line + red
    withdrawal markers with tooltips), an inline withdraw form, and a
    deletable withdrawals list.
  - Flow: spent / cap headline + progress + "This month" transactions;
    no withdraw action.
- `timeline.ts` — pure `buildBalanceTimeline` (contributions accrue at
  whole-month boundaries, withdrawals subtract on their date, 0-clamped;
  final point matches `accumulationBalanceMinor`). `withdrawalsRepo`
  (create/delete → `emitReprojection('withdrawal')`). `addMonths` added
  to `lib/date.ts`.
- Seed: accumulation jars back-dated 5 months with opening balances
  (`jarTemplate.ts` `openingMajor` / `startedMonthsAgo`) so the demo
  shows real progress.

**Verified**

- `npm run check` green — 28 unit tests (timeline builder ×4, addMonths).
- End-to-end (Playwright): Safe fund → €2,600 / €5,000 (52%); record
  €300 "Car repair" → €2,300 (46%) with a chart marker; persists across
  reload; Essentials detail has no withdraw button. Screenshots refreshed
  (jar-detail-flow / -accumulation / -withdrawal; jar-edit now via the
  Edit link).

**Next**

- 0009 projections (EMA / regression → goal date; consumes the
  reprojection hook), 0008 CSV import, 0010 PWA polish.

---

## 2026-09-07 — Feature 0002 completed: sub-category editor

**Added**

- `SubCategoryEditor` component + `subCategoriesRepo` (add / rename /
  move up-down / remove) wired into the jar screen. Two modes:
  existing jar → live DB edits; new jar → staged local list,
  bulk-created after the jar is saved.
- Deleting a sub-category nulls `subCategoryId` on any tagged
  transactions (fall back to jar level).
- `src/lib/reorder.ts` — pure `move(list, index, dir)`, unit-tested.

**Verified**

- `npm run check` green — 23 unit tests.
- End-to-end (Playwright): on Essentials, add "Internet", rename
  "Rent"→"Housing", move "Internet" up, remove "Water" — all persist
  across reload and show in the `/add` sub-category dropdown. New-jar
  path: staged "Flights"/"Hotels" persisted after Create. Screenshot
  refreshed (`jar-edit-light` now opens a seeded jar).

**Next**

- 0007 accumulation-jar detail + withdrawal events, 0009 projections
  (consumes the reprojection hook), 0008 CSV import, 0010 PWA polish.

---

## 2026-09-06 — Features 0003 wallets, 0004 income, 0005 transactions

**Added**

- Shared: `CurrencyPicker` component + `src/lib/currencies.ts`
  (curated ISO-4217 list, locale default); `src/lib/reprojection.ts` —
  the immediate-re-projection event seam (income / percentage /
  withdrawal), dev-logs only in v1.
- **0003 Wallets** — `WalletsPage`, `WalletEditPage`, `walletsRepo` with
  a delete guard (`incomeSourcesUsingWallet`). Routes `/wallets`,
  `/wallets/new`, `/wallets/:id`. Linked from Settings + income editor.
- **0004 Income sources** — `IncomePage` (inline active toggle),
  `IncomeEditPage`, `incomeRepo` (every mutation emits a reprojection
  reason). `once` excluded from the monthly figure with a note.
- **0005 Transactions** — `TransactionFormPage` (`/add` + edit) with a
  sticker `Keypad` and `JarSelect` chips; `TransactionsPage` grouped by
  day, newest first, per-day totals, jar filter, and "Unassigned" rows
  with inline "Move to…" (`reassignTransaction`).
  `transactions/compute.ts` (grouping / filter / orphan detection) is
  unit-tested.
- **0002 crit. 6** — jar-delete confirm now counts affected
  transactions; orphans become "Unassigned".
- Dashboard: real transactions now drive each jar's "spent" and the
  donut's outer ring; links to `/income/new` and `/transactions`.
- `scripts/shots.mjs` rewritten: per-mode dashboards + a populated
  context that adds transactions and shoots the money screens.

**Verified**

- `npm run check` green — 20 unit tests.
- End-to-end (Playwright): add wallet → 2 rows; add income → monthly
  chip moves; add 3 transactions → dashboard shows Essentials €225 /
  €1,200, Joy-jar €62 / €240; `/transactions` groups them under "Today"
  with a €287 day total. Screenshots regenerated (12 files).

**Known gaps (tracked)**

- 0002 sub-category editor UI still to build (tagging in `/add` already
  works off seeded sub-categories).
- Mixed-currency income sums naively with a notice (FX is Phase 2).
- Dark-mode jar cards still use candy fills (design-spec dark treatment
  is a follow-up).

**Next**

- 0002 sub-category editor. Then 0007 accumulation jar detail +
  withdrawal events, 0009 projections (consumes the reprojection hook),
  0008 CSV import, 0010 PWA polish.

---

## 2026-09-06 — Phase 1 kickoff: foundation + first slice

**Added**

- SDD doc set: `ROADMAP.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`,
  `WORKFLOW.md`, this log, `features/_TEMPLATE.md` + feature specs
  0001–0010, `decisions/0001–0004`.
- Project scaffold: Vite + React 18 + TypeScript, `vite-plugin-pwa`,
  ESLint (flat) + `jsx-a11y` + Prettier, Vitest + Testing Library.
- Design system in CSS: `src/styles/tokens.css`, `themes.css`,
  `base.css` — light/dark + `calm` + `cvd` modes per the design spec.
- Data layer: RxDB (dexie storage) singleton, 8 schemas at v0,
  `RxdbProvider` init gate, `seed()` with the default jar template + a
  sample wallet and income source.
- App shell: routing (`react-router-dom`), bottom nav, screen scaffold.
- **Dashboard** (Home): allocation donut, jar cards with computed
  planned / spent / balance, rule-based coach note. Reads live from RxDB.
- **Jars**: list + create/edit (name, %, type, colour, icon, pattern),
  seeded from the default template.
- **Settings**: theme (system / light / dark) and accessibility
  (Calm, Colour-blind safe) toggles, persisted, applied to `<html>`.

**Verified**

- `npm run check` green: tsc clean, eslint clean (0 warnings), 16 unit
  tests pass (money, date, dashboard compute).
- Ran in the browser (`npm run dev`): dashboard renders from seeded RxDB
  data — donut, coach note, jar cards, bottom nav. Jars list + jar
  editor work.
- Screenshots captured for light / dark / colour-blind-safe / calm and
  the jars list — see `docs/screenshots/`. Dark, CVD and Calm all apply
  correctly and compose.

**Fixed during the slice**

- `themes.css` had a `selector, @media { … }` list (invalid) — dark /
  calm tokens never applied. Split into paired attribute + media rules.
- Seed ran twice under React StrictMode (double-invoked effect) →
  doubled jars/income. Moved `seedIfEmpty` inside the memoised
  `getDatabase()` init so it runs exactly once.
- RxDB dev-mode requires a top-level schema validator — wrapped the
  Dexie storage with `wrappedValidateAjvStorage` in dev.

**Known gaps (tracked)**

- Dark mode keeps candy jar-card fills; the design spec's "raised dark
  surface + hue edge" jar-card treatment is a follow-up (feature 0002 /
  0006 changelog).
- PWA icons are the SVG favicon only; real PNG/maskable set is feature
  0010.

**Next**

- Feature 0003 wallets UI, 0004 income sources UI, 0005 transactions +
  add-transaction flow. Then 0007 accumulation/withdrawals, 0009
  projections.
