import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureError,
  setErrorReportingAdapter,
  shouldInitErrorReporting,
} from '../utils/errorReporting';

afterEach(() => setErrorReportingAdapter(null));

describe('shouldInitErrorReporting', () => {
  it('is false for empty, whitespace, null and undefined DSNs', () => {
    expect(shouldInitErrorReporting(undefined)).toBe(false);
    expect(shouldInitErrorReporting(null)).toBe(false);
    expect(shouldInitErrorReporting('')).toBe(false);
    expect(shouldInitErrorReporting('   ')).toBe(false);
  });

  it('is true for a non-empty DSN', () => {
    expect(shouldInitErrorReporting('https://abc@o0.ingest.sentry.io/1')).toBe(true);
  });
});

describe('captureError', () => {
  it('is a no-op when no adapter is configured', () => {
    expect(() => captureError(new Error('x'))).not.toThrow();
  });

  it('forwards the error and context to the adapter', () => {
    const captureException = vi.fn();
    setErrorReportingAdapter({ captureException });
    const err = new Error('boom');
    captureError(err, { stage: 's1' });
    expect(captureException).toHaveBeenCalledWith(err, { stage: 's1' });
  });

  it('swallows adapter failures so reporting never crashes the app', () => {
    setErrorReportingAdapter({
      captureException: () => {
        throw new Error('adapter down');
      },
    });
    expect(() => captureError(new Error('boom'))).not.toThrow();
  });
});
