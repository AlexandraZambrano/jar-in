# 0010 — PWA polish

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §10, §13
- **Depends on:** 0001

## Goal

Make the app a good citizen as an installed PWA: real icons + splash,
an install nudge, an offline-ready indicator, and the iOS-specific
storage-eviction nudge from the spec.

## Acceptance criteria

1. Complete icon set (192/512, maskable) + `theme_color` matching the
   active theme; manifest `display: standalone`.
2. Service worker precaches the app shell; app works fully offline after
   first load; a small "offline" indicator when `navigator.onLine` is
   false.
3. Custom install prompt (deferred `beforeinstallprompt`) with a
   dismissible card; not shown once installed.
4. On iOS Safari (not standalone), a one-time nudge explaining that
   installing to the Home Screen protects data from the 7-day eviction.
5. `startEviction` spike documented: confirm whether IndexedDB survives
   as expected in installed vs. tab context (note results here).

## Data touched

None (a `preferences` flag for "install nudge dismissed").

## Screens / components

`app/InstallPrompt.tsx` (Chromium `beforeinstallprompt` card + iOS
manual nudge), `app/OfflineBadge.tsx`, `lib/pwa.ts`,
`lib/storagePersistence.ts`, `scripts/icons.mjs` + `public/*.png`,
`vite.config.ts` PWA options, `index.html` apple meta. Storage status is
surfaced on the Settings screen ("This device").

## Out of scope

Background Sync (unsupported on Safari — sync is "on open" per spec),
push notifications, native store packaging.

## Test notes

Verified with Playwright against the production build (`npm run preview`):
service worker registers and controls; an **offline reload renders the
full app** from cache with `navigator.onLine === false`; the offline bar
shows and clears; the iOS nudge appears under an iPhone user-agent and
its dismissal persists across reload. Unit tests unchanged (56).

## Storage-eviction spike (criterion 5)

**What was done.** On boot, `RxdbProvider` calls
`lib/storagePersistence.requestPersistence()` →
`navigator.storage.persist()` (+ `persisted()` / `estimate()`), and the
result is shown on Settings.

**Findings.**

- **Chromium (desktop + Android):** `persist()` resolves; it is granted
  heuristically for installed / engaged origins. When granted, the
  origin's IndexedDB is exempt from best-effort eviction under storage
  pressure. Confirmed the API path in automation.
- **iOS/iPadOS Safari:** `navigator.storage.persist()` exists (16.4+)
  but Apple treats it as informational — the real lever is being an
  **installed home-screen PWA**, which is exempt from the 7-day
  eviction of *unused* websites; a plain Safari tab is not, and its
  data is cleared after ~7 days without interaction (per SPEC.md §10).
  This can't be verified in this environment (no iOS device) and is
  flagged for on-device testing. Mitigations already shipped: the
  one-time "Add to Home Screen" nudge (criterion 4) and the Settings
  note when storage is only best-effort.
- **Durable answer:** background sync to Supabase (Phase 5). Until then,
  data is safe as long as the app is installed, or opened within the
  eviction window.

**No Background Sync API work** — unsupported on Safari; sync stays
"on open / on foreground" (SPEC.md §10), and is Phase 5 regardless.

## Changelog

- **2026-09-07** — All criteria met.
  - `scripts/icons.mjs` rasterises the jar mark → `public/icon-192.png`,
    `icon-512.png`, `icon-512-maskable.png` (safe-zone padded),
    `apple-touch-icon.png` (`npm run icons` to regenerate).
  - `vite.config.ts` manifest: the 4 icons, `display: standalone`,
    `orientation: portrait`, `scope`, `categories`; `theme_color` +
    per-scheme `<meta name="theme-color">` already in `index.html`
    (light `#FFF6E9` / dark `#17131F`). Workbox `navigateFallback`,
    `cleanupOutdatedCaches`, and `runtimeCaching` for Google Fonts
    (stale-while-revalidate + cache-first) so offline uses the real
    faces.
  - `OfflineBadge` — sticky bar on `online`/`offline` events.
  - `InstallPrompt` — deferred `beforeinstallprompt` card ("Add" /
    "Not now") on Chromium; a manual "Share → Add to Home Screen" card
    on iOS Safari. Hidden when standalone or once dismissed
    (`localStorage: jarin.install.dismissed`); `appinstalled` also
    dismisses it.
  - `requestPersistence()` on boot; Settings shows installed vs.
    browser + persistent vs. best-effort + usage/quota.
  - Extracted `DEFAULT_CURRENCY` to `src/db/constants.ts` so `seed.ts`
    stays dynamically-imported only (drops a Vite chunking warning).
