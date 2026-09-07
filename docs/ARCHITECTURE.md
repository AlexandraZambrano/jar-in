# Architecture (as built)

Updated as the code evolves. Rationale for the big choices lives in
[`decisions/`](decisions/). High-level intent is in [`SPEC.md`](SPEC.md) §10.

## Shape

**Local-first PWA.** The app reads and writes an on-device database
(RxDB over IndexedDB) and works fully offline. A backend (Supabase) will
later act as a passive replication target — it is **not** wired in v1.

```
┌─────────────────────────────────────────────┐
│  React UI (Vite, TS)                         │
│   app shell · routes · feature screens      │
│   shared components (Sticker, Donut, …)     │
├─────────────────────────────────────────────┤
│  Selectors / compute  (pure functions)      │
│   deterministic money + allocation math     │
├─────────────────────────────────────────────┤
│  Data layer  (src/db)                        │
│   RxDB database · 7 collections · schemas    │
│   reactive queries via useRxQuery hook       │
├─────────────────────────────────────────────┤
│  IndexedDB  (browser, per-origin)            │
└─────────────────────────────────────────────┘
        (Phase 5) ⇅ RxDB replication ⇄ Supabase
```

## Folder layout

```
docs/                SDD documents (this folder) — source of truth
design/              Design-canvas working files (.dc.html) + seeded artifact
public/              PWA manifest, icons
src/
  app/               App shell, router, providers
  db/
    schemas/         One RxDB JSON schema per entity
    database.ts      createRxDatabase + addCollections (singleton)
    seed.ts          First-run default data (jar template, sample wallet/income)
    RxdbProvider.tsx React context + async init gate
  lib/               Framework-free helpers: money, dates, ids, formatting,
                     useRxQuery, preferences (theme / a11y)
  styles/            tokens.css · themes.css · base.css  (implements the design spec)
  components/        Shared UI primitives, framework-agnostic props
  features/
    dashboard/       Home screen + allocation compute
    jars/            Jar list, create/edit, default template
    wallets/         (Phase 1, later slice)
    income/          (Phase 1, later slice)
    transactions/    (Phase 1, later slice)
    settings/        Theme + accessibility toggles
```

## Data flow

1. `RxdbProvider` creates the RxDB singleton on first mount, then renders
   the app. There is **no automatic seed** — `firstRunDecision()`
   (feature 0011) sends a new user to `/welcome`, where they either
   answer the questionnaire (jars built from their answers) or pick
   "skip" (`seedExampleData()` drops in the example set).
2. Screens call `useRxQuery(() => db.jars.find(), [])` etc. — a thin hook
   that subscribes to an `RxQuery.$` observable and returns plain JSON.
   No global store; RxDB *is* the store.
3. Mutations go through small per-feature repo modules
   (`jarsRepo.ts`, …) that wrap `collection.insert/upsert/patch`.
4. Anything shown as a number (jar funding, spent, progress, projected
   dates) is computed by **pure functions** in `*/compute.ts` from the
   raw documents — never stored pre-computed, never produced by the AI
   layer.

## Money

Amounts are integers in **minor units** (cents) plus an ISO-4217
`currency` string. No floats in storage. Formatting/parsing is
centralised in `src/lib/money.ts`. v1 assumes a single display currency;
the FX rollup is Phase 2 (`fxRates` schema already exists).

## Theming & accessibility

`src/styles` defines CSS custom properties on `:root`, overridden under
`[data-theme="dark"]` / `@media (prefers-color-scheme: dark)` and under
`[data-a11y~="calm"]` / `[data-a11y~="cvd"]` (+ the matching
`prefers-reduced-motion` / `prefers-contrast` queries). `src/lib/preferences.ts`
persists the user's choice to `localStorage` and reflects it onto
`<html data-theme … data-a11y …>`. See
[`DESIGN-STICKER-SHEET.md`](DESIGN-STICKER-SHEET.md) §5–6.

## PWA

`vite-plugin-pwa` (Workbox `generateSW`) precaches the built shell and
serves it offline; `navigateFallback: index.html` keeps client routes
working offline. Google Fonts are runtime-cached (stale-while-revalidate
+ cache-first) so offline uses the real faces. `registerType: autoUpdate`
— the SW updates in the background, no update prompt. `app/OfflineBadge`
reflects `navigator.onLine`; `app/InstallPrompt` handles the Chromium
`beforeinstallprompt` and the iOS "Add to Home Screen" nudge.
`lib/storagePersistence` calls `navigator.storage.persist()` on boot.
Icons are rasterised from the jar mark by `scripts/icons.mjs`
(`npm run icons`). The SW is inactive under `npm run dev` — test PWA
behaviour with `npm run build && npm run preview`.

## Testing & CI

Vitest + Testing Library (jsdom) for unit tests (`src/**`) — the
compute/selector functions carry the heaviest coverage since they hold
the money math. Playwright (`e2e/**`, `@playwright/test`) drives the
headline user flows against a `vite preview` production build; a feature
that adds a route or a mutation ships an `e2e/` spec.

CI is GitHub Actions (`.github/workflows/ci.yml`), Node 24: a
`check + build` job (`npm run check` + `npm run build`, uploads `dist/`)
then an `e2e` job. The same commands are the local gate — see
[`DEPLOYMENT.md`](DEPLOYMENT.md) and ADR
[`decisions/0005-ci-and-deployment.md`](decisions/0005-ci-and-deployment.md).

## Deploy

Static PWA bundle (`dist/`) served by Coolify on Hetzner from a green
`main`, SPA fallback to `index.html`, hashed assets long-cached and
`index.html` / `sw.js` / `manifest.webmanifest` `no-cache`. No backend
in v1. Details in [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Not in v1 (but designed around)

Household/multi-user, Supabase sync + RLS, Groq AI calls, GoCardless bank
sync, period-allocation engine, FX conversion. Schemas and the
`sourceType` / `external*` fields are already shaped so these land
without a migration.
