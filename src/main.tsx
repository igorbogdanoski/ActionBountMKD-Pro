import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './utils/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import './i18n'; // initialise i18next before render

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <AuthProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  </StrictMode>,
);

// PWA service worker: register only in production. In dev a cache-first SW would
// serve stale modules ("Failed to fetch dynamically imported module"), so we
// actively unregister any previously-installed worker and purge its caches.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  } else {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }
}
