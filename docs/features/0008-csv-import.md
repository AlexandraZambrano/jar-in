# 0008 — CSV import of transactions

- **Status:** ✅ done
- **Phase:** 1
- **Spec refs:** SPEC.md §9, §13
- **Depends on:** 0002, 0005

## Goal

Bulk-add transactions from a bank/app CSV export: pick a file, map its
columns to `date / amount / note`, choose a default jar (and per-row
override), preview, import.

## Acceptance criteria

1. File picker accepts `.csv`; parsing is client-side only.
2. Column-mapping step: user maps CSV headers to `date`, `amount`,
   `note`; amount sign convention selectable (expense positive/negative).
3. Preview table shows parsed rows with the resolved jar; user can set a
   default jar and override per row.
4. Import writes `transactions` with `sourceType: "csv_import"`.
5. Re-importing the same file does not duplicate rows already imported
   in this session (dedupe on a content hash; `externalTransactionId`
   stays reserved for real bank sync).
6. Malformed rows are listed and skipped, not silently dropped.

## Data touched

`transactions` (bulk insert). Reads `jars`.

## Screens / components

`features/transactions/ImportCsvPage.tsx` (route `/transactions/import`,
linked from the transactions header), `ColumnMap.tsx`,
`ImportPreview.tsx`, `csvParse.ts` (parser + `extractRows` + `hashRow` +
`guessMapping`), `importDedupe.ts` (session hash set),
`transactionsRepo.importCsvTransactions`.

## Out of scope

Saved import profiles per bank, automatic categorisation rules,
scheduled imports.

## Test notes

Unit: parser (delimiters, quotes, dates, sign), dedupe hash, row
validation. Hand-verified: full mapping → preview → import.

## Changelog

- **2026-09-07** — All criteria met.
  - `parseCsv` — hand-rolled RFC-4180-ish parser (quoted fields, `""`
    escapes, embedded newlines, CRLF, BOM). `sniffDelimiter` picks
    `, ; \t` from the header line; the user can override.
  - 3-step wizard: **File** (client-side `FileReader`, nothing uploaded)
    → **Columns** (`guessMapping` auto-fills date / amount / note from
    header names; delimiter, date-order `dmy/mdy/ymd` auto-guessed;
    expense-sign toggle; sample rows shown) → **Preview** (`extractRows`
    → table with a default jar + per-row jar override).
  - Import bulk-inserts with `sourceType: "csv_import"`,
    `external*` left null.
  - Session dedupe: rows hashed on `date|amountMinor|normalised-note`
    (`hashRow`), kept in a module `Set` (`importDedupe.ts`). Re-selecting
    the same file in the same session shows every row as "already
    imported" and disables the button. Not persisted — durable dedupe is
    real bank sync's job via `externalTransactionId`.
  - Malformed rows are listed with a reason and skipped; rows on the
    non-expense side of the sign convention are counted as "look like
    income, skipped" — neither is silently dropped.
  - 56 unit tests (`csvParse` ×11, `importDedupe` ×2). Verified
    end-to-end (Playwright): a `;`-delimited EU-decimal file → 4
    imported, 1 income skipped, 1 unreadable listed; re-import in-session
    → 0 importable.
