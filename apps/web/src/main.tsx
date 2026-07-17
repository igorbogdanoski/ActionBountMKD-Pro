import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './utils/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initAnalytics } from './utils/analytics';
import { initErrorReporting } from './utils/errorReporting';
import { readOutdoorPref, OUTDOOR_CLASS } from './utils/displayPrefs';
import './i18n'; // initialise i18next before render

initAnalytics().catch(() => {});
initErrorReporting().catch(() => {});

// Apply the per-device outdoor (high-contrast) preference before first paint.
if (readOutdoorPref(window.localStorage)) {
  document.documentElement.classList.add(OUTDOOR_CLASS);
}

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
    // Sync any queued offline results when the app comes back online
    window.addEventListener('online', () => {
      import('./utils/offlineSync').then(({ syncOfflineQueue }) => {
        syncOfflineQueue().catch(() => {});
      });
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
