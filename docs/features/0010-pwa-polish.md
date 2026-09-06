# 0010 — PWA polish

- **Status:** ⬜ not started
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

`app/InstallPrompt.tsx`, `app/OfflineBadge.tsx`, `public/` icons,
`vite.config.ts` PWA options.

## Out of scope

Background Sync (unsupported on Safari — sync is "on open" per spec),
push notifications, native store packaging.

## Test notes

Hand-verified across Chrome (install), iOS Safari (nudge), offline
reload. Lighthouse PWA check ≥ 90.

## Changelog

- _none yet_
