/** User appearance + accessibility preferences.
 *  Persisted to localStorage, mirrored onto <html data-theme data-a11y>.
 *  See docs/decisions/0003-design-system-implementation.md. */

import { useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type A11yFlag = 'calm' | 'cvd' | 'patterns' | 'motion-ok';

const A11Y_FLAGS: readonly A11yFlag[] = ['calm', 'cvd', 'patterns', 'motion-ok'];

export interface Preferences {
  theme: ThemePref;
  a11y: A11yFlag[];
}

const KEY = 'jarin.preferences';
const DEFAULTS: Preferences = { theme: 'system', a11y: [] };

const listeners = new Set<() => void>();
let current: Preferences = load();

function load(): Preferences {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme: parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system',
      a11y: Array.isArray(parsed.a11y)
        ? parsed.a11y.filter((f): f is A11yFlag => (A11Y_FLAGS as string[]).includes(f))
        : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function apply(p: Preferences): void {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.a11y = p.a11y.join(' ');
}

export function getPreferences(): Preferences {
  return current;
}

export function setPreferences(patch: Partial<Preferences>): void {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage blocked — session-only is acceptable */
  }
  apply(current);
  listeners.forEach((l) => l());
}

export function toggleA11y(flag: A11yFlag, on: boolean): void {
  const set = new Set(current.a11y);
  if (on) set.add(flag);
  else set.delete(flag);
  setPreferences({ a11y: [...set] });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React binding. */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences, getPreferences);
}
