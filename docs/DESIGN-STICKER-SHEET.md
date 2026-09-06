# Jars — "Sticker Sheet" Design Spec (v1)

The visual language for the Jars (`jar-in`) PWA. Companion to
[`SPEC.md`](SPEC.md) (product & architecture). Canvas mock-ups:
the *Jars — Sticker Sheet Design* artifact (Home screen in four modes +
a token board).

---

## 1. Idea in one line

**Playful, tactile, and legible.** Every surface reads like a die-cut
sticker on a dotted sheet; the one exception is the AI coach, which is a
hand-written note on legal-pad paper *pinned on top* of the stickers.
Colour is never doing a job alone — every jar is encoded as **colour +
icon + label** — so the look stays loud without excluding anyone.

Non-goals: gradients-as-decoration, soft "SaaS" cards, a single accent
hue carrying the brand, hairline everything, Inter/Roboto.

---

## 2. Foundations

### 2.1 Type

| Role | Font | Weight | Size / line-height | Notes |
|---|---|---|---|---|
| Display XL | Fredoka | 700 | 34 / 36, ‑1% tracking | screen balance, big money |
| Display L | Fredoka | 700 | 24 | section titles, donut centre |
| Title | Fredoka | 600 | 15 | jar name |
| Number | Hanken Grotesk | 700 | 14–15, `tabular-nums` | all money & % — Fredoka figures are too soft for columns |
| Body | Hanken Grotesk | 400 | 13 / 1.5 | |
| Body strong | Hanken Grotesk | 600 | 13 | |
| Caption | Hanken Grotesk | 500 | 11 | meta, `FLOW` / `GROWTH` tags |
| Coach note | **Caveat** | 500 | 17 / 1.3 | decorative; **coach note only** |

