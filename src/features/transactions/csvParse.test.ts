import { describe, expect, it } from 'vitest';
import {
  extractRows,
  guessMapping,
  hashRow,
  parseCsv,
  parseCsvDate,
  sniffDelimiter,
} from './csvParse';

describe('parseCsv', () => {
  it('parses a plain comma file', () => {
    const { headers, rows } = parseCsv('date,amount,note\n2026-06-01,-12.50,Coffee\n');
    expect(headers).toEqual(['date', 'amount', 'note']);
    expect(rows).toEqual([['2026-06-01', '-12.50', 'Coffee']]);
  });

  it('handles quotes, embedded commas/newlines, "" escapes and CRLF', () => {
    const csv =
      'a,b\r\n' +
      '"has, comma","line1\nline2"\r\n' +
      '"she said ""hi""",plain\r\n';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(['a', 'b']);
    expect(rows[0]).toEqual(['has, comma', 'line1\nline2']);
    expect(rows[1]).toEqual(['she said "hi"', 'plain']);
  });

  it('sniffs semicolons and tabs, and strips a BOM', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3')).toBe(';');
    expect(sniffDelimiter('a\tb\n1\t2')).toBe('\t');
    const { headers } = parseCsv('﻿date;amount\n2026-01-01;5');
    expect(headers).toEqual(['date', 'amount']);
  });

  it('drops blank lines', () => {
    const { rows } = parseCsv('a,b\n\n1,2\n\n');
    expect(rows).toEqual([['1', '2']]);
  });
});

describe('parseCsvDate', () => {
  it('reads ISO regardless of order', () => {
    expect(parseCsvDate('2026-03-09T10:00:00Z', 'dmy')).toBe('2026-03-09');
  });
  it('reads dmy / mdy / dotted / 2-digit year', () => {
    expect(parseCsvDate('09/03/2026', 'dmy')).toBe('2026-03-09');
    expect(parseCsvDate('03/09/2026', 'mdy')).toBe('2026-03-09');
    expect(parseCsvDate('09.03.26', 'dmy')).toBe('2026-03-09');
  });
  it('rejects impossible dates', () => {
    expect(parseCsvDate('31/02/2026', 'dmy')).toBeNull();
    expect(parseCsvDate('nope', 'dmy')).toBeNull();
    expect(parseCsvDate('2026/13/01', 'ymd')).toBeNull();
  });
});

describe('extractRows', () => {
  const rows = [
    ['2026-06-01', '-12.50', 'Coffee'],
    ['2026-06-02', '-1.234,56', 'Rent'], // EU decimal, negative = expense
    ['2026-06-03', '80.00', 'Salary'], // positive -> income when expense-negative
    ['bad-date', '-5', 'x'],
    ['2026-06-04', 'abc', 'y'],
    ['2026-06-05', '0', 'z'],
  ];
  const m = { date: 0, amount: 1, note: 2 };

  it('imports expenses, skips income, collects malformed rows', () => {
    const r = extractRows(rows, m, {
      amountSign: 'expense-negative',
      dateOrder: 'dmy',
      currency: 'EUR',
    });
    expect(r.ok.map((x) => [x.dateISO, x.amountMinor, x.note])).toEqual([
      ['2026-06-01', 1250, 'Coffee'],
      ['2026-06-02', 123456, 'Rent'],
    ]);
    expect(r.skippedIncome).toBe(1);
    expect(r.bad.map((b) => b.index)).toEqual([4, 5, 6]);
  });

  it('flips with the expense-positive convention', () => {
    const r = extractRows([['2026-06-03', '80.00', 'Groceries']], m, {
      amountSign: 'expense-positive',
      dateOrder: 'dmy',
      currency: 'EUR',
    });
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].amountMinor).toBe(8000);
  });
});

describe('hashRow', () => {
  it('is stable and ignores note whitespace/case', () => {
    expect(hashRow('2026-06-01', 1250, '  Coffee ')).toBe(
      hashRow('2026-06-01', 1250, 'coffee'),
    );
    expect(hashRow('2026-06-01', 1250, 'a')).not.toBe(
      hashRow('2026-06-01', 1251, 'a'),
    );
  });
});

describe('guessMapping', () => {
  it('matches common bank-export headers', () => {
    expect(guessMapping(['Booking Date', 'Description', 'Amount'])).toEqual({
      date: 0,
      amount: 2,
      note: 1,
    });
  });
});
