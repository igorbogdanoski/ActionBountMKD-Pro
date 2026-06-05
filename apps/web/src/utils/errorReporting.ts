/**
 * Error reporting (Phase 7H) — env-gated, no-op without configuration.
 *
 * Mirrors the analytics adapter pattern: the app calls captureError() freely,
 * but nothing is sent until initErrorReporting() wires up an adapter. The adapter
 * is loaded lazily and only when VITE_SENTRY_DSN is set, so neither @sentry/react
 * nor any network call ships for self-hosters who leave the DSN empty.
 */
export interface ErrorReportingAdapter {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
}

let reportingAdapter: ErrorReportingAdapter | null = null;

/**
 * Pure predicate: a non-empty DSN string enables error reporting. Kept separate
 * from import.meta so it stays unit-testable without env stubbing.
 */
export function shouldInitErrorReporting(dsn?: string | null): boolean {
  return typeof dsn === 'string' && dsn.trim().length > 0;
}

export function isErrorReportingConfigured(): boolean {
  return shouldInitErrorReporting(import.meta.env.VITE_SENTRY_DSN as string | undefined);
}

export function setErrorReportingAdapter(adapter: ErrorReportingAdapter | null): void {
  reportingAdapter = adapter;
}

/** Forwards to the configured adapter if any; a silent no-op otherwise. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!reportingAdapter) return;
  try {
    reportingAdapter.captureException(error, context);
  } catch {
    /* never let reporting throw into the app */
  }
}

export async function initErrorReporting(): Promise<void> {
  if (!isErrorReportingConfigured() || typeof window === 'undefined') return;

  try {
    // Non-literal specifier so tsc doesn't require @sentry/react to be installed;
    // the import simply fails (and we stay no-op) when the package is absent.
    const specifier = '@sentry/react';
    const Sentry = (await import(/* @vite-ignore */ specifier)) as {
      init: (options: Record<string, unknown>) => void;
      captureException: (error: unknown, context?: Record<string, unknown>) => void;
    };

    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
    });

    setErrorReportingAdapter({
      captureException(error, context) {
        Sentry.captureException(error, context);
      },
    });
  } catch {
    /* @sentry/react not installed or failed to load — stay no-op */
  }
}
