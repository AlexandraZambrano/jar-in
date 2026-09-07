import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePreferences,
  setPreferences,
  toggleA11y,
  type ThemePref,
} from '@/lib/preferences';
import { Sticker } from '@/components/Sticker';
import { isStandalone } from '@/lib/pwa';
import { requestPersistence, type StorageStatus } from '@/lib/storagePersistence';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function formatBytes(n?: number): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function SettingsPage() {
  const prefs = usePreferences();
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  useEffect(() => {
    void requestPersistence().then(setStorage);
  }, []);

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      <Sticker gloss tiltSeed={1} style={{ padding: 16 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>
            Appearance
          </legend>
          <div className="stack" style={{ gap: 8 }}>
            {THEMES.map((t) => (
              <label key={t.value} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="radio"
                  name="theme"
                  checked={prefs.theme === t.value}
                  onChange={() => setPreferences({ theme: t.value })}
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>
      </Sticker>

      <Sticker gloss tiltSeed={3} style={{ padding: 16 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>
            Accessibility
          </legend>
          <div className="stack" style={{ gap: 10 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={prefs.a11y.includes('calm')}
                onChange={(e) => toggleA11y('calm', e.target.checked)}
              />
              <span>
                <strong>Calm mode</strong>
                <br />
                <span className="muted">
                  No tilt or gloss, flatter contrast, larger text, no motion.
                </span>
              </span>
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                checked={prefs.a11y.includes('cvd')}
                onChange={(e) => toggleA11y('cvd', e.target.checked)}
              />
              <span>
                <strong>Colour-blind safe</strong>
                <br />
                <span className="muted">
                  Okabe–Ito jar colours plus a pattern on every jar.
                </span>
              </span>
            </label>
          </div>
        </fieldset>
      </Sticker>

      <Sticker gloss tiltSeed={2} style={{ padding: 16 }}>
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">This device</span>
          <span className="muted" style={{ fontSize: 'var(--step-caption)' }}>
            {isStandalone() ? 'Installed as an app.' : 'Running in the browser.'}{' '}
            Your data lives on this device
            {storage
              ? storage.persisted
                ? ' and is marked persistent.'
                : ' (best-effort — install to the home screen to protect it).'
              : '.'}
          </span>
          {storage?.usageBytes != null && (
            <span className="muted" style={{ fontSize: 'var(--step-caption)' }}>
              Using {formatBytes(storage.usageBytes)} of {formatBytes(storage.quotaBytes)}.
            </span>
          )}
        </div>
      </Sticker>

      <Sticker tiltSeed={4} style={{ padding: 16 }}>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="eyebrow" style={{ marginBottom: 8 }}>
            Manage
          </legend>
          <div className="stack" style={{ gap: 10 }}>
            <Link to="/jars" className="link-btn">
              Jars
            </Link>
            <Link to="/wallets" className="link-btn">
              Wallets
            </Link>
            <Link to="/income" className="link-btn">
              Income sources
            </Link>
            <Link to="/transactions" className="link-btn">
              All transactions
            </Link>
          </div>
        </fieldset>
      </Sticker>
    </div>
  );
}
