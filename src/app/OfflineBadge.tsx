import { useEffect, useState } from 'react';
import styles from './OfflineBadge.module.css';

export function OfflineBadge() {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  );

  useEffect(() => {
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className={styles.bar} role="status">
      <span className={styles.dot} aria-hidden="true" />
      Offline — changes are saved on this device
    </div>
  );
}
