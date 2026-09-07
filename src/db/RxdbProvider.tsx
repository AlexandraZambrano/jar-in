import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { requestPersistence } from '@/lib/storagePersistence';
import { getDatabase, type JarInDatabase } from './database';

const DbContext = createContext<JarInDatabase | null>(null);

// eslint-disable-next-line react-refresh/only-export-components -- hook + provider co-located by design
export function useDb(): JarInDatabase {
  const db = useContext(DbContext);
  if (!db) throw new Error('useDb() used outside <RxdbProvider>');
  return db;
}

export function RxdbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<JarInDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    void requestPersistence().then((s) => {
      if (import.meta.env.DEV) {
        console.info('[storage] persisted:', s.persisted, 'supported:', s.supported);
      }
    });
    getDatabase()
      .then((database) => {
        if (active) setDb(database);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div role="alert" style={{ padding: 24, fontFamily: 'var(--font-text)' }}>
        <h1>Couldn’t open your data</h1>
        <p style={{ color: 'var(--ink-soft)' }}>{error.message}</p>
        <p style={{ color: 'var(--ink-soft)' }}>
          This can happen in a private window or when the browser blocks storage.
        </p>
      </div>
    );
  }

  if (!db) {
    return (
      <div
        aria-busy="true"
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--font-display)',
          color: 'var(--ink-soft)',
        }}
      >
        Opening your jars…
      </div>
    );
  }

  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}
