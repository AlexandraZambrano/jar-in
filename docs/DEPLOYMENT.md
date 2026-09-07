# Deployment & CI (proposal — pending approval)

Status: **proposed**. Nothing here is wired yet; this document is the
spec for it. Once approved it becomes "as built" and this notice goes.

## Principle

Nothing reaches the deployed app that hasn't passed the same gate a
feature must pass locally (see [`WORKFLOW.md`](WORKFLOW.md)):
**typecheck + lint + unit tests + a clean production build**. Every
feature also carries at least one automated behaviour check.

## The gate — `npm run check`

Already the local gate: `tsc --noEmit && eslint . && vitest run`.
CI runs exactly this, plus `npm run build`.

Per-feature testing policy (added to `WORKFLOW.md`):

- Pure logic (compute, parsers, proposal rules, state machines) → Vitest
  unit tests, committed with the feature. **Required.**
- User-visible flows → a short Playwright script under `e2e/` asserting
  the feature's headline acceptance criteria. **Required for any feature
  that adds a route or a mutation.** These run in CI headless.
- `npm run shots` stays a manual/docs task, not a CI gate.

## CI — GitHub Actions (`.github/workflows/ci.yml`)

Triggers: `push` to any branch, `pull_request` to `main`.

Jobs:

1. **check** — `actions/setup-node` (Node 24, npm cache) → `npm ci` →
   `npm run check` → `npm run build`. Uploads `dist/` as an artifact.
2. **e2e** — needs `check`. `npm ci` → `npx playwright install --with-deps chromium`
   (cached) → `npm run build` → `npm run preview &` → `npm run e2e`
   (`playwright test e2e/`). Uploads the Playwright report on failure.

Branch protection on `main`: both jobs green before merge. No direct
pushes to `main`.

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

## To do when this is approved

- [ ] `.github/workflows/ci.yml`
- [ ] `e2e/` folder + `playwright.config.ts` + `npm run e2e` script;
      port the ad-hoc verification scripts used per feature into it
- [ ] `WORKFLOW.md`: add the per-feature test requirement + `e2e` step
- [ ] `ARCHITECTURE.md`: note the CI gate and deploy target
- [ ] ADR `decisions/0005-ci-and-deployment.md`
- [ ] Coolify app configured (needs server access — user)
- [ ] Branch protection on `main` (needs repo admin — user)
