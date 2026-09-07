import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import type { IncomeFrequency, IncomeSource, Wallet } from '@/db/schemas';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { ConfirmButton } from '@/components/ConfirmButton';
import { fromMinor, parseAmountInput, toMinor } from '@/lib/money';
import { defaultCurrencyForLocale } from '@/lib/currencies';
import { APP_LOCALE, deviceLocale } from '@/lib/locale';
import { createIncome, deleteIncome, updateIncome } from './incomeRepo';

const FREQUENCIES: { value: IncomeFrequency; label: string }[] = [
  { value: 'monthly', label: 'Every month' },
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'yearly', label: 'Every year' },
  { value: 'once', label: 'One-off (not counted monthly)' },
];

export function IncomeEditPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const locale = APP_LOCALE;

  const { data: income } = useRxQuery<IncomeSource>(() => db.incomeSources.find(), [db]);
  const { data: wallets } = useRxQuery<Wallet>(() => db.wallets.find(), [db]);
  const existing = useMemo(() => income.find((s) => s.id === id), [income, id]);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrencyForLocale(deviceLocale()));
  const [frequency, setFrequency] = useState<IncomeFrequency>('monthly');
  const [walletId, setWalletId] = useState('');
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (wallets.length && !walletId) setWalletId(wallets[0].id);
  }, [wallets, walletId]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAmount(String(fromMinor(existing.amountMinor, existing.currency)));
    setCurrency(existing.currency);
    setFrequency(existing.frequency);
    setWalletId(existing.destinationWalletId);
    setActive(existing.active);
  }, [existing]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name it.';
    const a = parseAmountInput(amount);
    if (a == null || a <= 0) e.amount = 'Enter an amount greater than 0.';
    if (!walletId) e.wallet = 'Pick a destination wallet.';
    return e;
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const input = {
      name,
      amountMinor: toMinor(parseAmountInput(amount) ?? 0, currency),
      currency,
      frequency,
      destinationWalletId: walletId,
      active,
    };
    if (isNew) await createIncome(db, input);
    else await updateIncome(db, id!, input);
    navigate('/income');
  }

  async function onDelete() {
    if (!id || isNew) return;
    await deleteIncome(db, id);
    navigate('/income');
  }

  if (!wallets.length) {
    return (
      <div className="screen">
        <h1 className="screen-title">{isNew ? 'New income source' : 'Edit income'}</h1>
        <p className="muted">
          Add a <a href="/wallets/new">wallet</a> first — income needs somewhere to land.
        </p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{isNew ? 'New income source' : 'Edit income'}</h1>

      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          {errors.name && <span className="error">{errors.name}</span>}
        </label>

        <label className="field">
          Amount
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="2400"
          />
          {errors.amount && <span className="error">{errors.amount}</span>}
        </label>

        <CurrencyPicker value={currency} onChange={setCurrency} locale={locale} />

        <label className="field">
          Frequency
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as IncomeFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Destination wallet
          <select value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.currency})
              </option>
            ))}
          </select>
          {errors.wallet && <span className="error">{errors.wallet}</span>}
        </label>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active (counts toward jar funding)
        </label>

        <button className="btn" type="submit">
          {isNew ? 'Create income source' : 'Save changes'}
        </button>
        {!isNew && <ConfirmButton onConfirm={onDelete} />}
      </form>
    </div>
  );
}
