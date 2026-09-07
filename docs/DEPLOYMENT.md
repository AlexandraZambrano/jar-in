# Deployment & CI (as built)

Status: **built** — CI and the e2e suite are wired. The two items that
need infrastructure access (Coolify app, `main` branch protection) are
called out at the end and remain the user's to do.

## Principle

Nothing reaches the deployed app that hasn't passed the same gate a
feature must pass locally (see [`WORKFLOW.md`](WORKFLOW.md)):
**typecheck + lint + unit tests + a clean production build**, plus an
**e2e pass** over the headline user flows.

## The gate — `npm run check` + `npm run e2e`

- `npm run check` = `tsc --noEmit && eslint . && vitest run` — the local
  and CI gate for types, lint and unit tests.
- `npm run build` — a clean production PWA bundle must always be
  reachable.
- `npm run e2e` — Playwright (`playwright.config.ts`) builds the app,
  serves it with `vite preview` on `:4173`, and runs the specs in
  `e2e/` headless in Chromium. `npm run e2e:ui` is the local watch UI.

Per-feature testing policy (also in `WORKFLOW.md`):

- Pure logic (compute, parsers, proposal rules, state machines) → Vitest
  unit tests, committed with the feature. **Required.**
- User-visible flows → a short Playwright spec under `e2e/` asserting the
  feature's headline acceptance criteria. **Required for any feature
  that adds a route or a mutation.**
- `npm run shots` stays a manual/docs task, not a CI gate.

### e2e suite (`e2e/`)

| Spec | Covers |
|---|---|
| `onboarding.spec.ts` | new user → `/welcome`; skip path seeds a starter set; questionnaire → proposal → jars sum to 100% |
| `jars.spec.ts` | create a jar; flow-jar opening balance round-trips a save (0012 regression); delete a jar with no native dialog |
| `transactions.spec.ts` | keypad add flow → history; delete a transaction with no native dialog |
| `preferences.spec.ts` | theme + a11y toggles mirror onto `<html>` and persist |

`e2e/helpers.ts` — `seedStarter(page)` walks the "skip" onboarding path
so a fresh context (empty IndexedDB) has data; `trackNativeDialogs(page)`
fails a test if `alert`/`confirm`/`prompt` ever fires (the
`ConfirmButton` contract).

## CI — GitHub Actions (`.github/workflows/ci.yml`)

Triggers: `push` to any branch, `pull_request` to `main`.
`concurrency` cancels a ref's previous in-flight run.

Jobs:

1. **check + build** — `actions/setup-node` (Node 24, npm cache) →
   `npm ci` → `npm run check` → `npm run build`. Uploads `dist/` as an
   artifact (7-day retention).
2. **e2e** — `needs: check`. `npm ci` → restore the Playwright browser
   cache (keyed on the resolved `@playwright/test` version) → install
   Chromium (+ system deps) → `npm run e2e` (the Playwright `webServer`
   builds and serves the app). Uploads `playwright-report/` on
   completion.

## Deploy — Hetzner + Coolify (SPEC §12)

The app is a static PWA bundle (`dist/`) plus, later, a small backend
function for Groq calls (Phase 3) and Supabase for sync (Phase 5).

- **v1 (static only):** Coolify application pointed at the repo, build
  command `npm ci && npm run build`, publish directory `dist/`, SPA
  fallback to `index.html`. Auto-deploy on push to `main` **after** CI is
  green (Coolify waits on the commit status, or deploy is a manual
  promote from a green `main`).
- **Rollback:** Coolify keeps previous builds; redeploy the last green
  commit.
- **Env:** none for v1. Phase 3+ adds `GROQ_*` and `SUPABASE_*` as
  Coolify secrets, never in the client bundle (SPEC §10).
- **Headers:** long-cache the hashed `assets/`, `no-cache` for
  `index.html`, `sw.js` and `manifest.webmanifest` so updates land.

## Release flow

```
feature branch → PR → CI (check + e2e) green → review → merge to main
      → CI on main green → Coolify deploy → smoke-check the live URL
      → tag if it's a milestone
```

## Built

- [x] `.github/workflows/ci.yml` — `check + build` and `e2e` jobs
- [x] `e2e/` + `playwright.config.ts` + `npm run e2e` / `npm run e2e:ui`;
      the per-feature ad-hoc Playwright checks are ported into `e2e/`
- [x] `WORKFLOW.md` — per-feature test requirement + the `e2e` step
- [x] `ARCHITECTURE.md` — CI gate + deploy target noted
- [x] ADR [`decisions/0005-ci-and-deployment.md`](decisions/0005-ci-and-deployment.md)

## Needs infrastructure / repo access (user)

- [ ] Push the repo to GitHub so Actions runs (`ci.yml` is already in
      place; no remote is configured yet).
- [ ] Coolify app configured (server access).
- [ ] Branch protection on `main`: both CI jobs green before merge, no
      direct pushes (repo admin).
