import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/themes.css';
import './styles/base.css';
import './styles/screen.css';
import { apply, getPreferences } from './lib/preferences';
import { App } from './app/App';

// Reflect stored preferences onto <html> (the inline script in index.html does
// this first for no-flash; this keeps it correct after hydration).
apply(getPreferences());

const el = document.getElementById('root');
if (!el) throw new Error('#root not found');

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
