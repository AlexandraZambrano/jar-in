import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { APP_LOCALE } from '@/lib/locale';
import { useRxQuery } from '@/lib/useRxQuery';
import type { Wallet } from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { Icon } from '@/components/icons';
import { formatMoney } from '@/lib/money';
import { fxNote } from '@/features/dashboard/compute';
import { setIncomeActive } from './incomeRepo';
import { useMonthlyIncome } from './useMonthlyIncome';

const FREQ_LABEL: Record<string, string> = {
  monthly: '/ month',
  weekly: '/ week',
  biweekly: '/ 2 weeks',
  yearly: '/ year',
  once: 'one-off',
};

export function IncomePage() {
  const db = useDb();
  const locale = APP_LOCALE;
  const { inc, home, income } = useMonthlyIncome();
  const { data: wallets } = useRxQuery<Wallet>(() => db.wallets.find(), [db]);
  const walletName = (wid: string) => wallets.find((w) => w.id === wid)?.name ?? '—';

  const note = fxNote(inc);

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Income</h1>
        <span className="chip chip--ok">
          {formatMoney(inc.minor, home, locale)} / mo
        </span>
      </header>
      <p className="muted">
        Every jar is funded from the sum of your active recurring income.
      </p>
      {note && <p className="muted">{note}</p>}

      <div className="stack">
        {income.map((s, i) => (
          <Sticker key={s.id} gloss tiltSeed={i + 1} style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link
                to={`/income/${s.id}`}
                style={{
                  flexGrow: 1,
                  minWidth: 0,
                  color: 'inherit',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 'var(--step-title)',
                  }}
                >
                  {s.name}
                </span>
                <span className="muted" style={{ fontSize: 'var(--step-caption)' }}>
                  {formatMoney(s.amountMinor, s.currency, locale)} {FREQ_LABEL[s.frequency]}{' '}
                  · {walletName(s.destinationWalletId)}
                </span>
              </Link>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                title={s.active ? 'Active' : 'Paused'}
              >
                <span className="visually-hidden">Active</span>
                <input
                  type="checkbox"
                  checked={s.active}
                  onChange={(e) => setIncomeActive(db, s.id, e.target.checked)}
                />
              </label>
              <Icon name="chevron" size={18} />
            </div>
          </Sticker>
        ))}
      </div>

      {inc.hasOnce && (
        <p className="muted" style={{ fontSize: 'var(--step-caption)' }}>
          One-off income isn’t counted in the monthly figure above.
        </p>
      )}

      <Link className="btn" to="/income/new" style={{ textAlign: 'center' }}>
        New income source
      </Link>
    </div>
  );
}
