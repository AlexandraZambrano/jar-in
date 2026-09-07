# 0012 — Fix pack (delete confirm, growth-jar figure, Calm/CVD colour, flow-jar opening balance)

- **Status:** ✅ done
- **Phase:** 1 (corrections to shipped features)
- **Spec refs:** DESIGN-STICKER-SHEET.md §2.3, §2.4, §5; SPEC.md §4
- **Depends on:** 0002, 0005, 0006, 0007
- **Decisions:** 12d → patterns are a separate opt-in switch. 12e → flow
  jars get the full balance-over-time chart. (User, 2026-09-07.)

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
figure appears on the jar detail headline sub-line. Flow cards get a
parallel 3-segment line — see the 2026-09-07 follow-up (12f).

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

**Decision:** patterns become a separate opt-in switch.

**Fix:** CVD mode does the Okabe–Ito hue swap only. Patterns move to
their own independent `preferences` a11y flag `patterns` (Settings: "Add
patterns to jars", shown near Colour-blind safe with a note that the two
pair well). `JarCard` / donut / insights render the pattern layer only
when `patterns` is on, regardless of `cvd`; the two flags are fully
independent and compose. The jar editor keeps storing a per-jar pattern
so it's ready when the switch is flipped. `themes.css` `--cvd` flag and
`DESIGN-STICKER-SHEET.md` §5.2 updated to match.

**Acceptance:** turning on Colour-blind safe changes only the palette;
patterns appear only when "Add patterns to jars" is also on; the two can
be used independently; docs/DESIGN-STICKER-SHEET.md §5.2 updated.

## 12e — Flow jars: opening balance + a balance-over-time chart

**Decision:** flow jars get the same running-balance chart as growth
jars.

**Model.** A flow jar is treated as a running account: each month it is
"credited" its cap (`jarPlannedMinor`), each transaction debits it, and
`openingBalanceMinor` seeds it. The running balance = *how far ahead or
behind you are on this jar over time* — surplus rolls forward, an
overspend goes negative. This is exactly parallel to an accumulation
jar's `opening + months×planned − withdrawals`, with **transactions** as
the debit events instead of withdrawals.

**Fix:**

1. Jar editor shows **Opening balance (optional)** for flow jars too;
   `jarsRepo` stops forcing `openingBalanceMinor = 0` for flow.
2. Generalise `jars/timeline.ts`: `buildBalanceTimeline(jar,
   monthlyCreditMinor, debitEvents, ref)` where `debitEvents` is a
   normalised `{ amountMinor, date, label }[]` — withdrawals for
   accumulation, transactions (as debits) for flow. Point count, ordering
   and 0-clamp behaviour stay; its final point still matches the
   deterministic balance for that jar type.
3. `JarDetailPage` renders the chart for **both** jar types. Flow: the
   headline stays "spent this month / cap" + progress (primary metric);
   the chart is the secondary "over time" view with transaction markers.
   Accumulation: unchanged.
4. `dashboard/compute.ts` gets `flowRunningBalanceMinor(jar, planned,
   txns, ref)` (opening + monthsElapsed×planned − Σ txns, clamped ≥ 0 for
   display), unit-tested; the chart's endpoint equals it.

**Acceptance:** a flow jar can be given an opening balance; its detail
shows a running-balance chart seeded by it, with transaction markers,
whose endpoint matches `flowRunningBalanceMinor`; the monthly cap
headline is unchanged; DATA-MODEL.md compute notes updated.

## Test notes

- Unit: `ConfirmButton` state machine; `flowLifetimeSpentMinor`;
  `resolveJarColors` calm/cvd/plain branches (contrast assertions);
  growth-card line formatter.
- Hand-verified (Playwright): delete transaction/jar/income with no
  native dialog; Calm toggle desaturates; CVD toggle without patterns;
  flow-jar opening balance round-trips.

## Changelog

- **2026-09-07** — spec created; in review. 12a (delete) is a P0 bug.
- **2026-09-07** — **all shipped.**
  - **12a** `ConfirmButton` (two-step, no `window.confirm`); replaces the
    delete guard on transactions, jars, income and withdrawals. eslint
    `no-alert` + `no-restricted-globals` (`confirm/alert/prompt`) added —
    `src/` is clean. RTL test for the state machine. Verified
    end-to-end: all three deletes work with **no native dialog**.
  - **12b** growth `JarCard` line → `Growth · €X of €Y · €Z/mo`; jar
    detail headline gains `· +€Z/mo`.
  - **12c** `resolveJarColors(hex, { cvd, calm })` — `calm` mixes the
    fill toward a warm grey (`muteHex`). All jar surfaces (cards, donut,
    detail, insights, jar list, JarSelect) read through it. Verified:
    Calm now visibly desaturates every jar.
  - **12d** new a11y flag `patterns` (Settings: "Add patterns to jars").
    CVD mode is the Okabe–Ito swap only; the pattern overlay renders
    only when `patterns` is on, independent of `cvd`. Verified: CVD
    alone → 0 pattern overlays; CVD + patterns → overlays back.
  - **12e** Opening balance field now shows for flow jars too;
    `jarsRepo` no longer forces it to 0. `jars/timeline.ts` generalised
    to `buildBalanceTimeline(jar, monthlyCreditMinor, debits, ref)` with
    normalised `DebitEvent`s (withdrawals for accumulation, transactions
    for flow). `JarDetailPage` renders the running-balance chart for
    **both** types (flow keeps "spent this month / cap" as the
    headline). `flowRunningBalanceMinor` added + unit-tested. Flow jars
    are **not** back-dated in the seed, so a fresh flow jar shows the
    "fills in as months pass" empty state until it has history.
  - 60 unit tests green.
- **2026-09-07 (follow-up)** — two issues from a second pass:
  - **12e correction.** 12e only fixed `JarEditPage.onSubmit`; the repo
    still discarded the value. `jarsRepo.createJar` hard-set
    `openingBalanceMinor: 0` for non-accumulation jars and
    `updateJar`'s `else` branch reset it to `0` on every save, so a
    flow jar's opening balance never persisted. Now both persist
    `openingBalanceMinor` regardless of type; only `targetAmountMinor`
    stays accumulation-gated. Verified end-to-end: set €200 on a flow
    jar, save, reload editor → field shows €200.
  - **12f — flow Home/detail line matches growth.** `JarCard` flow line
    was `Flow · €X of €Y spent` (2 segments) vs growth's 3-segment
    `Growth · €X of €Y · €Z/mo`. Flow line is now
    `Flow · €X of €Y · €Z left` (or `· €Z over` past the cap) — same
    `·`-separated 3-segment shape. `JarDetailPage` flow sub-line
    likewise moves from `spent this month` to
    `N% of cap · €Y/mo[ · over cap]`, mirroring growth's
    `N% to goal · +€Z/mo`.
  - 79 unit tests green.
