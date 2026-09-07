import { useEffect, useState } from 'react';
import {
  dismissInstall,
  installDismissed,
  isIos,
  isStandalone,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa';
import styles from './InstallPrompt.module.css';

type Mode = 'none' | 'chromium' | 'ios';

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>('none');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || installDismissed()) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('chromium');
    };
    const onInstalled = () => {
      dismissInstall();
      setMode('none');
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari never fires beforeinstallprompt — offer manual instructions.
    let iosTimer: number | undefined;
    if (isIos()) {
      iosTimer = window.setTimeout(() => {
        setMode((m) => (m === 'none' ? 'ios' : m));
      }, 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  function close() {
    dismissInstall();
    setMode('none');
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    close();
  }

  if (mode === 'none') return null;

  return (
    <aside className={styles.card} aria-label="Install Jars">
      <span className={styles.title}>Add Jars to your home screen</span>
      {mode === 'chromium' ? (
        <>
          <span className={styles.body}>
            It opens like an app, works offline, and keeps your data on this device.
          </span>
          <div className={styles.actions}>
            <button type="button" className={styles.btn} onClick={install}>
              Add
            </button>
            <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={close}>
              Not now
            </button>
          </div>
        </>
      ) : (
        <>
          <span className={styles.body}>
            In Safari, tap the Share button, then <strong>Add to Home Screen</strong>.
            Installed, your data is safe from Safari&rsquo;s 7-day cleanup of unused
            sites.
          </span>
          <div className={styles.actions}>
            <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={close}>
              Got it
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
