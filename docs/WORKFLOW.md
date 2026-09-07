# Development workflow (spec-driven)

Every change starts as a written spec and ends with the docs updated to
match reality. Nothing large is coded before its feature spec exists.

## The loop, per feature

```
1. SPEC     npm run feature <slug>        → creates docs/features/NNNN-<slug>.md
            …fill it in: goal, user stories, acceptance criteria,
              data touched, screens, out-of-scope
            git commit -m "docs: spec <slug>"

2. BUILD    implement against the acceptance criteria only
            keep docs/DATA-MODEL.md in sync if schemas change

3. CHECK    npm run check                 → tsc + eslint + vitest, must be green

4. SEE      npm run dev  (or npm run preview)
            open the app, verify the acceptance criteria by hand
            npm run shots  → refreshes docs/screenshots/*.png
            reference them in README.md and the feature spec

5. RECORD   set the feature's Status + Changelog in its spec file
            tick the row in docs/ROADMAP.md
            add a dated line to docs/PROGRESS.md

6. COMMIT   git commit -m "feat(<slug>): <what changed>"
            (never add a Co-Authored-By / contributor trailer for Claude)
```

## npm scripts

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server (hot reload) |
| `npm run build` | `tsc -b` + `vite build` (production PWA bundle) |
| `npm run preview` | Serve the production build locally |
| `npm run check` | `tsc --noEmit` + `eslint .` + `vitest run` — the gate |
| `npm run lint` / `npm run lint:fix` | ESLint (+ `jsx-a11y`) |
| `npm run format` | Prettier write |
| `npm run test` / `npm run test:watch` | Vitest |
| `npm run feature <slug>` | Scaffold a new feature spec from the template |
| `npm run shots` | Regenerate `docs/screenshots/*.png` with Playwright (needs a server running; `SHOT_BASE` to point it — use the `preview` build for PWA shots) |
| `npm run icons` | Rasterise `public/*.png` app icons from the jar mark |

## Working with Claude

Point Claude at the spec, not at a vague ask:

- **New feature:** "Start feature `<slug>`" — Claude runs
  `npm run feature <slug>`, drafts the spec for your review, then builds
  it after you approve.
- **Continue a feature:** "Continue `docs/features/NNNN-<slug>.md`" —
  Claude picks up from the spec's Status/Changelog and the unmet
  acceptance criteria.
- **Change scope:** edit the feature spec first, then ask Claude to
  reconcile the code to it.

Project slash commands (in `.claude/commands/`):

- `/new-feature <slug> <one-line goal>` — scaffold + draft a feature spec
- `/continue-feature <NNNN-or-slug>` — resume an in-progress feature
- `/sync-docs` — reconcile ROADMAP / DATA-MODEL / PROGRESS with the code and report drift

## Definition of done (a feature)

- [ ] Every acceptance criterion in the spec is met and hand-verified
- [ ] `npm run check` is green
- [ ] Schemas & `docs/DATA-MODEL.md` agree
- [ ] Screenshot(s) captured and linked
- [ ] Feature spec Status = ✅ with a dated Changelog entry
- [ ] `ROADMAP.md` + `PROGRESS.md` updated
- [ ] Committed with a conventional-commit message
