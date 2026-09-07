# Progress log

Newest first. One entry per working session or merged feature. Keep it
factual: what changed, what's verified, what's next.

---

## 2026-09-07 — Locale: force the whole app to English

Reported: "On track to reach 2100,00 € around abril de 2027" — mixed
English UI copy + Spanish-locale number/date formatting.

Cause: `formatMoney` / `monthLabel` / day grouping were fed
`navigator.language`. Fix: `src/lib/locale.ts` → `APP_LOCALE = 'en-GB'`;
`formatMoney`, `monthLabel`, `dayLabel`/`groupByDay`, `currencyLabel`
default to it; the 8 components that derived a locale from the device now
use `APP_LOCALE`. The device locale survives only in `deviceLocale()`,
used solely to guess a default currency for new wallets/income (currency
≠ language). Test locks in `€2,100.00` / `April 2027`. Verified under an
`es-ES` / Europe/Madrid context — every screen renders English. ADR 0004
updated.

---

## 2026-09-07 — Post-Phase-1 review: specs drafted, fix pack 0012 shipped

**Drafted (in review — no code):**

- `features/0011-first-run-onboarding.md` — a first-run questionnaire →
  deterministic jar proposal into the normal editable setup + a one-time
  app tour. AI wording folds in at Phase 3.
- `DEPLOYMENT.md` — CI gate (`npm run check` + a headless e2e suite)
  before a Coolify deploy; a per-feature automated-test requirement.

**Shipped — 0012 fix pack:**

- **12a (P0)** "Delete does nothing" — `window.confirm()` returns
  `false` whenever the browser suppresses the dialog, silently
  no-op'ing the delete. New `components/ConfirmButton` (two-step, no
  native dialog) replaces the guard on transaction / jar / income /
  withdrawal delete. eslint now bans `confirm/alert/prompt`. RTL test +
  end-to-end verification (no dialog ever fires).
- **12b** Growth `JarCard` line → `Growth · €X of €Y · €Z/mo`; jar
  detail headline gains `· +€Z/mo`.
- **12c** Calm mode mutes the jar colours — `resolveJarColors(hex,
  { cvd, calm })`, `calm` mixes toward warm grey. Reads through every
  jar surface.
- **12d** Colour-blind mode = Okabe–Ito swap only; patterns moved to
  their own `patterns` a11y flag ("Add patterns to jars" in Settings),
  independent of `cvd`.
- **12e** Opening balance available for flow jars; `jars/timeline.ts`
  generalised (`DebitEvent`s); flow jar detail gets a running-balance
  chart while keeping "spent this month / cap" as the headline.
  `flowRunningBalanceMinor` added + tested.

**Verified:** `npm run check` green — 60 tests (added `ConfirmButton`,
`flowRunningBalanceMinor`). All five fixes checked end-to-end with
Playwright. Screenshots refreshed.

**Next:** 0011 onboarding (spec needs your sign-off), then the CI
pipeline from DEPLOYMENT.md.

---

## 2026-09-07 — Feature 0010: PWA polish · Phase 1 complete

**Added**

- `scripts/icons.mjs` (`npm run icons`) → `public/icon-192.png`,
  `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`
  rasterised from the jar mark.
- `vite.config.ts`: full manifest (4 icons, `display: standalone`,
  `orientation`, `scope`, `categories`); Workbox `navigateFallback` +
  `cleanupOutdatedCaches` + Google-Fonts `runtimeCaching`. `index.html`:
  apple-touch-icon + apple / mobile-web-app meta.
- `OfflineBadge` — sticky bar driven by `online`/`offline`.
- `InstallPrompt` — `beforeinstallprompt` card on Chromium, manual
  "Share → Add to Home Screen" nudge on iOS Safari; hidden when
  standalone / dismissed (`localStorage`), also on `appinstalled`.
- `lib/storagePersistence.requestPersistence()` on boot; Settings "This
  device" card shows installed vs. browser, persistent vs. best-effort,
  and usage/quota.
