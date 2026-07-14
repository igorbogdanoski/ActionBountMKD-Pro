const CONSENT_KEY = 'avk_analytics_consent';

export type AnalyticsEventName =
  | 'quest_start'
  | 'stage_complete'
  | 'quest_finish'
  | 'signup'
  | 'upgrade_click'
  // Activation/retention funnel additions (Phase 3 SEO/growth audit) — the
  // original 5 events could tell you a quest was played, never whether a
  // new teacher actually got from signup to a real, published quest, used a
  // template, used AI, or completed (not just clicked) an upgrade.
  | 'quest_created'
  | 'quest_published'
  | 'template_used'
  | 'ai_generation_used'
  | 'payment_completed';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export interface AnalyticsAdapter {
  capture: (eventName: AnalyticsEventName, properties?: Record<string, string | number | boolean>) => void;
  identify?: (distinctId: string, properties?: Record<string, string | number | boolean>) => void;
  reset?: () => void;
}

let analyticsAdapter: AnalyticsAdapter | null = null;

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(CONSENT_KEY) === 'granted';
}

export function setAnalyticsConsent(granted: boolean): void {
  if (typeof window === 'undefined') return;
  if (granted) {
    window.localStorage.setItem(CONSENT_KEY, 'granted');
    return;
  }

  window.localStorage.removeItem(CONSENT_KEY);
}

export function isAnalyticsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_POSTHOG_KEY);
}

export function canTrackAnalytics(): boolean {
  return hasAnalyticsConsent() && (Boolean(analyticsAdapter) || isAnalyticsConfigured());
}

export function sanitizeAnalyticsProperties(properties?: AnalyticsProperties): Record<string, string | number | boolean> {
  if (!properties) return {};

  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, string | number | boolean] => {
      const [, value] = entry;
      return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
    }),
  );
}

export function setAnalyticsAdapter(adapter: AnalyticsAdapter | null): void {
  analyticsAdapter = adapter;
}

export function identifyAnalyticsUser(distinctId: string, properties?: AnalyticsProperties): void {
  if (!canTrackAnalytics() || !analyticsAdapter?.identify) return;
  analyticsAdapter.identify(distinctId, sanitizeAnalyticsProperties(properties));
}

export function trackEvent(eventName: AnalyticsEventName, properties?: AnalyticsProperties): void {
  if (!canTrackAnalytics() || !analyticsAdapter) return;
  analyticsAdapter.capture(eventName, sanitizeAnalyticsProperties(properties));
}

export function resetAnalytics(): void {
  analyticsAdapter?.reset?.();
}

export async function initAnalytics(): Promise<void> {
  if (!isAnalyticsConfigured() || typeof window === 'undefined') return;

  const module = await import('posthog-js');
  const posthog = module.default;

  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
    autocapture: false,
    persistence: hasAnalyticsConsent() ? 'localStorage+cookie' : 'memory',
    disable_session_recording: true,
    loaded(instance) {
      if (!hasAnalyticsConsent()) {
        instance.opt_out_capturing();
      }
    },
  });

  setAnalyticsAdapter({
    capture(eventName, properties) {
      posthog.capture(eventName, properties);
    },
    identify(distinctId, properties) {
      posthog.identify(distinctId, properties);
    },
    reset() {
      posthog.reset();
    },
  });

  if (hasAnalyticsConsent()) {
    posthog.opt_in_capturing();
  }
}

export async function syncAnalyticsConsent(): Promise<void> {
  if (!isAnalyticsConfigured()) return;
  const module = await import('posthog-js');
  const posthog = module.default;
  if (hasAnalyticsConsent()) {
    posthog.set_config({ persistence: 'localStorage+cookie' });
    posthog.opt_in_capturing();
    return;
  }

  posthog.set_config({ persistence: 'memory' });
  posthog.opt_out_capturing();
}
