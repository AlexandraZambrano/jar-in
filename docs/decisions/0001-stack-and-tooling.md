# ADR 0001 — Stack & tooling

- **Date:** 2026-09-06
- **Status:** accepted

## Context

`SPEC.md` §12 fixes the broad stack (React PWA, TypeScript, RxDB,
Supabase later, Groq later). This ADR pins the remaining choices.

## Decision

- **Build:** Vite + React 18 + TypeScript (strict). `vite-plugin-pwa`
  (Workbox) for the manifest + service worker.
- **Local DB:** RxDB 16 with `storage-dexie` (IndexedDB) — the free,
  OSS storage. Dev-mode plugin in development only.
- **Routing:** `react-router-dom` v6.
- **State:** none beyond RxDB. A ~30-line `useRxQuery` hook subscribes to
  `RxQuery.$`. No Redux/Zustand.
- **Styling:** hand-written CSS with custom properties + CSS Modules for
  component scope. **Not** Tailwind — the design spec's token +
  `data-theme` / `data-a11y` composition is cleaner in plain CSS.
- **Lint/format:** ESLint flat config + `eslint-plugin-jsx-a11y` (the
  accessibility rules matter for this project) + Prettier.
- **Test:** Vitest + `@testing-library/react` + jsdom.
- **Package manager:** npm (guaranteed present; switch is cheap).

## Consequences

- Small dependency surface; every runtime dep is OSS and self-hostable.
- We own the RxDB↔React glue (small, swappable).
- Plain CSS means no utility-class ergonomics; mitigated by a tight
  token set and shared primitives.
- Revisit `useRxQuery` vs. a library if query needs get complex.
