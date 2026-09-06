# 0001 — Foundation & app shell

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §10, §12; DESIGN-STICKER-SHEET.md §2, §5, §6
- **Depends on:** none

## Goal

A running, installable PWA skeleton that boots an on-device database,
applies the Sticker Sheet design tokens (including the Calm,
Colour-blind-safe and Dark modes), and routes between the app's main
screens with the bottom nav. Everything else in Phase 1 builds on this.

## User stories

- As a user, I can open the app offline and it loads instantly from
  on-device data.
- As a user, I can switch between system / light / dark appearance and
  turn on Calm or Colour-blind-safe modes, and my choice sticks.

## Acceptance criteria

1. `npm run dev` serves the app; `npm run build` produces a PWA bundle
   with a valid web manifest and a service worker (via `vite-plugin-pwa`).
2. On first load, `RxdbProvider` creates the RxDB database, runs `seed()`
   because it is empty, and only then renders the app. A second load does
   **not** re-seed.
3. `src/styles` defines all design tokens on `:root`; `[data-theme="dark"]`
   and `@media (prefers-color-scheme: dark)` override them; `[data-a11y~="calm"]`
   (also `prefers-reduced-motion` / `prefers-contrast: more`) and
   `[data-a11y~="cvd"]` apply their overrides. Tokens match
   DESIGN-STICKER-SHEET.md §2.
4. `src/lib/preferences.ts` reads/writes `{theme, a11y[]}` in
   `localStorage`, wrapped in try/catch, and reflects them onto
   `<html data-theme data-a11y>` before first paint (no flash).
5. Routes exist for `/` (Dashboard), `/jars`, `/add` (placeholder),
   `/insights` (placeholder), `/settings`. The bottom nav navigates
   between them, marks the active item, and every target is ≥ 44×44px.
6. `npm run check` (tsc + eslint + vitest) passes with zero warnings.
7. Shared primitives exist and are used by the dashboard: `Sticker`,
   `CoachNote`, `ProgressBar`, `AllocationDonut`, `BottomNav`, plus an
   `icons` module (jar + nav icons as inline SVG, no emoji).

## Data touched

Creates the RxDB database and all 8 collections (see DATA-MODEL.md).
`seed()` inserts: 1 wallet, 1 income source, 4 jars (default template).

## Screens / components

`src/app/AppShell.tsx` (nav + `<Outlet/>`), `src/app/routes.tsx`,
`src/features/settings/SettingsPage.tsx`. Components as in criterion 7.

## Out of scope

PIN/biometric unlock (later in Phase 1, feature 0010 area), Supabase
sync, real icons/splash art beyond a placeholder mark.

## Test notes

Unit: `preferences` round-trip, `money` helpers, income normalisation.
Hand-verified: theme/a11y switching, offline reload, no re-seed.

## Changelog

- **2026-09-06** — Scaffold, tokens, DB bootstrap, shell, settings created.
- **2026-09-06** — All acceptance criteria met and verified. Fixes made:
  `themes.css` selector-list-with-`@media` was invalid (split into paired
  rules); seed moved inside the memoised DB init to survive StrictMode's
  double effect; RxDB dev-mode needs a top-level validator
  (`wrappedValidateAjvStorage` in dev). Criterion 1 partially deferred:
  a valid manifest + SW are produced, but real PNG/maskable icons are
  feature 0010 (SVG favicon for now).
