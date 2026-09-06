import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import type { Wallet } from '@/db/schemas';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { defaultCurrencyForLocale } from '@/lib/currencies';
import { createWallet, deleteWallet, updateWallet } from './walletsRepo';

export function WalletEditPage() {
  const db = useDb();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';

  const { data: wallets } = useRxQuery<Wallet>(() => db.wallets.find(), [db]);
  const existing = useMemo(() => wallets.find((w) => w.id === id), [wallets, id]);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrencyForLocale(locale));
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setCurrency(existing.currency);
  }, [existing]);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!name.trim()) {
      setError('Give the wallet a name.');
      return;
    }
    if (isNew) await createWallet(db, { name, currency });
    else await updateWallet(db, id!, { name, currency });
    navigate('/wallets');
  }

  async function onDelete() {
    if (!id || isNew) return;
    try {
      await deleteWallet(db, id);
      navigate('/wallets');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete.');
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">{isNew ? 'New wallet' : 'Edit wallet'}</h1>

      <form className="stack" onSubmit={onSubmit}>
        <label className="field">
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          {error && <span className="error">{error}</span>}
        </label>

        <CurrencyPicker value={currency} onChange={setCurrency} locale={locale} />

        <button className="btn" type="submit">
          {isNew ? 'Create wallet' : 'Save changes'}
        </button>

        {!isNew && (
          <>
            <button className="btn btn--ghost" type="button" onClick={onDelete}>
              Delete wallet
            </button>
            {deleteError && (
              <span className="error" role="alert">
                {deleteError}
              </span>
            )}
          </>
        )}
      </form>
    </div>
  );
}