- `src/db/constants.ts` — `DEFAULT_CURRENCY` moved out of `seed.ts` (keeps
  it dynamic-import-only; drops a Vite chunking warning).

**Verified**

- `npm run build` emits `sw.js` + `manifest.webmanifest` + all icons
  (precache 16 entries). `npm run check` green — 56 tests.
- Playwright vs. `npm run preview`: SW registers + controls; **offline
  reload renders the full app** (`navigator.onLine === false`), offline
  bar shows and clears; iOS nudge appears under an iPhone UA and its
  dismissal persists. Screenshots added (`offline`, `install-ios`).

**Storage-eviction spike:** see
`docs/features/0010-pwa-polish.md` — `navigator.storage.persist()` is the
lever on Chromium; on iOS the real protection is home-screen install
(nudge shipped); durable answer is Phase 5 sync. On-device iOS
verification is still a TODO (no device here).

**Next**

- Phase 1 is done. Phase 2: multi-currency rollup + FX table +
  period-allocation engine. (Or Phase 3 AI, Phase 4 household — see
  ROADMAP.)

---

## 2026-09-07 — Feature 0008: CSV import

**Added**

- `csvParse.ts` — hand-rolled CSV parser (quoted fields, `""` escapes,
  embedded newlines, CRLF, BOM), `sniffDelimiter` (`, ; \t`),
  `parseCsvDate` (ISO / dmy / mdy / dotted / 2-digit year),
  `extractRows` (sign convention → expense/income split, malformed
  collection), `hashRow` (djb2), `guessMapping`.
- `importDedupe.ts` — session `Set` of imported hashes.
- 3-step wizard `ImportCsvPage` (`/transactions/import`, linked from the
  transactions header) + `ColumnMap` + `ImportPreview` components.
- `transactionsRepo.importCsvTransactions` — bulk insert with
  `sourceType: "csv_import"`.

**Verified**

- `npm run check` green — 56 unit tests (csvParse ×11, importDedupe ×2).
- End-to-end (Playwright): a `;`-delimited EU-decimal bank-style file →
  auto-detected delimiter + columns, preview shows "4 to import · 1 look
  like income, skipped · 1 unreadable", import writes 4 rows (Salary
  excluded), re-import in the same session → "0 to import · 4 already
  imported", button disabled, no duplicate rows in the list.
  Screenshots added (`import-csv-map`, `import-csv-preview`).

**Next**

- 0010 PWA polish (icons, install prompt, offline UX, iOS nudge) → Phase 1 done.

---

## 2026-09-07 — Feature 0009: deterministic projections

**Added**

- `features/projections/project.ts` — `projectGoalDate` (two methods:
  EMA of monthly deltas, least-squares slope; confidence from the
  deltas' coefficient of variation; falls back to the planned
  contribution with <2 deltas; returns `null` for no-target / met /
  not-growing). `monthlyBalanceSeries` builds the month-end series
  (endpoint == `accumulationBalanceMinor`). Pure, tz-safe.
- `features/projections/tracker.ts` — module-level memory of each jar's
  last `monthsRemaining`; the dashboard records after each recompute and
  the coach note surfaces the single biggest shift. Guarded so a
  transient loading render can't wipe the baseline.
- Jar detail (accumulation): projection card with method / confidence /
  rate and a moving-average ⇄ trend-line toggle.
- `/insights` is now a real page listing each accumulation jar's
  projected goal date (was a placeholder).
- Recompute is synchronous with the underlying data change (RxDB +
  `emitReprojection` from income / % / withdrawal edits); no job.

**Verified**

- `npm run check` green — 43 unit tests (project ×9, tracker ×6).
- End-to-end (Playwright): Safe fund projects Apr 2027 / 7 months
  (trend line, high confidence); a €900 withdrawal moves it to Dec 2027
  / 15 months, the EMA view flips to "not growing", and returning to the
  dashboard shows "Safe fund now reaches its goal 8 months later than
  before". Screenshots refreshed (+ `insights-light`).

**Next**

- 0008 CSV import, 0010 PWA polish → Phase 1 done.

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
