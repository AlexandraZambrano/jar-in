---
description: Resume an in-progress jar-in feature from its spec
argument-hint: <NNNN or slug>
---

Resume work on a **jar-in** feature. Argument: `$ARGUMENTS` (a feature
number like `0004`, or a slug).

Do this:

1. Open the matching `docs/features/NNNN-*.md`. Read its acceptance
   criteria, Status and Changelog.
2. Cross-check against the code to find which criteria are **not yet
   met**. List them back to me.
3. Read `docs/DATA-MODEL.md` and `docs/DESIGN-STICKER-SHEET.md` for
   anything the remaining work touches.
4. Implement only the unmet criteria. Keep `docs/DATA-MODEL.md` in sync
   if schemas change.
5. `npm run check` must pass. Verify the affected screens in the preview
   and update screenshots if they changed.
6. Update the feature's Status + Changelog, `docs/PROGRESS.md`, and
   `docs/ROADMAP.md`.
7. Commit as `feat(<slug>): …` or `fix(<slug>): …` (no Co-Authored-By
   trailer for Claude).
