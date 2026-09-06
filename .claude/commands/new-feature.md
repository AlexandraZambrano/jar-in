---
description: Scaffold and draft a spec-driven feature for jar-in
argument-hint: <slug> <one-line goal>
---

You are starting a new feature for the **jar-in** app using its
spec-driven workflow (`docs/WORKFLOW.md`).

Arguments: `$ARGUMENTS` — first token is the slug, the rest is the goal.

Do this:

1. Run `npm run feature <slug> "<goal>"` to create
   `docs/features/NNNN-<slug>.md` from the template.
2. Read `docs/SPEC.md`, `docs/DESIGN-STICKER-SHEET.md`,
   `docs/DATA-MODEL.md` and the existing feature specs for context.
3. Fill in the new feature spec: goal, user stories, **numbered testable
   acceptance criteria**, data touched (note any schema change), screens/
   components, out-of-scope, test notes.
4. Add its row to `docs/ROADMAP.md` (status ⬜ or 🟡).
5. Show me the drafted spec and **stop for review**. Do not write feature
   code until I approve the spec.
6. After approval: implement against the acceptance criteria only, run
   `npm run check`, verify in the preview, capture screenshots, update
   the feature Status + Changelog + `docs/PROGRESS.md` + `docs/ROADMAP.md`,
   then commit as `feat(<slug>): …` (no Co-Authored-By trailer).
