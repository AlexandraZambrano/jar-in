import { Link } from 'react-router-dom';
import {
  usePreferences,
  setPreferences,
  toggleA11y,
  type ThemePref,
} from '@/lib/preferences';
import { Sticker } from '@/components/Sticker';

const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'Match device' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const prefs = usePreferences();

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

      <Sticker tiltSeed={2} style={{ padding: 16 }}>
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
