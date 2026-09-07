import { useMemo, useState, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { APP_LOCALE } from '@/lib/locale';
import { useRxQuery } from '@/lib/useRxQuery';
import type { Jar } from '@/db/schemas';
import {
  extractRows,
  guessMapping,
  parseCsv,
  sniffDelimiter,
  type AmountSign,
  type CsvMapping,
  type DateOrder,
} from './csvParse';
import { isImported, markImported } from './importDedupe';
import { importCsvTransactions } from './transactionsRepo';
import { ColumnMap } from './ColumnMap';
import { ImportPreview } from './ImportPreview';
import styles from './ImportCsv.module.css';

type Step = 'pick' | 'map' | 'preview' | 'done';

function guessDateOrder(rows: string[][], dateCol: number): DateOrder {
  for (const r of rows.slice(0, 40)) {
    const v = (r[dateCol] ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'ymd';
    const p = v.split(/[/.\-\s]+/).filter(Boolean);
    if (p.length >= 2) {
      if (Number(p[0]) > 12) return 'dmy';
      if (Number(p[1]) > 12) return 'mdy';
    }
  }
  return 'dmy';
}

export function ImportCsvPage() {
  const db = useDb();
  const navigate = useNavigate();
  const locale = APP_LOCALE;

  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const jars = useMemo(() => [...jarsRaw].sort((a, b) => a.order - b.order), [jarsRaw]);

  const [step, setStep] = useState<Step>('pick');
  const [fileName, setFileName] = useState('');
  const [rawText, setRawText] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [mapping, setMapping] = useState<CsvMapping>({ date: 0, amount: 1, note: null });
  const [amountSign, setAmountSign] = useState<AmountSign>('expense-negative');
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [currency, setCurrency] = useState('EUR');
  const [defaultJarId, setDefaultJarId] = useState('');
  const [perRowJar, setPerRowJar] = useState<Record<number, string>>({});
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');

  const parsed = useMemo(
    () => (rawText ? parseCsv(rawText, delimiter) : null),
    [rawText, delimiter],
  );
  const result = useMemo(
    () =>
      parsed && parsed.headers.length
        ? extractRows(parsed.rows, mapping, { amountSign, dateOrder, currency })
        : null,
    [parsed, mapping, amountSign, dateOrder, currency],
  );

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const d = sniffDelimiter(text);
      const p = parseCsv(text, d);
      if (!p.headers.length || !p.rows.length) {
        setError('That file has no rows I can read.');
        return;
      }
      const m = guessMapping(p.headers);
      setError('');
      setFileName(file.name);
      setRawText(text);
      setDelimiter(d);
      setMapping(m);
      setDateOrder(guessDateOrder(p.rows, m.date));
      setCurrency(jars[0]?.currency ?? 'EUR');
      setDefaultJarId(jars[0]?.id ?? '');
      setStep('map');
    };
    reader.onerror = () => setError('Could not read the file.');
    reader.readAsText(file);
  }

  async function doImport() {
    if (!result) return;
    const rows = result.ok
      .filter((r) => !isImported(r.hash))
      .map((r) => ({
        jarId: perRowJar[r.index] ?? defaultJarId,
        subCategoryId: null,
        amountMinor: r.amountMinor,
        currency,
        date: r.dateISO,
        note: r.note,
      }));
    const n = await importCsvTransactions(db, rows);
    markImported(result.ok.filter((r) => !isImported(r.hash)).map((r) => r.hash));
    setImportedCount(n);
    setStep('done');
  }

  function reset() {
    setStep('pick');
    setFileName('');
    setRawText('');
    setPerRowJar({});
    setImportedCount(0);
    setError('');
  }

  if (!jars.length) {
    return (
      <div className="screen">
        <h1 className="screen-title">Import CSV</h1>
        <p className="muted">
          Create a <Link to="/jars/new">jar</Link> first — imported rows need somewhere
          to go.
        </p>
      </div>
    );
  }

  const importableCount =
    result?.ok.filter((r) => !isImported(r.hash)).length ?? 0;

  return (
    <div className="screen">
      <div className="screen-head">
        <h1 className="screen-title">Import CSV</h1>
        <Link className="link-btn" to="/transactions">
          Transactions
        </Link>
      </div>

      <div className={styles.steps}>
        <span className={step === 'pick' ? styles.on : undefined}>1 File</span>
        <span>›</span>
        <span className={step === 'map' ? styles.on : undefined}>2 Columns</span>
        <span>›</span>
        <span className={step === 'preview' || step === 'done' ? styles.on : undefined}>
          3 Preview
        </span>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {step === 'pick' && (
        <div className={styles.drop}>
          <p style={{ margin: 0 }}>Choose a .csv exported from your bank or another app.</p>
          <p className="muted" style={{ fontSize: 'var(--step-caption)' }}>
            It’s parsed on your device — nothing is uploaded.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
        </div>
      )}

      {step === 'map' && parsed && (
        <>
          <p className="muted" style={{ fontSize: 'var(--step-caption)' }}>
            {fileName} · {parsed.rows.length} rows
          </p>
          <ColumnMap
            headers={parsed.headers}
            sampleRows={parsed.rows.slice(0, 3)}
            mapping={mapping}
            onMapping={setMapping}
            delimiter={delimiter}
            onDelimiter={setDelimiter}
            amountSign={amountSign}
            onAmountSign={setAmountSign}
            dateOrder={dateOrder}
            onDateOrder={setDateOrder}
          />
          <button className="btn" type="button" onClick={() => setStep('preview')}>
            Preview
          </button>
          <button className="btn btn--ghost" type="button" onClick={reset}>
            Choose a different file
          </button>
        </>
      )}

      {step === 'preview' && result && (
        <>
          <ImportPreview
            result={result}
            jars={jars}
            currency={currency}
            locale={locale}
            defaultJarId={defaultJarId}
            onDefaultJar={setDefaultJarId}
            perRowJar={perRowJar}
            onRowJar={(idx, jarId) => setPerRowJar((p) => ({ ...p, [idx]: jarId }))}
          />
          <button
            className="btn"
            type="button"
            disabled={importableCount === 0}
            onClick={doImport}
          >
            Import {importableCount} transaction{importableCount === 1 ? '' : 's'}
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setStep('map')}>
            Back to columns
          </button>
        </>
      )}

      {step === 'done' && (
        <>
          <p>
            Imported <strong>{importedCount}</strong> transaction
            {importedCount === 1 ? '' : 's'}.
          </p>
          <button className="btn" type="button" onClick={() => navigate('/transactions')}>
            See transactions
          </button>
          <button className="btn btn--ghost" type="button" onClick={reset}>
            Import another file
          </button>
        </>
      )}
    </div>
  );
}
