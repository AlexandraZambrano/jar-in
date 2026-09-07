import type {
  AmountSign,
  CsvMapping,
  DateOrder,
} from './csvParse';
import styles from './ImportCsv.module.css';

interface Props {
  headers: string[];
  sampleRows: string[][];
  mapping: CsvMapping;
  onMapping: (m: CsvMapping) => void;
  delimiter: string;
  onDelimiter: (d: string) => void;
  amountSign: AmountSign;
  onAmountSign: (s: AmountSign) => void;
  dateOrder: DateOrder;
  onDateOrder: (o: DateOrder) => void;
}

const DELIMS: [string, string][] = [
  [',', 'Comma ,'],
  [';', 'Semicolon ;'],
  ['\t', 'Tab'],
];

export function ColumnMap({
  headers,
  sampleRows,
  mapping,
  onMapping,
  delimiter,
  onDelimiter,
  amountSign,
  onAmountSign,
  dateOrder,
  onDateOrder,
}: Props) {
  const colOptions = headers.map((h, i) => (
    <option key={i} value={i}>
      {h || `Column ${i + 1}`}
    </option>
  ));

  return (
    <div className="stack">
      <label className="field">
        Delimiter
        <select value={delimiter} onChange={(e) => onDelimiter(e.target.value)}>
          {DELIMS.map(([d, label]) => (
            <option key={label} value={d}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Date column
        <select
          value={mapping.date}
          onChange={(e) => onMapping({ ...mapping, date: Number(e.target.value) })}
        >
          {colOptions}
        </select>
      </label>

      <label className="field">
        Date format
        <select value={dateOrder} onChange={(e) => onDateOrder(e.target.value as DateOrder)}>
          <option value="dmy">Day / Month / Year</option>
          <option value="mdy">Month / Day / Year</option>
          <option value="ymd">Year / Month / Day</option>
        </select>
      </label>

      <label className="field">
        Amount column
        <select
          value={mapping.amount}
          onChange={(e) => onMapping({ ...mapping, amount: Number(e.target.value) })}
        >
          {colOptions}
        </select>
      </label>

      <div className="field">
        In this file, an expense is…
        <div className={styles.seg}>
          <button
            type="button"
            aria-pressed={amountSign === 'expense-negative'}
            onClick={() => onAmountSign('expense-negative')}
          >
            a negative number
          </button>
          <button
            type="button"
            aria-pressed={amountSign === 'expense-positive'}
            onClick={() => onAmountSign('expense-positive')}
          >
            a positive number
          </button>
        </div>
      </div>

      <label className="field">
        Note column (optional)
        <select
          value={mapping.note ?? ''}
          onChange={(e) =>
            onMapping({
              ...mapping,
              note: e.target.value === '' ? null : Number(e.target.value),
            })
          }
        >
          <option value="">— none —</option>
          {colOptions}
        </select>
      </label>

      <div className="field">
        First rows
        <div className={styles.tableWrap}>
          <table className={styles.grid}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={i}>{h || `Column ${i + 1}`}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r, ri) => (
                <tr key={ri}>
                  {headers.map((_, ci) => (
                    <td key={ci}>{r[ci] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
