# 0005 — Transactions (manual entry + list)

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §4, §9
- **Depends on:** 0001, 0002

## Goal

The user can record spending against a jar (and optionally a
sub-category) via a fast entry flow reached from the "+" nav button, and
review/edit/delete past transactions. This is what makes the dashboard's
"spent" numbers real.

## User stories

- As a user, I can add an expense in a few taps: amount, jar, date
  (defaults today), optional sub-category and note.
- As a user, I can see a dated list of my transactions, filter by jar,
  and edit or delete any of them.
- As a user, transactions for a soft-deleted jar show as "Unassigned"
  and I can reassign them.

## Acceptance criteria

1. `/add` is a numeric-keypad entry sheet: amount (required, > 0), jar
   selector (icons + names), date (default today), sub-category
   (optional, from the chosen jar), note (optional). Save writes a
   `transactions` doc with `sourceType: "manual"`.
2. Hit targets ≥ 44px; no fake OS keyboard drawn (design §"Mobile
   prototypes").
3. `/transactions` lists newest-first, grouped by day, each row: jar
   icon, note/jar name, sub-category, amount. Filter by jar.
4. Editing / deleting updates the list and the dashboard live.
5. Reassign flow: a transaction whose `jarId` points at a soft-deleted
   jar renders as "Unassigned" with a "Move to…" action.
6. `externalTransactionId` / `externalAccountId` exist on the schema and
   are always `null` in v1. RxDB has no unique constraint beyond the
   primary key, so import-time dedupe (feature 0008) — not a DB index —
   guards the future bank sync. The fields are reserved so bank sync
   lands without a migration.

## Data touched

`transactions` (CRUD). Reads `jars`, `subCategories`.

## Screens / components

`features/transactions/AddTransactionPage.tsx`,
`TransactionsPage.tsx`, `transactionsRepo.ts`, `Keypad`, `JarSelect`.

## Out of scope

CSV import (0008), withdrawal events (0007 — a separate event type),
recurring transactions, splitting one transaction across jars.

## Test notes

Unit: current-month filter, day grouping, reassign selection.
Hand-verified: keypad entry, live dashboard update.

## Changelog

- **2026-09-06** — All criteria met. `/add` + `/transactions/:id` share
  `TransactionFormPage` (keypad + `JarSelect` chips + date + jar
  sub-category + note); no fake OS chrome. `/transactions` groups
  newest-day-first with per-day totals and jar filter chips
  (`transactions/compute.ts`, unit-tested). Orphaned transactions (jar
  soft-deleted) render as "Unassigned" with an inline "Move to…" that
  calls `reassignTransaction`. Transactions inherit the jar's currency in
  v1. Adding a transaction moves the dashboard's computed "spent" and the
  donut's outer ring immediately (verified end-to-end with Playwright:
  three entries → Essentials €225 / €1,200, Joy-jar €62 / €240).
- **2026-09-06** — Also completed feature 0002 criterion 6: the jar-delete
  confirm now names how many transactions will become "Unassigned".
