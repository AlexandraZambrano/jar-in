# 0008 — CSV import of transactions

- **Status:** ⬜ not started
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

`features/transactions/ImportCsvPage.tsx`, `csvParse.ts`,
`ColumnMap.tsx`, `ImportPreview.tsx`.

## Out of scope

Saved import profiles per bank, automatic categorisation rules,
scheduled imports.

## Test notes

Unit: parser (delimiters, quotes, dates, sign), dedupe hash, row
validation. Hand-verified: full mapping → preview → import.

## Changelog

- _none yet_
