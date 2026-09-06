import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import type { Jar, SubCategory, Transaction } from '@/db/schemas';
import { Keypad } from '@/components/Keypad';
import { currencyDecimals, fromMinor, parseAmountInput, toMinor } from '@/lib/money';
import { todayISO } from '@/lib/date';
import { JarSelect } from './JarSelect';
import {
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from './transactionsRepo';
import styles from './TransactionFormPage.module.css';

export function TransactionFormPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id;

  const { data: jarsRaw } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const jars = useMemo(() => [...jarsRaw].sort((a, b) => a.order - b.order), [jarsRaw]);
  const { data: subs } = useRxQuery<SubCategory>(() => db.subCategories.find(), [db]);
  const { data: txns } = useRxQuery<Transaction>(() => db.transactions.find(), [db]);
  const existing = useMemo(() => txns.find((t) => t.id === id), [txns, id]);

  const [amount, setAmount] = useState('');
  const [jarId, setJarId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [subCategoryId, setSubCategoryId] = useState<string>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (jars.length && !jarId) setJarId(jars[0].id);
  }, [jars, jarId]);

  useEffect(() => {
    if (!existing) return;
    setAmount(String(fromMinor(existing.amountMinor, existing.currency)));
    setJarId(existing.jarId);
    setDate(existing.date.slice(0, 10));
    setSubCategoryId(existing.subCategoryId ?? '');
    setNote(existing.note);
  }, [existing]);

  const jar = jars.find((j) => j.id === jarId);
  const currency = jar?.currency ?? jars[0]?.currency ?? 'EUR';
  const decimals = currencyDecimals(currency);
  const jarSubs = subs
    .filter((s) => s.jarId === jarId)
    .sort((a, b) => a.order - b.order);

  async function save() {
    const parsed = parseAmountInput(amount);
    if (parsed == null || parsed <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!jarId) {
      setError('Pick a jar.');
      return;
    }
    const input = {
      jarId,
      subCategoryId: subCategoryId || null,
      amountMinor: toMinor(parsed, currency),
      currency,
      date,
      note,
    };
    if (isNew) await addTransaction(db, input);
    else await updateTransaction(db, id!, input);
    navigate(isNew ? '/' : '/transactions');
  }

  async function onDelete() {
    if (!id) return;
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(db, id);
    navigate('/transactions');
  }

  if (!jars.length) {
    return (
      <div className="screen">
        <h1 className="screen-title">Add a transaction</h1>
        <p className="muted">
          Create a <a href="/jars/new">jar</a> first.
        </p>
      </div>
    );
  }

  const displayAmount = amount === '' ? '0' : amount;

  return (
    <div className="screen">
      <h1 className="screen-title">{isNew ? 'Add a transaction' : 'Edit transaction'}</h1>

      <div
        className={styles.amount}
        aria-live="polite"
        aria-label={`Amount ${displayAmount} ${currency}`}
      >
        <span className="cur">{currency}</span>
        <span className={amount === '' ? styles.zero : undefined}>{displayAmount}</span>
      </div>

      <div className="field">
        Jar
        <JarSelect jars={jars} value={jarId} onChange={setJarId} />
      </div>

      <Keypad value={amount} onChange={setAmount} decimals={decimals} />

      <label className="field">
        Date
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>

      {jarSubs.length > 0 && (
        <label className="field">
          Sub-category (optional)
          <select
            value={subCategoryId}
            onChange={(e) => setSubCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {jarSubs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        Note (optional)
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. groceries"
        />
      </label>

      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}

      <button className="btn" type="button" onClick={save}>
        {isNew ? 'Save transaction' : 'Save changes'}
      </button>
      {!isNew && (
        <button className="btn btn--ghost" type="button" onClick={onDelete}>
          Delete
        </button>
      )}
    </div>
  );
}
