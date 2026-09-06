# 0003 — Wallets

- **Status:** ⬜ not started
- **Phase:** 1
- **Spec refs:** SPEC.md §3, §6
- **Depends on:** 0001

## Goal

The user can manage personal wallets — a named source of funds with a
currency. Wallets are where income lands and, later, what contribution
rules draw from.

## User stories

- As a user, I can add a wallet with a name and currency, edit it, and
  remove one I no longer use.

## Acceptance criteria

1. `/wallets` lists wallets (name, currency). Reached from Settings and
   from the income-source editor.
2. Create / edit: name (required), currency (ISO-4217 picker, default
   from device locale). `ownerType` is always `user` in v1.
3. Deleting a wallet that is a destination for an income source is
   blocked with an explanation until the income source is repointed.
4. Changes propagate live; `updatedAt` bumped.

## Data touched

`wallets` (CRUD). Reads `incomeSources` for the delete guard.

## Screens / components

`features/wallets/WalletsPage.tsx`, `WalletEditPage.tsx`,
`walletsRepo.ts`, `CurrencyPicker` (shared with income).

## Out of scope

Shared/household wallets and contribution rules (Phase 4), balances
(wallets track a currency, not a running balance, in v1).

## Test notes

Unit: currency validation, delete-guard logic. Hand-verified: CRUD.

## Changelog

- _none yet_
