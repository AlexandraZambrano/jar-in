# 0012 — Fix pack (delete confirm, growth-jar figure, Calm/CVD colour, flow-jar opening balance)

- **Status:** ⬜ not started (spec in review)
- **Phase:** 1 (corrections to shipped features)
- **Spec refs:** DESIGN-STICKER-SHEET.md §2.3, §2.4, §5; SPEC.md §4
- **Depends on:** 0002, 0005, 0006, 0007

Bundles the corrections raised after the Phase 1 review. Each is small;
grouped so they ship and get tested together.

## 12a — Delete does nothing (P0 bug)

**Cause:** `TransactionFormPage`, `JarEditPage` and `IncomeEditPage`
guard delete with `window.confirm()`. When the browser suppresses the
dialog (repeated dialogs, standalone/PWA context, "block dialogs"),
`confirm()` returns `false` and the delete silently no-ops. Reproduced.

**Fix:**

1. New `components/ConfirmButton.tsx` — a two-step control: first click
   swaps the label to "Really delete?" + a Cancel; second click (or the
   explicit confirm) runs the action; clicking away / Cancel reverts.
   Styled as a `btn btn--ghost` in the danger colour. Reduced-motion safe.
2. Replace every `window.confirm()` call (transaction, jar, income
   delete; the jar-delete "N transactions become Unassigned" copy moves
   into the confirm state's caption).
3. Add `no-alert` and `no-restricted-globals` (`confirm`, `alert`,
   `prompt`) to `eslint.config.js` so this can't regress. `npm run check`
   must stay green.

**Acceptance:** deleting a transaction, a jar, and an income source each
works with no native dialog; the list and dashboard update live; no
`confirm/alert/prompt` remain in `src/`.

## 12b — Growth jars: show the monthly contribution on the Home card

Today an accumulation `JarCard` line is `Growth · €X of €Y` (balance of
target). It should also state what goes in each month.

**Fix:** the line becomes `Growth · €X of €Y · +€Z/mo`, where
`€Z = jarPlannedMinor(jar, monthlyIncome)` (already computed). Same
figure appears on the jar detail headline sub-line. Flow cards keep
`Flow · €X of €Y spent`.

**Acceptance:** every growth jar on Home and on its detail shows the
`+€Z/mo` figure; it updates when income or the jar % changes.

## 12c — Calm mode: mute the jar colours

Calm mode currently changes shadows / tilt / text but **not** the jar
fills, which stay candy-bright. Per the user and DESIGN §5.1's intent
(reduced sensory load), Calm should also dial the colours down.

**Fix:** `resolveJarColors(hex, { cvd, calm })` gains a `calm` path that
returns a muted fill — `oklch` of the base hue with chroma ×~0.55 and
lightness nudged toward the surface (about `color-mix(in oklab, hex 68%,
var(--bg))` equivalent, precomputed in JS so it works on `<canvas>`-free
SVG too). `on`-colour recomputed for contrast. The donut, jar cards,
chips, JarSelect and BalanceTimeline all read through this resolver, so
one change covers them. Calm + Dark and Calm + CVD compose.

**Acceptance:** toggling Calm visibly desaturates every jar surface
(Home, jars list, detail, donut, insights); contrast of text on the
muted fills still clears WCAG AA; screenshots refreshed.

## 12d — Colour-blind mode: don't force patterns by default

*(needs a decision — see the handover question. This spec assumes
option A.)*

**Fix (option A):** CVD mode does the Okabe–Ito hue swap only. Patterns
become a separate, independent switch: a new `preferences` a11y flag
`patterns` (Settings: "Add patterns to jars" — available on its own,
suggested alongside Colour-blind safe). `JarCard` / donut / `Tokens`
board render the pattern layer only when `patterns` is on, regardless of
`cvd`. The jar editor's pattern picker still stores a per-jar pattern so
it's ready when the switch is flipped.

**Acceptance:** turning on Colour-blind safe changes only the palette;
patterns appear only when "Add patterns to jars" is also on; the two can
be used independently; docs/DESIGN-STICKER-SHEET.md §5.2 updated.

## 12e — Flow jars: allow an opening balance + a lifetime figure

*(needs a decision on scope — see the handover question. This spec
assumes option A.)*

**Fix (option A):**

1. The jar editor shows **Opening balance (optional)** for flow jars
   too (not just accumulation). `jarsRepo` stops forcing
   `openingBalanceMinor = 0` for flow.
2. Flow jar **detail** gains a secondary "All time" line under the
   this-month headline: `lifetime spent = openingBalanceMinor + Σ all
   transactions for the jar`, with the count and the date range. The
   this-month-vs-cap headline and progress bar are unchanged (still the
   primary metric for a flow jar).
3. `dashboard/compute.ts` gets `flowLifetimeSpentMinor(jar, txns)`,
   unit-tested. No schema change (`openingBalanceMinor` already exists on
   every jar).

**Acceptance:** a flow jar can be given an opening balance; its detail
shows a correct all-time spent figure; the monthly cap view is
untouched; DATA-MODEL.md compute notes updated.

## Test notes

- Unit: `ConfirmButton` state machine; `flowLifetimeSpentMinor`;
  `resolveJarColors` calm/cvd/plain branches (contrast assertions);
  growth-card line formatter.
- Hand-verified (Playwright): delete transaction/jar/income with no
  native dialog; Calm toggle desaturates; CVD toggle without patterns;
  flow-jar opening balance round-trips.

## Changelog

- **2026-09-07** — spec created; in review. 12a (delete) is a P0 bug.
