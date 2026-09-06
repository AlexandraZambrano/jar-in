# ADR 0003 — Design-system implementation

- **Date:** 2026-09-06
- **Status:** accepted

## Context

`DESIGN-STICKER-SHEET.md` defines a token set, a "sticker" surface
recipe, a distinct "paper note" surface, custom hand-drawn icons, and
three **composable** accessibility modes (Calm, Colour-blind safe, Dark)
driven by `prefers-*` queries and `data-*` attributes.

## Decision

- Tokens as CSS custom properties in `src/styles/tokens.css`. Themes and
  a11y overrides in `themes.css`, layered exactly as the spec's §6
  snippet: `:root` → `[data-theme="dark"]` / `prefers-color-scheme` →
  `[data-a11y~="calm"]` / `prefers-reduced-motion` / `prefers-contrast`
  → `[data-a11y~="cvd"]`.
- `src/lib/preferences.ts` owns the `{theme, a11y[]}` object, persists to
  `localStorage` (try/catch), and writes `data-theme` + `data-a11y` onto
  `<html>`. A tiny inline script in `index.html` applies the stored
  value before first paint to avoid a flash.
- Jar visual identity is **always** `color` + `icon` + `pattern` +
  text label together — never colour alone. The `cvd` mode swaps the
  palette to Okabe–Ito and turns on the pattern layer; the data model
  stores all three on every jar.
- Icons are inline SVG in `src/components/icons.tsx` (2px stroke, 28×26
  grid). No emoji, no icon font.
- Two elevation tokens only: `--shadow-sticker` (soft) and
  `--shadow-note` (hard offset). Decorative tilt is a CSS var seeded
  from an element index, zeroed in `calm`.

## Consequences

- Adding a screen means composing existing primitives + tokens; no
  per-screen colour decisions.
- The three a11y modes are testable by toggling `<html>` attributes in
  jsdom / Storybook-less snapshot checks.
- If a future brand needs different tokens, only `src/styles` changes.
