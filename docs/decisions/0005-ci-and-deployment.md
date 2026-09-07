# ADR 0005 — CI pipeline & deployment gate

- **Date:** 2026-09-07
- **Status:** accepted

## Context

Phase 1 is feature-complete and about to be deployed (Hetzner + Coolify,
SPEC §12). `WORKFLOW.md` already defines a local gate — `npm run check`
(`tsc --noEmit && eslint . && vitest run`) — but nothing enforces it
before code merges or deploys, and the per-feature "verify in the
browser" step was ad-hoc Playwright scripts that were run once and
discarded. We need the same bar applied automatically, and the
behaviour checks kept as a runnable suite.

## Decision

**Gate = `npm run check` + `npm run build` + `npm run e2e`.**

- **Unit tests (Vitest)** stay the home of the money/allocation math and
  every pure function (`*/compute.ts`, parsers, `proposeJars`, state
  machines). Scoped to `src/**` via `test.include` so Playwright specs
  are not picked up.
- **E2E tests (Playwright, `@playwright/test`)** live in `e2e/` and run
  against a **production build served by `vite preview`** on `:4173` —
  the dev server disables the service worker, so preview is the honest
  target (same reason `npm run shots` uses it). `playwright.config.ts`
  owns the `webServer` (`npm run build && npm run preview`), so
  `npm run e2e` needs no preamble. Chromium only; portrait-phone
  viewport. One spec per feature area, asserting the headline
  acceptance criteria — including two regressions worth locking:
  flow-jar opening balance surviving a save, and destructive actions
  never opening a native `confirm()` (the 0012a bug).
- **CI = GitHub Actions** (`.github/workflows/ci.yml`), Node 24, two
  jobs: `check + build` (uploads `dist/`), then `e2e` (needs `check`,
  caches the Playwright browser download keyed on the resolved
  version). Triggers on push to any branch and PRs to `main`.
- **`playwright` and `@playwright/test` are pinned to the exact same
  version** — a mismatch between them is a known footgun.
- **Deploy** is unchanged from SPEC §12: Coolify builds `dist/` from a
  green `main` and serves it static with an `index.html` SPA fallback;
  hashed assets long-cached, `index.html` / `sw.js` /
  `manifest.webmanifest` `no-cache`.

## Alternatives considered

- **Unit tests only, no e2e in CI.** Rejected: the bugs that actually
  shipped in Phase 1 (suppressed `confirm()`, a repo dropping a field
  the form sent) were integration failures a unit test would not catch.
- **Cypress.** Playwright is already a dependency (screenshots), is
  lighter, and its `webServer` handling removes a moving part.
- **Test against the dev server.** The service worker and the PWA
  install path only exist in the built app.
- **A single combined CI job.** Two jobs give a fast `check` signal
  without waiting on a browser download, and let branch protection
  require both explicitly.

## Consequences

- Every push runs the full gate; `main` can require it before merge
  (needs repo admin — tracked in `DEPLOYMENT.md`).
- New features that add a route or a mutation now must ship an `e2e/`
  spec, not just unit tests (`WORKFLOW.md` updated).
- CI needs a GitHub remote, which the repo does not have yet; the
  workflow file is in place and inert until it is pushed.
- Playwright's browser binary is ~120 MB — cached in CI, and a one-time
  `npx playwright install chromium` locally.
