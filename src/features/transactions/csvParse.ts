import { parseAmountInput, toMinor } from '@/lib/money';

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Minimal RFC-4180-ish CSV parser: quoted fields, "" escapes, embedded
 *  newlines, CRLF, BOM. Delimiter is sniffed from the first line unless given. */
export function parseCsv(
  text: string,
  delimiter?: string,
): { headers: string[]; rows: string[][] } {
  const s = stripBom(text);
  const delim = delimiter ?? sniffDelimiter(s);

  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delim) endField();
    else if (ch === '\r') continue;
    else if (ch === '\n') endRecord();
    else field += ch;
  }
  if (field.length > 0 || record.length > 0) endRecord();

  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = nonEmpty;
  return { headers: headers.map((h) => h.trim()), rows };
}

export function sniffDelimiter(text: string): string {
  const firstLine = stripBom(text).split(/\r?\n/, 1)[0] ?? '';
  const scored = [',', ';', '\t'].map(
    (d) => [d, firstLine.split(d).length - 1] as const,
  );
  scored.sort((a, b) => b[1] - a[1]);
  return scored[0][1] > 0 ? scored[0][0] : ',';
}

export type AmountSign = 'expense-negative' | 'expense-positive';
export type DateOrder = 'dmy' | 'mdy' | 'ymd';

export interface CsvMapping {
  date: number;
  amount: number;
  note: number | null;
}

export interface ExtractOpts {
  amountSign: AmountSign;
  dateOrder: DateOrder;
  currency: string;
}

export interface CsvRow {
  index: number; // 1-based data-row number
  dateISO: string;
  amountMinor: number; // positive
  note: string;
  hash: string;
}

export interface CsvSkip {
  index: number;
  reason: string;
}

export interface ExtractResult {
  ok: CsvRow[];
  bad: CsvSkip[];
  /** rows on the non-expense side of the sign convention */
  skippedIncome: number;
}

/** Simple stable string hash (djb2) for session dedupe. */
export function hashRow(dateISO: string, amountMinor: number, note: string): string {
  const key = `${dateISO}|${amountMinor}|${note.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function parseCsvDate(raw: string, order: DateOrder): string | null {
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parts = s.split(/[/.\-\s]+/).filter(Boolean);
  if (parts.length < 3) return null;
  let y: string, mo: string, d: string;
  if (order === 'ymd') [y, mo, d] = parts;
  else if (order === 'mdy') [mo, d, y] = parts;
  else [d, mo, y] = parts;

  if (y.length === 2) y = String(2000 + Number(y));
  const yi = Number(y);
  const moi = Number(mo);
  const di = Number(d);
  if (!yi || moi < 1 || moi > 12 || di < 1 || di > 31) return null;

  const isoStr = `${String(yi).padStart(4, '0')}-${String(moi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
  const dt = new Date(`${isoStr}T00:00:00Z`);
  return Number.isNaN(dt.getTime()) || dt.getUTCDate() !== di ? null : isoStr;
}

export function extractRows(
  rows: string[][],
  m: CsvMapping,
  opts: ExtractOpts,
): ExtractResult {
  const ok: CsvRow[] = [];
  const bad: CsvSkip[] = [];
  let skippedIncome = 0;

  rows.forEach((cols, i) => {
    const index = i + 1;
    const dateRaw = cols[m.date] ?? '';
    const amountRaw = cols[m.amount] ?? '';
    const note = m.note != null ? (cols[m.note] ?? '').trim() : '';

    const dateISO = parseCsvDate(dateRaw, opts.dateOrder);
    if (!dateISO) {
      bad.push({ index, reason: `couldn't read date "${dateRaw}"` });
      return;
    }
    const value = parseAmountInput(amountRaw);
    if (value == null) {
      bad.push({ index, reason: `couldn't read amount "${amountRaw}"` });
      return;
    }
    if (value === 0) {
      bad.push({ index, reason: 'amount is 0' });
      return;
    }
    const isExpense = opts.amountSign === 'expense-negative' ? value < 0 : value > 0;
    if (!isExpense) {
      skippedIncome++;
      return;
    }
    const amountMinor = toMinor(Math.abs(value), opts.currency);
    ok.push({ index, dateISO, amountMinor, note, hash: hashRow(dateISO, amountMinor, note) });
  });

  return { ok, bad, skippedIncome };
}

/** Best-effort auto-mapping from header names. */
export function guessMapping(headers: string[]): CsvMapping {
  const find = (res: RegExp[]) =>
    headers.findIndex((h) => res.some((re) => re.test(h.toLowerCase())));
  const date = find([/date/, /fecha/, /datum/, /booking/]);
  const amount = find([/amount/, /value/, /importe/, /betrag/, /debit/, /montant/]);
  const note = find([/desc/, /note/, /memo/, /payee/, /concepto/, /reference/, /detail/]);
  return {
    date: date >= 0 ? date : 0,
    amount: amount >= 0 ? amount : Math.min(1, headers.length - 1),
    note: note >= 0 ? note : null,
  };
}
