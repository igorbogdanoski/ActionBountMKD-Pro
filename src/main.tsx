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
