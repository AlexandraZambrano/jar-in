import type { Jar } from '@/db/schemas';
import { formatMoney } from '@/lib/money';
import { isImported } from './importDedupe';
import type { ExtractResult } from './csvParse';
import styles from './ImportCsv.module.css';

const MAX_ROWS = 60;

interface Props {
  result: ExtractResult;
  jars: Jar[];
  currency: string;
  locale?: string;
  defaultJarId: string;
  onDefaultJar: (id: string) => void;
  perRowJar: Record<number, string>;
  onRowJar: (rowIndex: number, jarId: string) => void;
}

export function ImportPreview({
  result,
  jars,
  currency,
  locale,
  defaultJarId,
  onDefaultJar,
  perRowJar,
  onRowJar,
}: Props) {
  const shown = result.ok.slice(0, MAX_ROWS);
  const dupes = result.ok.filter((r) => isImported(r.hash)).length;
  const importable = result.ok.length - dupes;

  return (
    <div className="stack">
      <label className="field">
        Default jar for imported rows
        <select value={defaultJarId} onChange={(e) => onDefaultJar(e.target.value)}>
          {jars.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
      </label>

      <p className="muted" style={{ fontSize: 'var(--step-caption)' }}>
        {importable} to import
        {dupes > 0 && ` · ${dupes} already imported this session`}
        {result.skippedIncome > 0 && ` · ${result.skippedIncome} look like income, skipped`}
        {result.bad.length > 0 && ` · ${result.bad.length} unreadable`}
      </p>

      {shown.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.grid}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Jar</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const dupe = isImported(r.hash);
                return (
                  <tr key={r.index} className={dupe ? styles.dupe : undefined}>
                    <td>{r.dateISO}</td>
                    <td>{r.note || <span className="muted">—</span>}</td>
                    <td className="num">
                      −{formatMoney(r.amountMinor, currency, locale)}
                    </td>
                    <td>
                      {dupe ? (
                        <span className="muted">already imported</span>
                      ) : (
                        <select
                          aria-label={`Jar for row ${r.index}`}
                          value={perRowJar[r.index] ?? defaultJarId}
                          onChange={(e) => onRowJar(r.index, e.target.value)}
                        >
                          {jars.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {result.ok.length > MAX_ROWS && (
        <p className="muted" style={{ fontSize: 'var(--step-caption)' }}>
          …and {result.ok.length - MAX_ROWS} more rows (all will be imported).
        </p>
      )}

      {result.bad.length > 0 && (
        <div className="field">
          Skipped — couldn’t read
          <div className={styles.bad}>
            {result.bad.slice(0, 20).map((b) => (
              <span key={b.index}>
                Row {b.index}: {b.reason}
              </span>
            ))}
            {result.bad.length > 20 && <span>…and {result.bad.length - 20} more.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
