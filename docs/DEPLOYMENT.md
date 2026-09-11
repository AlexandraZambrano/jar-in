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

### v1 — the container

Shipped in the repo:

| File | Role |
|---|---|
| [`Dockerfile`](../Dockerfile) | 2-stage: `node:24-alpine` runs `npm ci && npm run build`, then `nginx:1.27-alpine` serves `/dist`. Exposes `80`, has a `HEALTHCHECK` on `/`. |
| [`docker/nginx.conf`](../docker/nginx.conf) | SPA fallback (`try_files … /index.html`) + the cache policy below + gzip + `nosniff`. |
| [`.dockerignore`](../.dockerignore) | Keeps `docs/` (screenshots) and `design/` out of the build context. |

**Cache policy** (enforced by `nginx.conf`, not just documented):

| Path | `Cache-Control` |
|---|---|
| `/assets/*`, `/workbox-<hash>.js` | `public, max-age=31536000, immutable` |
| `/index.html` + SPA fallback | `no-cache` |
| `/sw.js`, `/registerSW.js`, `/manifest.webmanifest` | `no-cache` |
| icons / `favicon.svg` / fonts | `public, max-age=604800` |

### v1 — Coolify setup (server access — user)

1. **New Resource → Application → Public Repository**
   `https://github.com/AlexandraZambrano/jar-in`, branch `main`.
2. **Build Pack: `Dockerfile`** (path `./Dockerfile`). No build/start
   command overrides — the image handles both.
3. **Port:** `80`. **Health check path:** `/`.
4. **Domain:** set the FQDN; Coolify provisions the Let's Encrypt cert.
5. **Deployments → enable "Wait for CI"** (GitHub commit status) so a
   push only deploys once `ci.yml` is green, **or** leave auto-deploy
   off and promote a green `main` manually.
6. **Env:** none for v1. Phase 3+ adds `GROQ_*` / `SUPABASE_*` as
   Coolify secrets — never in the client bundle (SPEC §10).

- **Rollback:** Coolify keeps previous image builds; redeploy the last
  green commit.
- **Smoke check after deploy:** `/` loads, a hard-refresh on
  `/jars` resolves (SPA fallback), DevTools → Application shows the
  service worker `activated`, and `curl -I …/assets/<file>` returns the
  `immutable` header while `curl -I …/sw.js` returns `no-cache`.

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
- [x] `Dockerfile` + `docker/nginx.conf` + `.dockerignore` — the
      production container with SPA fallback and the cache policy above

## Needs infrastructure / repo access (user)

- [x] Push the repo to GitHub — `github.com/AlexandraZambrano/jar-in`
      (`main` + `feat/v1-phase-1`). Actions runs `ci.yml` on every push.
- [ ] Coolify app configured — follow "v1 — Coolify setup" above
      (server access). The `Dockerfile` is ready; nothing else is needed
      in the repo.
- [ ] Branch protection on `main`: both CI jobs green before merge, no
      direct pushes (repo admin).
- [ ] `docker build` has **not** been run locally (no Docker daemon on
      the dev box) — first real build happens on the Coolify server.
