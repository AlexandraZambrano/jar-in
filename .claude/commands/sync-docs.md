---
description: Reconcile jar-in's SDD docs with the current code and report drift
---

Audit the **jar-in** spec-driven docs against reality. Do not change
application code.

1. Compare `docs/DATA-MODEL.md` (schema table + mermaid ER) with
   `src/db/schemas/*.ts`. Report any field, index, enum or relation that
   differs. Fix the doc to match the code (code wins unless the
   difference is clearly a code bug — then flag it, don't fix code).
2. Compare `docs/ROADMAP.md` statuses and each `docs/features/*.md`
   Status with what's actually implemented and wired into routes.
   Correct the statuses.
3. Check `docs/ARCHITECTURE.md`'s folder map and data-flow description
   against `src/`. Update stale parts.
4. Append a dated entry to `docs/PROGRESS.md` summarising the drift found
   and corrected.
5. Show me a short diff summary. Commit as `docs: sync with code`.