- **Fallbacks** (Google Fonts don't embed in PNG/PDF export): Fredoka →
  `'Fredoka', system-ui, sans-serif`; Hanken → `'Hanken Grotesk',
  system-ui, sans-serif`; Caveat → `'Caveat', ui-rounded, cursive`.
- In **Calm** and **Colour-blind safe** modes: coach note → Hanken 500
  (no Caveat), and every step goes up ~1px (body 13→15, caption 11→12).
- Minimum on-screen body text: 13px default, 15px in Calm. Print/export
  never below 12pt.

### 2.2 Colour — UI roles

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FFF6E9` (cream) | `#17131F` (warm eggplant) |
| `--bg-dots` | `rgba(43,36,64,0.07)` | `rgba(255,255,255,0.05)` |
| `--surface` | `#FFFFFF` | `#241D30` |
| `--ink` | `#2B2440` | `#F3ECFA` |
| `--ink-soft` | `#6E6685` | `#A99CC0` |
| `--accent` | `#E8384F` (cherry) | `#FF5C7A` |
| `--note-paper` | `#FBEFC2` | `#2E2A22` |
| `--hairline` (dark stickers) | — | `rgba(255,255,255,0.14)` |
| `--sticker-ring` | `rgba(43,36,64,0.12)` | n/a |

Dark mode uses a **warm** near-black on purpose — slate + violet is the
default "AI dark mode" and we're avoiding it.

### 2.3 Colour — jar palette (default "Candy")

| Jar | Hex | Text on fill |
|---|---|---|
| Essentials | `#E8384F` | white |
| Investment | `#2C63E6` | white |
| Safe fund | `#8B44D7` | white |
| Joy-jar | `#F5820A` | `--ink` |
| Health | `#1FA971` | white |
| Other | `#64708A` | white |

Rule: **white text on any fill darker than ~55% luminance, `--ink`
otherwise.** Contrast between the design and the fill is carried by the
4px white sticker border, not by the fill vs. background.

**Dark-mode jar hues** (lightened ~10% so they don't vibrate, used for
the left edge, the tinted icon chip, the % and the progress fill —
never a flooded fill):
Essentials `#F2657A` · Investment `#5B8DEF` · Safe fund `#A66BE0` ·
Joy-jar `#F5A24A` · Health `#37E0A0` · Other `#9AA7C0`.

### 2.4 Colour — jar palette (Colour-blind safe)

Okabe–Ito, mutually distinguishable across protan/deutan/tritan, plus a
**fixed pattern per jar** (assigned at jar creation, travels everywhere
— chip, progress fill, donut segment, legend):

| Jar | Hex | Pattern | Text on fill |
|---|---|---|---|
| Essentials | `#D55E00` | solid (baseline) | white |
| Investment | `#0072B2` | 45° hatch | white |
| Safe fund | `#CC79A7` | dots | `--ink` |
| Joy-jar | `#E69F00` | horizontal lines | `--ink` |
| Health | `#009E73` | grid | `--ink` |
| Other | `#56B4E9` | vertical lines | `--ink` |

### 2.5 Space, radius, elevation

- **Space scale**: `4 8 12 16 20 24 32` (4px base).
- **Radius**: sticker `16` · pill / chip `999` · icon bubble `50%` ·
  progress bar `999` · coach note `4` (barely rounded — it's paper).
- **Elevation** — exactly two tokens:
  - `--shadow-sticker`: `0 6px 14px rgba(43,36,64,0.16)` (soft) + a
    `0 0 0 1.5px var(--sticker-ring)` hairline.
  - `--shadow-note`: `4px 4px 0 rgba(43,36,64,0.22)` — **hard, no
    blur**. Only the coach note uses it, on purpose, to read as a
    different material.
- **Tilt** (decorative): `±0.6°–1.5°`, **seeded from the element's
  index** so it's stable between renders — never `Math.random()` per
  paint. Coach note is a fixed `−1.4°`. All tilt → `0` in Calm mode.

---

## 3. Components

### 3.1 Sticker (the base surface)

```css
.sticker {
  border: 4px solid var(--sticker-border, #fff);
  box-shadow: var(--shadow-sticker), 0 0 0 1.5px var(--sticker-ring);
  background-clip: padding-box;      /* fill stops at the white border */
  border-radius: 16px;
  transform: rotate(var(--tilt, 0deg));
}
.sticker.gloss {                     /* optional; off in Calm / reduced-transparency */
  background-image: linear-gradient(180deg, rgba(255,255,255,.20), rgba(255,255,255,0) 42%);
}
```

Dark mode overrides: `--sticker-border` unset, `border: 2px solid
var(--hairline)`, `background: var(--surface)`, shadow →
`0 8px 18px rgba(0,0,0,.45)`.

### 3.2 Jar card

Sticker + 34px icon chip (circle, translucent white or `--ink` wash) +
Title + `tabular-nums` % + one caption line (`FLOW · €180 of €400
spent`) + progress bar.

- **Flow jar** progress = spent ÷ period cap. At/over cap: fill turns to
  a warning treatment **and** shows a `⚠ over` label.
- **Growth jar** progress = balance ÷ `target_amount`, plus a `✓` when
  the goal is met.
- Default: solid jar-colour fill, white text. Dark: dark surface, hue
  left-edge + hue icon chip + hue %. CVD: solid Okabe–Ito fill + pattern
  overlay + icon + label + numeric % in the caption.

### 3.3 Coach note (Paper Ledger style)

The AI narration/coaching surface (§8.2 of `SPEC.md`) — deliberately
**not** a sticker.

- `--note-paper` background, `2px solid var(--ink)` border,
  `--shadow-note` (hard offset), 5px `--accent` spine on the left, a
  translucent "tape" strip crossing the top edge, radius 4, tilt −1.4°.
- Text: Caveat 500 / 17. Swaps to Hanken 500 in Calm & CVD.
- Always carries a machine-readable `COACH` label (visually shown in
  Calm/CVD, `aria-label` otherwise). Anything it claims (e.g. a new
  projected goal date) is **also** available as plain UI on the jar
  detail — the note is never the only place a number lives.

### 3.4 Allocation donut

Two rings: inner = **planned** split (from jar %), outer = **actual**
(spent for flow jars, contributed for growth). Centre hole shows the
focused figure. Icon-bubble stickers sit on the outer ring at each
segment's mid-angle, joined by a 2px leader line.

- CVD mode: 3px `--bg` dividers between segments + a leader-line legend
  list (swatch-with-pattern + icon + label + %).
- Calm mode: no sweep animation; segment values printed as text below.

### 3.5 Bottom nav

5 items, labels **always visible**. Centre = the Add FAB: a 50px accent
sticker, tilt −4° (0 in Calm). Every item ≥ 44×44 hit area.

### 3.6 Iconography

Custom, hand-drawn feel: 2px stroke, round caps/joins, drawn on a 28×26
grid, a small friendly face where the shape allows (house, shield).
Never emoji, never a generic line-icon set. One icon per jar, chosen at
creation, shown everywhere that jar appears.

---

## 4. Motion

| Event | Default | Calm / `prefers-reduced-motion` |
|---|---|---|
| Screen enter | stickers fade + scale `.96→1`, 220ms ease-out, 30ms stagger | opacity only, ≤1 frame, no stagger |
| Donut | sweep 0→value, 500ms | none, render final |
| Press | scale `.97`, 120ms | none |
| Coach note | never animates | never animates |

No parallax, no auto-playing anything, no confetti by default (a single
opt-in celebration on a met growth goal is allowed, suppressed in Calm).

---

## 5. Accessibility modes

Three switches. **Dark** and **Calm** follow the OS by default and have
a manual override; **Colour-blind safe** is manual only. They compose —
CVD + Dark + Calm is a valid combination and must render correctly.

### 5.1 Calm (reduced sensory load)

Auto-on with `prefers-reduced-motion: reduce` **or**
`prefers-contrast: more`; manual toggle in Settings.

- Tilt → 0 on every element.
- Gloss overlays removed; page dot-grid removed (flat `--bg`).
- Soft sticker shadow removed → separation by a solid `2px var(--ink)`
  ring.
- Type +1 step; body weight 400 → 500; `--ink-soft` darkened to
  `#4A4460` (light) so captions still clear AA.
- Progress bars 8px → 12px, with a 2px border.
- Donut static; all transitions ≤ 1 frame.
- Coach note: Hanken face, no rotation, keeps paper + hard shadow.

### 5.2 Colour-blind safe

- Jar palette → Okabe–Ito (§2.4). Every jar simultaneously shows
  colour + **pattern** + icon + text label + numeric %.
- Donut: segment dividers + leader-line legend.
- Status is never colour-only: over-cap shows `⚠ over`, on-track `✓`.
- Contrast targets: fill vs. adjacent fill/bg ≥ **3:1**; text ≥
  **4.5:1**.

### 5.3 Dark

- `prefers-color-scheme: dark` + toggle.
- Warm eggplant roles (§2.2); jar hues from the dark set (§2.3).
- Stickers → raised dark surfaces; jar colour appears as a left edge +
  tinted icon chip + hue % + progress fill, never a flooded card.
- Coach note → aged paper (`#2E2A22` / `#E9E0C8` ink, `#5A5240` border).
- Gloss reduced to ~6% (kept subtle, not removed, unless Calm).

### 5.4 Baseline (all modes, non-negotiable)

- Touch targets ≥ **44×44 px**.
- Visible focus: `2px solid var(--ink)` outline at `2px` offset on
  every interactive element (shows in dark because `--ink` is light).
- Text contrast ≥ WCAG **AA**; aim **AAA** (7:1) for screen balances
  and the coach note.
- Honour `prefers-reduced-transparency` → drop gloss + tape translucency
  (use solid equivalents).
- Every non-text status/among-jars distinction has a text or shape
  partner — colour is always redundant, never sole.
- Content order in the DOM matches reading order; the donut has a
  text-equivalent summary adjacent to it.

---

## 6. Implementation notes

- Tokens as CSS custom properties on `:root`. Theme + a11y are attribute
  hooks so they compose:

  ```css
  :root { /* light + candy defaults */ }
  :root[data-theme="dark"],
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark roles + dark jar hues */ } }
  :root[data-a11y~="calm"],
  @media (prefers-reduced-motion: reduce) { /* calm overrides */ }
  @media (prefers-contrast: more) { /* calm overrides */ }
  :root[data-a11y~="cvd"] { /* Okabe–Ito vars; enable [data-pattern] fills */ }
  ```

- A **jar** row in the data model carries `color`, `pattern`, and
  `icon`. Rendering *always* uses all three; the CVD toggle only changes
  which `color`/`pattern` values are active, not whether patterns show.
- `pattern` values: `solid | hatch | dots | hline | grid | vline`,
  implemented as CSS `repeating-linear-gradient` / `radial-gradient`
  overlays (no image assets).
- Tilt: `--tilt: calc((var(--seed) % 5 - 2) * 0.5deg)` where `--seed` is
  a stable per-element integer.
- PWA theme-color meta: `#FFF6E9` light / `#17131F` dark.
- Fonts: single `<link>` to `fonts.googleapis.com` (the only permitted
  font host); always give the fallback stacks in §2.1.

---

## 7. Open questions

- Confirm Fredoka vs. a slightly less rounded display face once real
  copy density is known (long jar names, 3+ sub-categories).
- CVD pattern set at very small sizes (16px legend swatch) — verify the
  `grid` and `vline` patterns still read; may need to drop to 4 patterns
  + rely more on icon.
- Household / shared jars need a visual "shared" marker that survives
  all three modes — not yet designed (a corner fold? a second thin
  border?). Track with §5 of `SPEC.md`.
