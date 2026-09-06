import { Link } from 'react-router-dom';
import { useDb } from '@/db/RxdbProvider';
import { useRxQuery } from '@/lib/useRxQuery';
import type { Wallet } from '@/db/schemas';
import { Sticker } from '@/components/Sticker';
import { Icon } from '@/components/icons';

export function WalletsPage() {
  const db = useDb();
  const { data: wallets } = useRxQuery<Wallet>(() => db.wallets.find(), [db]);

  return (
    <div className="screen">
      <h1 className="screen-title">Wallets</h1>
      <p className="muted">Where money actually sits. Income lands in a wallet.</p>

      <div className="stack">
        {wallets.map((w, i) => (
          <Sticker key={w.id} gloss tiltSeed={i + 1} style={{ padding: 0 }}>
            <Link
              to={`/wallets/${w.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '13px 14px',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 'var(--step-title)',
                  flexGrow: 1,
                }}
              >
                {w.name}
              </span>
              <span className="muted" style={{ fontWeight: 700 }}>
                {w.currency}
              </span>
              <Icon name="chevron" size={18} />
            </Link>
          </Sticker>
        ))}
      </div>

      <Link className="btn" to="/wallets/new" style={{ textAlign: 'center' }}>
        New wallet
      </Link>
    </div>
  );
}
