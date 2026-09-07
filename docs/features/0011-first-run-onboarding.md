# 0011 — First-run onboarding & app tour

- **Status:** ⬜ not started (spec in review)
- **Phase:** 1 (deterministic version now; AI-worded version folds in at Phase 3)
- **Spec refs:** SPEC.md §8.1, §4; DESIGN-STICKER-SHEET.md §3, §5
- **Depends on:** 0001, 0002

## Goal

The very first time someone opens Jars, instead of landing on a dashboard
of pre-seeded example jars they get a short, friendly questionnaire —
income, rent, utilities, groceries, existing debt, whether they already
save — and Jars proposes a starting jar set with percentages that add up
to 100%. The proposal drops straight into the **normal, fully-editable**
jar setup (feature 0002), so nothing about it is special data — it's a
guided first run of the same UI. Immediately after, a one-time **tour**
points out where the main things live (jars, add, insights, settings).

v1 proposal logic is **deterministic and rule-based**. Phase 3 swaps the
question flow and the wording for the Groq agent; the jar-proposal
function stays as the deterministic fallback / validator.

## User stories

- As a first-time user with no budgeting experience, I answer a few
  plain questions and get a sensible set of jars I can immediately tweak,
  not a blank screen or someone else's example data.
- As a first-time user, after setup I get a quick walkthrough so I know
  where to add a transaction, see my jars, and change settings.
- As a returning user, I never see onboarding or the tour again (unless I
  reset it from Settings).

## Acceptance criteria

1. **First-run detection.** On boot, if there are no jars **and** the
   user hasn't completed or skipped onboarding (a `preferences` flag),
   the app routes to `/welcome` instead of seeding example jars. Seeding
   the current example data only happens if the user picks "Skip, just
   set me up with defaults".
2. **Questionnaire** (`/welcome`): a stepped flow, one question per card,
   with Back / Next and a progress indicator. Questions:
   monthly take-home income (+ currency), rough monthly rent/mortgage,
   rough monthly utilities, rough monthly groceries, monthly debt
   repayments (optional), "do you already put money aside each month?"
   (yes-a-lot / yes-a-bit / not-yet). Every question is skippable; the
   proposal degrades gracefully with missing answers.
3. **Deterministic proposal** (`proposeJars(answers)` — pure, unit-tested):
   returns a list of `{ name, type, percentage, color, pattern, icon,
   targetMajor? }` that always sums to exactly 100%. Rules, roughly:
   - Essentials (flow) = clamp(sum of rent+utilities+groceries as a % of
     income, 35–60%), rounded to the nearest 5.
   - Debt jar (flow) only if debt repayments > 0, sized to cover them
     (clamped ≤ 20%).
   - Safe fund (accumulation, target ≈ 3× monthly essentials): 15% if
     "not-yet", 10% if "yes-a-bit", 5% if "yes-a-lot".
   - Investment (accumulation, no default target): whatever "yes"
     bucket implies (0 / 10 / 20%).
   - Joy-jar (flow) = the remainder, floored at 5%.
   - Any rounding drift is absorbed into Joy-jar so the total is 100.
4. **Review screen** reuses the 0002 jar list + editor: the proposed
   jars are shown exactly as normal jars in an editable list, with a
   plan-health chip. "Looks good" creates them (`jarsRepo.createJar`
   in order) and marks onboarding complete; "Edit" opens the normal jar
   editor. No new persistence — proposed jars are only staged in memory
   until confirmed.
5. **Tour.** After the jars are created (and once only), an overlay tour
   runs: 4–5 steps highlighting the bottom-nav Add button, the jars
   list, Insights, and Settings, each with a short caption and
   Next / Skip. Honours `prefers-reduced-motion` / Calm (no spotlight
   animation, instant transitions). A `preferences` flag records that
   it ran; "Replay the tour" and "Reset onboarding" live in Settings.
6. Onboarding and the tour never block a returning user: with jars
   present and the flags set, `/welcome` redirects to `/`.
7. Works in light / dark / Calm / colour-blind-safe; no horizontal
   scroll at 360px; every control ≥ 44px.

## Data touched

- `jars` + `subCategories` — created on confirm, via the existing repo.
- `preferences` (localStorage, via `src/lib/preferences.ts`) — new keys:
  `onboarding: 'pending' | 'done' | 'skipped'`, `tourDone: boolean`.
- No schema change. `seed.ts` grows a `seedExampleData()` used only by
  the "skip with defaults" path; the automatic empty-DB seed is removed
  from `getDatabase()` and gated behind onboarding.

## Screens / components

- `features/onboarding/WelcomePage.tsx` (route `/welcome`),
  `Questionnaire.tsx`, `proposeJars.ts` (pure), `ReviewProposal.tsx`
  (thin wrapper over the 0002 jar list/editor).
- `components/Tour.tsx` — hand-rolled coach-mark overlay (spotlight box +
  tooltip + Next/Skip); no new dependency (per ADR 0001). Targets
  elements by `data-tour="add|jars|insights|settings"` attributes added
  to the existing nav/screens.
- `features/settings/SettingsPage.tsx` — "Replay the tour" / "Reset
  onboarding" actions.
- `RxdbProvider` / `routes.tsx` — first-run redirect.

## Out of scope

- The Groq conversational agent and AI-worded questions/proposal
  (Phase 3 — this feature's `proposeJars` becomes its deterministic
  backbone).
- Importing an existing budget from another app during onboarding
  (CSV import already exists separately).
- Multi-currency handling of the income question beyond storing one
  currency (Phase 2).

## Test notes

- Unit: `proposeJars` — sums to 100 for a spread of answer combinations
  (no answers, high rent, has debt, already-saves-a-lot, zero income);
  clamps hold; rounding drift lands in Joy-jar.
- Unit: first-run predicate (`shouldOnboard(jars, prefs)`).
- Hand-verified (Playwright): fresh DB → `/welcome` → answer → review →
  create → tour → reload lands on `/` with no repeat; "Reset onboarding"
  from Settings brings it back.

## Changelog

- **2026-09-07** — spec created; in review.
